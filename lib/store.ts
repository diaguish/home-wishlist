import { Redis } from "@upstash/redis";
import { createClient } from "redis";
import { createHash, randomBytes } from "crypto";

export type Reservation = { name: string; tokenHash: string; at: string };

/**
 * Trois modes, choisis selon les variables que Vercel a ajoutées :
 * - Upstash (REST) : KV_REST_API_URL + KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_URL/TOKEN)
 * - Redis classique : REDIS_URL (ou KV_URL), par exemple « Redis » de la marketplace Vercel
 * - mémoire : rien de configuré (démo locale uniquement, non fiable sur Vercel)
 */
const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const tcpUrl = process.env.REDIS_URL || process.env.KV_URL;

const rest = restUrl && restToken ? new Redis({ url: restUrl, token: restToken }) : null;

type Tcp = ReturnType<typeof createClient>;
const g = globalThis as unknown as { __wishlistTcp?: Promise<Tcp>; __wishlistMem?: Map<string, string> };
function tcp(): Promise<Tcp> {
  if (!g.__wishlistTcp) {
    const client = createClient({ url: tcpUrl });
    client.on("error", () => {});
    g.__wishlistTcp = client.connect().then(() => client as Tcp).catch((e) => {
      g.__wishlistTcp = undefined;
      throw e;
    });
  }
  return g.__wishlistTcp;
}
const memory = (g.__wishlistMem ??= new Map<string, string>());

export const storageMode = rest ? "redis" : tcpUrl ? "redis" : "memory";

const key = (giftId: string) => `wishlist:res:${giftId}`;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

const parse = (v: unknown): Reservation | null => {
  if (!v) return null;
  if (typeof v === "object") return v as Reservation;
  try {
    return JSON.parse(String(v)) as Reservation;
  } catch {
    return null;
  }
};

/** Primitives brutes (valeurs en texte JSON). */
async function mget(keys: string[]): Promise<unknown[]> {
  if (rest) return rest.mget(...keys);
  if (tcpUrl) return (await tcp()).mGet(keys);
  return keys.map((k) => memory.get(k) ?? null);
}
async function setNx(k: string, v: string): Promise<boolean> {
  if (rest) return (await rest.set(k, v, { nx: true })) === "OK";
  if (tcpUrl) return (await (await tcp()).set(k, v, { NX: true })) === "OK";
  if (memory.has(k)) return false;
  memory.set(k, v);
  return true;
}
async function getRaw(k: string): Promise<unknown> {
  if (rest) return rest.get(k);
  if (tcpUrl) return (await tcp()).get(k);
  return memory.get(k) ?? null;
}
async function del(k: string): Promise<void> {
  if (rest) await rest.del(k);
  else if (tcpUrl) await (await tcp()).del(k);
  else memory.delete(k);
}

export async function getAll(ids: string[]): Promise<Record<string, Reservation | null>> {
  const values = await mget(ids.map(key));
  return Object.fromEntries(ids.map((id, i) => [id, parse(values[i])]));
}

/** Réservation atomique : seule la première personne gagne. */
export async function reserve(giftId: string, name: string): Promise<{ ok: true; token: string } | { ok: false }> {
  const tok = randomBytes(18).toString("base64url");
  const value: Reservation = { name, tokenHash: hashToken(tok), at: new Date().toISOString() };
  return (await setNx(key(giftId), JSON.stringify(value))) ? { ok: true, token: tok } : { ok: false };
}

export async function get(giftId: string): Promise<Reservation | null> {
  return parse(await getRaw(key(giftId)));
}

export async function release(giftId: string): Promise<void> {
  await del(key(giftId));
}
