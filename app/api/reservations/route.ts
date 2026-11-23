import { NextResponse } from "next/server";
import { GIFTS, GIFT_IDS } from "@/lib/gifts";
import { getAll, get, reserve, release, hashToken, storageMode } from "@/lib/store";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
  return name.length ? name : null;
}

function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  const given = req.headers.get("x-admin-key");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Liste publique : qui a réservé quoi (jamais les jetons). */
export async function GET() {
  const all = await getAll(GIFTS.map((g) => g.id));
  const reservations: Record<string, { name: string }> = {};
  for (const [id, r] of Object.entries(all)) if (r) reservations[id] = { name: r.name };
  return NextResponse.json({ reservations, storage: storageMode }, { headers: noStore });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const giftId = body?.giftId;
  const name = cleanName(body?.name);
  if (typeof giftId !== "string" || !GIFT_IDS.has(giftId)) {
    return NextResponse.json({ error: "Ce cadeau n'existe pas." }, { status: 400, headers: noStore });
  }
  if (!name) {
    return NextResponse.json({ error: "Écris ton prénom." }, { status: 400, headers: noStore });
  }
  const result = await reserve(giftId, name);
  if (!result.ok) {
    const current = await get(giftId);
    return NextResponse.json(
      { error: "Déjà réservé.", by: current?.name ?? null },
      { status: 409, headers: noStore }
    );
  }
  return NextResponse.json({ ok: true, token: result.token, name }, { headers: noStore });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const giftId = body?.giftId;
  if (typeof giftId !== "string" || !GIFT_IDS.has(giftId)) {
    return NextResponse.json({ error: "Ce cadeau n'existe pas." }, { status: 400, headers: noStore });
  }
  const current = await get(giftId);
  if (!current) return NextResponse.json({ ok: true }, { headers: noStore });
  const token = typeof body?.token === "string" ? body.token : "";
  if (!isAdmin(req) && (!token || hashToken(token) !== current.tokenHash)) {
    return NextResponse.json(
      { error: "Seule la personne qui a réservé peut annuler." },
      { status: 403, headers: noStore }
    );
  }
  await release(giftId);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
