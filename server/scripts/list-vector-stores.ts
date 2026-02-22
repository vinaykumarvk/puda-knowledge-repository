import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

type VectorStoreRecord = {
  id: string;
  name: string;
  status?: string;
  usageBytes?: number;
  fileCount?: number;
};

type CliArgs = {
  docName?: string;
  kgName?: string;
  kgPath?: string;
  writeEnv: boolean;
  envFile: string;
  limit: number;
  json: boolean;
};

function printHelp() {
  console.log(`Usage: tsx server/scripts/list-vector-stores.ts [options]\n\nOptions:\n  --doc-name <name-or-id>   Resolve DOC_VECTOR_STORE_ID by vector store name or id\n  --kg-name <name-or-id>    Resolve KG_VECTOR_STORE_ID by vector store name or id\n  --kg-path <path>          Set PUDA_ACTS_REGULATIONS_KG_PATH (used with --write-env)\n  --write-env               Write resolved values into .env\n  --env-file <path>         Path to env file (default: .env)\n  --limit <n>               Max number of stores to print (default: 50)\n  --json                    Print JSON output\n  --help                    Show this help\n\nExamples:\n  npm run vectorstores:list\n  npm run vectorstores:list -- --doc-name puda --kg-name puda-kg --write-env\n  npm run vectorstores:list -- --doc-name vs_abc123 --kg-name vs_def456 --write-env --kg-path gs://your-bucket/path/to/puda_master_kg.json`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    writeEnv: false,
    envFile: ".env",
    limit: 50,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--write-env") {
      args.writeEnv = true;
      continue;
    }

    if (arg === "--json") {
      args.json = true;
      continue;
    }

    if (arg === "--doc-name") {
      args.docName = argv[++i];
      continue;
    }

    if (arg === "--kg-name") {
      args.kgName = argv[++i];
      continue;
    }

    if (arg === "--kg-path") {
      args.kgPath = argv[++i];
      continue;
    }

    if (arg === "--env-file") {
      args.envFile = argv[++i] || ".env";
      continue;
    }

    if (arg === "--limit") {
      const parsed = Number(argv[++i]);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive number");
      }
      args.limit = Math.floor(parsed);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function maskId(value: string): string {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getOpenAiClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY in environment/.env.",
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });
}

async function fetchAllVectorStores(client: OpenAI): Promise<VectorStoreRecord[]> {
  const stores: VectorStoreRecord[] = [];
  let after: string | undefined;

  do {
    const response = await client.vectorStores.list({
      limit: 100,
      after,
    } as any);

    const data = (response as any).data || [];

    for (const store of data) {
      stores.push({
        id: store.id,
        name: store.name,
        status: store.status,
        usageBytes: store.usage_bytes,
        fileCount: store.file_counts?.total,
      });
    }

    after = (response as any).has_more && data.length ? data[data.length - 1].id : undefined;
  } while (after);

  return stores;
}

function resolveStoreByNameOrId(
  stores: VectorStoreRecord[],
  query: string | undefined,
  label: string,
): VectorStoreRecord | undefined {
  if (!query) return undefined;

  const normalized = query.trim().toLowerCase();

  const byId = stores.find((store) => store.id.toLowerCase() === normalized);
  if (byId) return byId;

  const exactName = stores.find((store) => store.name.toLowerCase() === normalized);
  if (exactName) return exactName;

  const partialMatches = stores.filter((store) => store.name.toLowerCase().includes(normalized));

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  if (partialMatches.length > 1) {
    const matchList = partialMatches
      .slice(0, 5)
      .map((store) => `${store.name} (${store.id})`)
      .join(", ");

    throw new Error(
      `Ambiguous ${label} match for \"${query}\". Narrow it down. Matches: ${matchList}${
        partialMatches.length > 5 ? ", ..." : ""
      }`,
    );
  }

  throw new Error(`No vector store matched ${label} query \"${query}\".`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertEnvValue(source: string, key: string, value: string): string {
  const pattern = new RegExp(`^${escapeRegex(key)}=.*$`, "m");
  const nextLine = `${key}=${value}`;

  if (pattern.test(source)) {
    return source.replace(pattern, nextLine);
  }

  const prefix = source.endsWith("\n") || source.length === 0 ? "" : "\n";
  return `${source}${prefix}${nextLine}\n`;
}

function writeEnvValues(
  envFilePath: string,
  values: Record<string, string | undefined>,
) {
  const absolutePath = path.resolve(process.cwd(), envFilePath);
  let contents = "";

  if (fs.existsSync(absolutePath)) {
    contents = fs.readFileSync(absolutePath, "utf8");
  }

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    contents = upsertEnvValue(contents, key, value);
  }

  fs.writeFileSync(absolutePath, contents, "utf8");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const client = getOpenAiClient();

  const stores = await fetchAllVectorStores(client);
  const sorted = stores.sort((a, b) => a.name.localeCompare(b.name));

  const resolvedDoc = resolveStoreByNameOrId(sorted, args.docName, "DOC_VECTOR_STORE_ID");
  const resolvedKg = resolveStoreByNameOrId(sorted, args.kgName, "KG_VECTOR_STORE_ID");

  const docVectorStoreId = resolvedDoc?.id || process.env.DOC_VECTOR_STORE_ID;
  const kgVectorStoreId = resolvedKg?.id || process.env.KG_VECTOR_STORE_ID;

  if (args.json) {
    const payload = {
      count: sorted.length,
      stores: sorted,
      resolved: {
        docVectorStoreId,
        kgVectorStoreId,
        pudaActsRegulationsKgPath:
          args.kgPath ||
          process.env.PUDA_ACTS_REGULATIONS_KG_PATH,
      },
    };

    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Found ${sorted.length} vector stores.`);

    for (const store of sorted.slice(0, args.limit)) {
      console.log(
        `- ${store.name} (${store.id}) status=${store.status || "unknown"} files=${
          store.fileCount ?? "unknown"
        } usageBytes=${store.usageBytes ?? "unknown"}`,
      );
    }

    if (sorted.length > args.limit) {
      console.log(`... and ${sorted.length - args.limit} more (increase with --limit).`);
    }

    if (resolvedDoc) {
      console.log(`Resolved DOC_VECTOR_STORE_ID -> ${resolvedDoc.id} (${resolvedDoc.name})`);
    }

    if (resolvedKg) {
      console.log(`Resolved KG_VECTOR_STORE_ID -> ${resolvedKg.id} (${resolvedKg.name})`);
    }

    console.log("\nSuggested env values:");
    console.log(`DOC_VECTOR_STORE_ID=${docVectorStoreId || "<set-me>"}`);
    console.log(`KG_VECTOR_STORE_ID=${kgVectorStoreId || "<set-me>"}`);
    const kgPathValue =
      args.kgPath ||
      process.env.PUDA_ACTS_REGULATIONS_KG_PATH;
    if (kgPathValue) {
      console.log(
        `PUDA_ACTS_REGULATIONS_KG_PATH=${kgPathValue}`,
      );
    }
  }

  if (args.writeEnv) {
    if (!docVectorStoreId || !kgVectorStoreId) {
      throw new Error(
        "Cannot write .env without DOC_VECTOR_STORE_ID and KG_VECTOR_STORE_ID. Use --doc-name and --kg-name, or set env vars first.",
      );
    }

    writeEnvValues(args.envFile, {
      DOC_VECTOR_STORE_ID: docVectorStoreId,
      KG_VECTOR_STORE_ID: kgVectorStoreId,
      PUDA_ACTS_REGULATIONS_KG_PATH:
        args.kgPath ||
        process.env.PUDA_ACTS_REGULATIONS_KG_PATH,
    });

    if (!args.json) {
      console.log(
        `Updated ${path.resolve(process.cwd(), args.envFile)} with DOC_VECTOR_STORE_ID, KG_VECTOR_STORE_ID${
          args.kgPath ? ", and PUDA_ACTS_REGULATIONS_KG_PATH" : ""
        }.`,
      );
      console.log(`Saved DOC_VECTOR_STORE_ID=${maskId(docVectorStoreId)}`);
      console.log(`Saved KG_VECTOR_STORE_ID=${maskId(kgVectorStoreId)}`);
    }
  }
}

run().catch((error) => {
  console.error("Vector store setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
