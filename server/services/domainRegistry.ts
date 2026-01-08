import OpenAI from "openai";
import { db } from "../db";
import { domains } from "@shared/schema";

export type DomainId = string;

export interface DomainConfig {
  id: DomainId;
  label: string;
  description: string;
  ekgDomain: DomainId;
  defaultVectorStoreId: string;
  vectorStoreName: string;
  status?: string;
  keywords: string[];
}

export const DEFAULT_DOMAIN_ID: DomainId = "wealth_management";

interface BaseDomainMetadata {
  id: DomainId;
  label: string;
  description: string;
  keywords: string[];
  fallbackVectorStoreId?: string; // Optional - only used as fallback if OpenAI sync fails
}

const BASE_DOMAIN_METADATA: Record<DomainId, BaseDomainMetadata> = {
  wealth_management: {
    id: "wealth_management",
    label: "Wealth Management",
    description:
      "Mutual funds, onboarding flows, compliance processes, and investment servicing.",
    keywords: [
      "kyc",
      "wealth",
      "portfolio",
      "redemption",
      "sip",
      "mutual fund",
      "nav",
      "investment",
      "risk profile",
      "customer onboarding",
      "compliance",
      "ops",
    ],
    // No fallback - will use dynamically registered vector stores from OpenAI
  },
  pre_sales: {
    id: "pre_sales",
    label: "Pre-Sales",
    description:
      "Sales pursuits, proposals, client presentations, pricing, and deal support activities.",
    keywords: [
      "pre-sales",
      "presales",
      "proposal",
      "rfp",
      "rfi",
      "bid",
      "deal",
      "pricing",
      "quote",
      "pursuit",
      "client pitch",
      "deck",
      "sow",
      "scope",
      "value proposition",
      "demo",
    ],
    // No fallback - will use dynamically registered vector stores from OpenAI
  },
};

let domainRegistry: Record<DomainId, DomainConfig> = buildRegistryFromBase();
let lastSyncedAt: string | null = null;
let syncInFlight: Promise<boolean> | null = null;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function buildRegistryFromBase(): Record<DomainId, DomainConfig> {
  const entries: Record<DomainId, DomainConfig> = {};
  Object.values(BASE_DOMAIN_METADATA).forEach((meta) => {
    entries[meta.id] = {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      ekgDomain: meta.id,
      defaultVectorStoreId: meta.fallbackVectorStoreId || "", // Empty if no fallback
      vectorStoreName: meta.id,
      status: "fallback",
      keywords: meta.keywords,
    };
  });
  return entries;
}

function serializeKeywords(keywords: string[]): string {
  return JSON.stringify(keywords || []);
}

function parseKeywords(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function normalizeDomainId(name: string | null | undefined): DomainId {
  if (!name) return DEFAULT_DOMAIN_ID;
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || DEFAULT_DOMAIN_ID;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
}

function deriveKeywordsFromName(name: string): string[] {
  const normalized = name.replace(/[_-]/g, " ").split(/\s+/);
  return normalized.filter(Boolean).map((word) => word.toLowerCase());
}

async function fetchAllVectorStores() {
  if (!openaiClient) return [];

  const vectorStores: Array<{
    id: string;
    name: string;
    status?: string;
  }> = [];

  let cursor: string | undefined = undefined;
  do {
    const response = await openaiClient.vectorStores.list({
      limit: 100,
      after: cursor,
    } as any);
    vectorStores.push(
      ...response.data.map((store: any) => ({
        id: store.id,
        name: store.name,
        status: store.status,
      }))
    );
    cursor =
      response.has_more && response.data.length
        ? response.data[response.data.length - 1].id
        : undefined;
  } while (cursor);

  return vectorStores;
}

function buildRegistryFromStores(stores: Awaited<
  ReturnType<typeof fetchAllVectorStores>
>): Record<DomainId, DomainConfig> {
  if (!stores.length) {
    return buildRegistryFromBase();
  }

  const nextRegistry: Record<DomainId, DomainConfig> = {};

  for (const store of stores) {
    const normalizedId = normalizeDomainId(store.name);
    const baseMeta = BASE_DOMAIN_METADATA[normalizedId];
    nextRegistry[normalizedId] = {
      id: normalizedId,
      label: baseMeta?.label ?? toTitleCase(store.name),
      description:
        baseMeta?.description ??
        `Auto-registered from OpenAI vector store "${store.name}".`,
      ekgDomain: baseMeta?.id ?? normalizedId,
      defaultVectorStoreId: store.id,
      vectorStoreName: store.name,
      status: store.status,
      keywords: baseMeta?.keywords ?? deriveKeywordsFromName(store.name),
    };
  }

  // Ensure default domain always exists even if OpenAI list omitted it
  if (!nextRegistry[DEFAULT_DOMAIN_ID] && BASE_DOMAIN_METADATA[DEFAULT_DOMAIN_ID]) {
    const meta = BASE_DOMAIN_METADATA[DEFAULT_DOMAIN_ID];
    nextRegistry[DEFAULT_DOMAIN_ID] = {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      ekgDomain: meta.id,
      defaultVectorStoreId: meta.fallbackVectorStoreId || "", // Empty if no fallback
      vectorStoreName: meta.id,
      status: "fallback",
      keywords: meta.keywords,
    };
  }

  return nextRegistry;
}

async function loadRegistryFromDb(): Promise<{
  registry: Record<DomainId, DomainConfig>;
  lastSyncedAt: string | null;
}> {
  let rows: Array<typeof domains.$inferSelect> = [];
  try {
    rows = await db.select().from(domains);
  } catch (error) {
    console.warn("Domain registry DB load failed:", error);
    return { registry: {}, lastSyncedAt: null };
  }
  if (!rows.length) {
    return { registry: {}, lastSyncedAt: null };
  }

  const registry: Record<DomainId, DomainConfig> = {};
  let latest: string | null = null;

  for (const row of rows) {
    registry[row.id] = {
      id: row.id,
      label: row.label,
      description: row.description,
      ekgDomain: row.ekgDomain,
      defaultVectorStoreId: row.defaultVectorStoreId,
      vectorStoreName: row.vectorStoreName,
      status: row.status ?? undefined,
      keywords: parseKeywords(row.keywords),
    };

    const updatedAt = row.updatedAt?.toISOString?.() ?? null;
    if (updatedAt && (!latest || updatedAt > latest)) {
      latest = updatedAt;
    }
  }

  if (!registry[DEFAULT_DOMAIN_ID] && BASE_DOMAIN_METADATA[DEFAULT_DOMAIN_ID]) {
    const meta = BASE_DOMAIN_METADATA[DEFAULT_DOMAIN_ID];
    registry[DEFAULT_DOMAIN_ID] = {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      ekgDomain: meta.id,
      defaultVectorStoreId: meta.fallbackVectorStoreId || "",
      vectorStoreName: meta.id,
      status: "fallback",
      keywords: meta.keywords,
    };
  }

  return { registry, lastSyncedAt: latest };
}

async function persistRegistryToDb(
  registry: Record<DomainId, DomainConfig>,
): Promise<void> {
  const now = new Date();
  const rows = Object.values(registry).map((domain) => ({
    id: domain.id,
    label: domain.label,
    description: domain.description,
    ekgDomain: domain.ekgDomain,
    defaultVectorStoreId: domain.defaultVectorStoreId,
    vectorStoreName: domain.vectorStoreName,
    status: domain.status || null,
    keywords: serializeKeywords(domain.keywords),
    updatedAt: now,
  }));

  if (!rows.length) {
    return;
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(domains)
        .values(row)
        .onConflictDoUpdate({
          target: domains.id,
          set: {
            label: row.label,
            description: row.description,
            ekgDomain: row.ekgDomain,
            defaultVectorStoreId: row.defaultVectorStoreId,
            vectorStoreName: row.vectorStoreName,
            status: row.status,
            keywords: row.keywords,
            updatedAt: row.updatedAt,
          },
        });
    }
  });
}

export async function initializeDomainRegistry(): Promise<void> {
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = refreshDomainRegistry();
  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export async function refreshDomainRegistry(options?: {
  force?: boolean;
}): Promise<boolean> {
  try {
    if (!options?.force) {
      const fromDb = await loadRegistryFromDb();
      if (Object.keys(fromDb.registry).length > 0) {
        domainRegistry = fromDb.registry;
        lastSyncedAt = fromDb.lastSyncedAt || new Date().toISOString();
        return true;
      }
    }

    const stores = await fetchAllVectorStores();
    domainRegistry = buildRegistryFromStores(stores);
    lastSyncedAt = new Date().toISOString();
    await persistRegistryToDb(domainRegistry);
    return true;
  } catch (error) {
    console.error("Failed to refresh domain registry:", error);
    // Preserve whatever registry we currently have; ensure at least base defaults
    if (Object.keys(domainRegistry).length === 0) {
      const fromDb = await loadRegistryFromDb().catch(() => ({
        registry: {},
        lastSyncedAt: null,
      }));
      if (Object.keys(fromDb.registry).length > 0) {
        domainRegistry = fromDb.registry;
        lastSyncedAt = fromDb.lastSyncedAt || new Date().toISOString();
      } else {
        domainRegistry = buildRegistryFromBase();
      }
    }
    if (!lastSyncedAt) {
      lastSyncedAt = new Date().toISOString();
    }
    return false;
  }
}

export function listDomains(): DomainConfig[] {
  return Object.values(domainRegistry).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

export function getDomainConfig(domainId?: string): DomainConfig {
  if (domainId && domainRegistry[domainId]) {
    return domainRegistry[domainId];
  }
  return domainRegistry[DEFAULT_DOMAIN_ID];
}

export function domainExists(domainId: string | undefined): domainId is DomainId {
  if (!domainId) return false;
  return Boolean(domainRegistry[domainId]);
}

export function getDomainSyncInfo() {
  return {
    lastSyncedAt,
    domainCount: Object.keys(domainRegistry).length,
  };
}
