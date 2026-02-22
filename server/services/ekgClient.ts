import {
  ensureEmbeddedEkgEngineReady,
  getEmbeddedEkgBaseUrl,
  isEmbeddedEkgEnabled,
} from "./embeddedEkgEngine";

const PRIMARY_EKG_DOMAIN = "puda_acts_regulations";

const REQUEST_TIMEOUT_MS = parseInt(
  process.env.EKG_REQUEST_TIMEOUT_MS || "360000",
  10,
);

const DOMAIN_ALIAS_MAP: Record<string, string> = {
  pre_sales: process.env.EKG_DOMAIN_ALIAS_PRE_SALES || PRIMARY_EKG_DOMAIN,
};
const DEFAULT_EKG_DOMAIN = process.env.EKG_DEFAULT_DOMAIN || PRIMARY_EKG_DOMAIN;
const KNOWN_EKG_DOMAINS = new Set(
  (process.env.EKG_KNOWN_DOMAINS || `${PRIMARY_EKG_DOMAIN},pre_sales,apf`)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

function toDomainVectorStoreEnvKey(domainId: string): string {
  return `${domainId.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_VECTOR_STORE_ID`;
}

function normalizeDomainForEnv(domainId: string): string {
  return domainId.toLowerCase().trim();
}

function resolveDomainVectorStoreEnvKeys(domainId: string): string[] {
  const normalized = normalizeDomainForEnv(domainId);
  return [toDomainVectorStoreEnvKey(normalized)];
}

function getExternalBaseUrl(): string {
  const baseUrl = process.env.EKG_API_URL;
  if (!baseUrl) {
    throw new Error(
      "EKG_API_URL is not set and embedded mode is disabled. Set EKG_ENGINE_MODE=embedded or configure EKG_API_URL.",
    );
  }
  return baseUrl;
}

export function mapDomainForEkg(domainId: string): string {
  const normalizedInput = normalizeDomainForEnv(domainId);
  const mapped = DOMAIN_ALIAS_MAP[normalizedInput] || normalizedInput;
  if (KNOWN_EKG_DOMAINS.has(mapped)) {
    return mapped;
  }
  console.warn(
    `[EKG Domain Alias] Unknown domain "${domainId}" mapped to default "${DEFAULT_EKG_DOMAIN}"`,
  );
  return DEFAULT_EKG_DOMAIN;
}

export function resolveEkgVectorStoreId(
  domainId: string,
  preferredId?: string,
): string | undefined {
  const envOverride = resolveDomainVectorStoreEnvKeys(domainId)
    .map((key) => process.env[key])
    .find(Boolean);
  return (
    preferredId ||
    envOverride ||
    process.env.DOC_VECTOR_STORE_ID ||
    undefined
  );
}

export function getEkgBaseUrl(): string {
  if (isEmbeddedEkgEnabled()) {
    return getEmbeddedEkgBaseUrl();
  }
  return getExternalBaseUrl();
}

export async function fetchEkg(
  endpoint: string,
  init: RequestInit = {},
): Promise<Response> {
  if (isEmbeddedEkgEnabled()) {
    await ensureEmbeddedEkgEngineReady();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getEkgBaseUrl()}${endpoint}`, {
      ...init,
      headers: {
        "User-Agent": "PUDA-Knowledge-Agent/1.0",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function postEkgAnswer(payload: unknown): Promise<any> {
  const response = await fetchEkg("/v1/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EKG API error: ${response.status} - ${text}`);
  }

  return await response.json();
}
