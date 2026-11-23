import type { ArtKind } from "@/lib/gifts";

/** Visuels dessinés en code pour les objets sans photo produit. */
export function Art({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case "projector":
      return <Projector />;
    case "giftcard":
      return <GiftCard />;
    case "book-fourthwing":
      return (
        <Book bg="#141311" fg="#D8B46A" edge="#B8893A">
          <svg viewBox="0 0 100 150" className="book-art" aria-hidden="true">
            <circle cx="50" cy="62" r="26" fill="none" stroke="#D8B46A" strokeWidth="1.2" />
            <path d="M50 44c-8 10-22 14-30 12 8 6 16 14 18 24 3-6 8-10 12-12 4 2 9 6 12 12 2-10 10-18 18-24-8 2-22-2-30-12Z" fill="#D8B46A" opacity=".9" />
            <text x="50" y="112" textAnchor="middle" className="book-title" fill="#E7C987">FOURTH</text>
            <text x="50" y="124" textAnchor="middle" className="book-title" fill="#E7C987">WING</text>
            <text x="50" y="138" textAnchor="middle" className="book-author" fill="#B89A60">REBECCA YARROS</text>
          </svg>
        </Book>
      );
    case "book-seasons":
      return (
        <Book bg="#EFC9B4" fg="#5A3B2E" edge="#D9A88E">
          <svg viewBox="0 0 100 150" className="book-art" aria-hidden="true">
            <path d="M50 30c14 10 18 28 0 46-18-18-14-36 0-46Z" fill="#C5683F" />
            <path d="M50 34v44" stroke="#8E4426" strokeWidth="1" />
            <text x="50" y="100" textAnchor="middle" className="book-title-serif" fill="#4A2E22">Seasons</text>
            <text x="50" y="112" textAnchor="middle" className="book-sub" fill="#7A5140">la saga</text>
            <text x="50" y="138" textAnchor="middle" className="book-author" fill="#7A5140">MORGANE MONCOMBLE</text>
          </svg>
        </Book>
      );
    case "book-shatterme":
      return (
        <Book bg="#E9ECEB" fg="#1F2A33" edge="#C9CFCD">
          <svg viewBox="0 0 100 150" className="book-art" aria-hidden="true">
            <path d="M18 62c18-22 46-22 64 0-18 22-46 22-64 0Z" fill="#fff" stroke="#1F2A33" strokeWidth="1.4" />
            <circle cx="50" cy="62" r="12" fill="#3F7C8C" />
            <circle cx="50" cy="62" r="5.5" fill="#101820" />
            <circle cx="46" cy="58" r="2" fill="#fff" />
            <path d="M22 54l-4-6M34 46l-2-7M50 43v-7M66 46l2-7M78 54l4-6" stroke="#1F2A33" strokeWidth="1.2" strokeLinecap="round" />
            <text x="50" y="108" textAnchor="middle" className="book-title" fill="#1F2A33">SHATTER</text>
            <text x="50" y="120" textAnchor="middle" className="book-title" fill="#1F2A33">ME</text>
            <text x="50" y="138" textAnchor="middle" className="book-author" fill="#56636B">TAHEREH MAFI</text>
          </svg>
        </Book>
      );
  }
}

function Book({ bg, edge, children }: { bg: string; fg: string; edge: string; children: React.ReactNode }) {
  return (
    <div className="book" style={{ ["--book-bg" as string]: bg, ["--book-edge" as string]: edge }}>
      <div className="book-cover">{children}</div>
    </div>
  );
}

function Projector() {
  return (
    <svg viewBox="0 0 200 170" className="art-svg" aria-hidden="true">
      <defs>
        <linearGradient id="pj-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E3E4E0" />
        </linearGradient>
        <linearGradient id="pj-side" x1="0" x2="1">
          <stop offset="0" stopColor="#D6D8D3" />
          <stop offset="1" stopColor="#C4C6C0" />
        </linearGradient>
        <radialGradient id="pj-lens" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#5D6B7A" />
          <stop offset=".55" stopColor="#1B2129" />
          <stop offset="1" stopColor="#0A0D11" />
        </radialGradient>
      </defs>
      <path d="M40 40 Q40 26 54 26 H126 Q140 26 140 40 V132 Q140 146 126 146 H54 Q40 146 40 132 Z" fill="url(#pj-body)" />
      <path d="M140 40 Q140 26 150 30 L164 38 Q170 42 170 52 V128 Q170 140 162 144 L148 150 Q140 152 140 140 Z" fill="url(#pj-side)" />
      <circle cx="90" cy="86" r="34" fill="#EDEEEA" />
      <circle cx="90" cy="86" r="27" fill="url(#pj-lens)" />
      <circle cx="90" cy="86" r="11" fill="#0B0F14" />
      <ellipse cx="81" cy="76" rx="7" ry="4.5" fill="#fff" opacity=".35" transform="rotate(-30 81 76)" />
      <rect x="58" y="134" width="64" height="4" rx="2" fill="#D3D5CF" />
      <circle cx="124" cy="40" r="3" fill="#9BA89A" />
    </svg>
  );
}

function GiftCard() {
  return (
    <div className="giftcard">
      <div className="giftcard-ribbon" aria-hidden="true" />
      <span className="giftcard-kicker">Carte cadeau</span>
      <span className="giftcard-brand">IKEA</span>
      <span className="giftcard-amount">Montant libre</span>
    </div>
  );
}
