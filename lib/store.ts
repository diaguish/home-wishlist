import { Redis } from "@upstash/redis";
import { createHash, randomBytes } from "crypto";

export type Reservation = { name: string; tokenHash: string; at: string };

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

/** Sans base configurée, on garde les réservations en mémoire (démo locale uniquement). */
const memory: Map<string, Reservation> =
  ((globalThis as unknown as { __wishlistMem?: Map<string, Reservation> }).__wishlistMem ??= new Map());

export const storageMode = redis ? "redis" : "memory";

const key = (giftId: string) => `wishlist:res:${giftId}`;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function getAll(ids: string[]): Promise<Record<string, Reservation | null>> {
  if (!redis) return Object.fromEntries(ids.map((id) => [id, memory.get(id) ?? null]));
  const values = await redis.mget<(Reservation | null)[]>(...ids.map(key));
  return Object.fromEntries(ids.map((id, i) => [id, values[i] ?? null]));
}

/** Réservation atomique : seule la première personne gagne. */
export async function reserve(giftId: string, name: string): Promise<{ ok: true; token: string } | { ok: false }> {
  const tok = randomBytes(18).toString("base64url");
  const value: Reservation = { name, tokenHash: hashToken(tok), at: new Date().toISOString() };
  if (!redis) {
    if (memory.has(giftId)) return { ok: false };
    memory.set(giftId, value);
    return { ok: true, token: tok };
  }
  const res = await redis.set(key(giftId), value, { nx: true });
  return res === "OK" ? { ok: true, token: tok } : { ok: false };
}

export async function get(giftId: string): Promise<Reservation | null> {
  if (!redis) return memory.get(giftId) ?? null;
  return (await redis.get<Reservation>(key(giftId))) ?? null;
}

export async function release(giftId: string): Promise<void> {
  if (!redis) {
    memory.delete(giftId);
    return;
  }
  await redis.del(key(giftId));
}
