import crypto from "crypto";
import { PostgresStateStore } from "@credverse/shared-auth";

type StatusEntry = {
  listId: string;
  index: number;
  revoked: boolean;
  credentialId: string;
  updatedAt: string;
};

const MAX_LIST_SIZE = 16384;
const credentialToStatus = new Map<string, StatusEntry>();
const listAllocations = new Map<string, number>();
type StatusListState = {
  credentialToStatus: Array<[string, StatusEntry]>;
  listAllocations: Array<[string, number]>;
};
const hasDatabase =
  typeof process.env.DATABASE_URL === "string" &&
  process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
  ? new PostgresStateStore<StatusListState>({
      databaseUrl: process.env.DATABASE_URL as string,
      serviceKey: "issuer-status-list",
    })
  : null;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function ensureHydrated(): Promise<void> {
  if (!stateStore || hydrated) return;
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const loaded = await stateStore.load();
      credentialToStatus.clear();
      listAllocations.clear();
      for (const [credentialId, entry] of loaded?.credentialToStatus || []) {
        credentialToStatus.set(credentialId, entry);
      }
      for (const [listId, allocated] of loaded?.listAllocations || []) {
        listAllocations.set(listId, allocated);
      }
      hydrated = true;
    })();
  }
  await hydrationPromise;
}

async function queuePersist(): Promise<void> {
  if (!stateStore) return;
  persistChain = persistChain
    .then(async () => {
      await stateStore.save({
        credentialToStatus: Array.from(credentialToStatus.entries()),
        listAllocations: Array.from(listAllocations.entries()),
      });
    })
    .catch((error) => {
      console.error("[StatusList] Persist failed:", error);
    });
  await persistChain;
}

export async function registerCredentialStatus(
  credentialId: string,
  requestedListId = "default",
): Promise<StatusEntry> {
  await ensureHydrated();
  const existing = credentialToStatus.get(credentialId);
  if (existing) {
    return existing;
  }

  const current = listAllocations.get(requestedListId) ?? 0;
  if (current >= MAX_LIST_SIZE) {
    throw new Error(`Status list ${requestedListId} capacity exceeded`);
  }

  const entry: StatusEntry = {
    listId: requestedListId,
    index: current,
    revoked: false,
    credentialId,
    updatedAt: new Date().toISOString(),
  };

  credentialToStatus.set(credentialId, entry);
  listAllocations.set(requestedListId, current + 1);
  await queuePersist();
  return entry;
}

export async function revokeCredentialStatus(
  credentialId: string,
): Promise<StatusEntry | null> {
  await ensureHydrated();
  const entry = credentialToStatus.get(credentialId);
  if (!entry) {
    return null;
  }

  entry.revoked = true;
  entry.updatedAt = new Date().toISOString();
  credentialToStatus.set(credentialId, entry);
  await queuePersist();
  return entry;
}

export async function getCredentialStatus(
  credentialId: string,
): Promise<StatusEntry | null> {
  await ensureHydrated();
  return credentialToStatus.get(credentialId) ?? null;
}

export async function getStatusList(listId: string): Promise<{
  id: string;
  bitstring: string;
  size: number;
  revokedCount: number;
  digest: string;
  updatedAt: string;
}> {
  await ensureHydrated();
  const size = listAllocations.get(listId) ?? 0;
  const bytes = Buffer.alloc(Math.max(1, Math.ceil(size / 8)));
  let revokedCount = 0;
  let updatedAt = new Date(0).toISOString();

  for (const entry of Array.from(credentialToStatus.values())) {
    if (entry.listId !== listId || !entry.revoked) continue;
    const byteOffset = Math.floor(entry.index / 8);
    const bitOffset = entry.index % 8;
    bytes[byteOffset] |= 1 << bitOffset;
    revokedCount += 1;
    if (entry.updatedAt > updatedAt) {
      updatedAt = entry.updatedAt;
    }
  }

  return {
    id: listId,
    bitstring: toBase64Url(bytes),
    size,
    revokedCount,
    digest: crypto.createHash("sha256").update(bytes).digest("hex"),
    updatedAt,
  };
}
