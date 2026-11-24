"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EVENT, GIFTS, SLOT_IDS, alternativesOf, storageId, type Gift } from "@/lib/gifts";
import { Art } from "./Art";

type Reservations = Record<string, { name: string }>;
type Covered = Record<string, { by: string; takenId: string }>;
const nameOf = (id: string) => GIFTS.find((g) => g.id === id)?.name ?? "l'autre option";

const TOKENS_KEY = "wishlist:tokens";
const NAME_KEY = "wishlist:prenom";
const ADMIN_KEY = "wishlist:admin";

function readJSON<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

export default function Board() {
  const [res, setRes] = useState<Reservations>({});
  const [covered, setCovered] = useState<Covered>({});
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState<string>("redis");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/reservations", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setRes(data.reservations ?? {});
      setCovered(data.covered ?? {});
      setStorage(data.storage ?? "redis");
      setLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    setTokens(readJSON(TOKENS_KEY, {}));
    const params = new URLSearchParams(window.location.search);
    const a = params.get("admin");
    if (a) {
      write(ADMIN_KEY, a);
      params.delete("admin");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    try {
      setAdmin(a || localStorage.getItem(ADMIN_KEY));
    } catch {
      setAdmin(a);
    }
    refresh();
    const t = setInterval(refresh, 6000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filledSlots = new Set(GIFTS.filter((g) => res[g.id]).map(storageId));
  const taken = filledSlots.size;
  const list = useMemo(
    () => GIFTS.filter((g) => !(onlyFree && (res[g.id] || covered[g.id]))),
    [onlyFree, res, covered]
  );
  const open = GIFTS.find((g) => g.id === openId) ?? null;

  const saveToken = (id: string, token: string | null) => {
    setTokens((prev) => {
      const next = { ...prev };
      if (token) next[id] = token;
      else delete next[id];
      write(TOKENS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <>
      <header className="hero">
        <h1 className="title" aria-label={`${EVENT.title[0]} ${EVENT.title[1]}`}>
          <span className="title-a">{EVENT.title[0]}</span>
          <span className="title-b">{EVENT.title[1]}</span>
          <span className="title-tag">{EVENT.tag}</span>
        </h1>
        <p className="intro">
          Choisis un objet, écris ton prénom, et il est à toi. Tout le monde voit en direct ce qui est déjà pris.
        </p>
        <div className="meta">
          <span className="count" aria-live="polite">
            {loaded ? (
              <>
                <b>{taken}</b> sur {SLOT_IDS.length} déjà offerts
              </>
            ) : (
              "Chargement de la liste…"
            )}
          </span>
          <span className="dots" aria-hidden="true">
            {SLOT_IDS.map((id) => (
              <i key={id} className={filledSlots.has(id) ? "on" : ""} />
            ))}
          </span>
          <button className="switch" aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)}>
            {onlyFree ? "Tout afficher" : "Seulement les disponibles"}
          </button>
        </div>
        {storage === "memory" && loaded && (
          <p className="demo">Mode démo : connecte une base Redis sur Vercel pour enregistrer les réservations.</p>
        )}
      </header>

      <main className="board">
        {list.map((g, i) => (
          <Item
            key={g.id}
            gift={g}
            index={i}
            reservedBy={res[g.id]?.name}
            coveredBy={covered[g.id]}
            mine={!!tokens[g.id]}
            hidden={openId === g.id}
            onOpen={() => setOpenId(g.id)}
            reduce={!!reduce}
          />
        ))}
        {list.length === 0 && <p className="empty">Tout a été offert. Merci à vous tous !</p>}
      </main>

      <footer className="foot">À samedi 28, on a hâte de vous recevoir.</footer>

      <AnimatePresence>
        {open && (
          <Sheet
            key={open.id}
            gift={open}
            reservedBy={res[open.id]?.name}
            coveredBy={covered[open.id]}
            token={tokens[open.id]}
            admin={admin}
            onClose={() => setOpenId(null)}
            onReserved={(name, token) => {
              setRes((r) => ({ ...r, [open.id]: { name } }));
              setCovered((c) => {
                const n = { ...c };
                for (const o of alternativesOf(open)) n[o.id] = { by: name, takenId: open.id };
                return n;
              });
              saveToken(open.id, token);
              setToast(`Merci ${name} ! « ${open.name} » est pour toi.`);
            }}
            onConflict={() => refresh()}
            onReleased={() => {
              setRes((r) => {
                const n = { ...r };
                delete n[open.id];
                return n;
              });
              setCovered((c) => {
                const n = { ...c };
                for (const o of alternativesOf(open)) delete n[o.id];
                return n;
              });
              saveToken(open.id, null);
              setToast("Réservation annulée.");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Visual({ gift }: { gift: Gift }) {
  if (gift.art) return <Art kind={gift.art} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={gift.image} alt="" draggable={false} />;
}

function Item({
  gift,
  index,
  reservedBy,
  coveredBy,
  mine,
  hidden,
  onOpen,
  reduce,
}: {
  gift: Gift;
  index: number;
  reservedBy?: string;
  coveredBy?: { by: string; takenId: string };
  mine: boolean;
  hidden: boolean;
  onOpen: () => void;
  reduce: boolean;
}) {
  const taken = !!reservedBy;
  const alt = alternativesOf(gift);
  return (
    <motion.button
      className={`item size-${gift.size}${taken || coveredBy ? " taken" : ""}`}
      style={{ ["--tilt" as string]: `${gift.tilt}deg` }}
      onClick={onOpen}
      aria-label={`${gift.name}, ${
        taken ? `réservé par ${reservedBy}` : coveredBy ? `plus besoin, ${coveredBy.by} offre ${nameOf(coveredBy.takenId)}` : "disponible"
      }`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.05 * index, type: "spring", stiffness: 260, damping: 24 }}
      whileTap={reduce ? undefined : { scale: 0.92, rotate: 0 }}
    >
      <span className="item-stage">
        {!hidden ? (
          <motion.span className="item-visual" layoutId={`v-${gift.id}`}>
            <Visual gift={gift} />
          </motion.span>
        ) : (
          <span className="item-visual" />
        )}
        {taken && (
          <span className="sticker">
            {mine ? "C'est toi" : reservedBy}
          </span>
        )}
      </span>
      <span className="item-label">
        <span className="item-name">{gift.name}</span>
        {alt.length > 0 && !taken && !coveredBy && (
          <span className="item-or">ou {alt.map((o) => o.name).join(", ")}</span>
        )}
        <span className={`item-status${taken || coveredBy ? " is-taken" : ""}`}>
          {taken ? "Réservé" : coveredBy ? "Plus besoin" : "Disponible"}
        </span>
      </span>
    </motion.button>
  );
}

function Sheet({
  gift,
  reservedBy,
  coveredBy,
  token,
  admin,
  onClose,
  onReserved,
  onConflict,
  onReleased,
}: {
  gift: Gift;
  reservedBy?: string;
  coveredBy?: { by: string; takenId: string };
  token?: string;
  admin: string | null;
  onClose: () => void;
  onReserved: (name: string, token: string) => void;
  onConflict: () => void;
  onReleased: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [justReserved, setJustReserved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useDragControls();
  const canCancel = !!token || !!admin;

  // onClose change à chaque rafraîchissement de la liste : on le garde dans une ref
  // pour que ces effets ne tournent qu'à l'ouverture (sinon le prénom tapé s'efface).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Écris ton prénom pour que les autres sachent qui l'offre.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: gift.id, name: clean }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        write(NAME_KEY, clean);
        setJustReserved(true);
        onReserved(data.name ?? clean, data.token);
        setTimeout(() => onCloseRef.current(), 1700);
      } else if (r.status === 409) {
        const who = data.by ?? "Quelqu'un";
        setError(
          data.takenId && data.takenId !== gift.id
            ? `Trop tard, ${who} vient de prendre « ${nameOf(data.takenId)} ». Une seule des deux suffit.`
            : `Trop tard, ${who} vient de le réserver.`
        );
        onConflict();
      } else {
        setError(data.error ?? "La réservation n'est pas passée. Réessaie.");
      }
    } catch {
      setError("Pas de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(admin ? { "x-admin-key": admin } : {}) },
        body: JSON.stringify({ giftId: gift.id, token }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        onReleased();
        setConfirmCancel(false);
      } else setError(data.error ?? "L'annulation n'est pas passée.");
    } catch {
      setError("Pas de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const taken = !!reservedBy;

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => info.offset.y > 110 && onClose()}
      >
        <span className="grabber" aria-hidden="true" onPointerDown={(e) => drag.start(e)} />
        <button className="close" onClick={onClose} aria-label="Fermer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className={`sheet-stage${taken || coveredBy ? " taken" : ""}`} onPointerDown={(e) => drag.start(e)}>
          <motion.div className="sheet-visual" layoutId={`v-${gift.id}`}>
            <Visual gift={gift} />
          </motion.div>
          <AnimatePresence>
            {taken && (
              <motion.div
                className="stamp"
                initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
                animate={{ scale: 1, opacity: 1, rotate: -10 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: justReserved ? 0.05 : 0 }}
              >
                <span>Offert par</span>
                <b>{reservedBy}</b>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sheet-body">
          <span className="eyebrow">{gift.room}</span>
          <h2 id="sheet-title" className="sheet-title">
            {gift.name}
          </h2>
          <p className="sheet-details">{gift.details}</p>
          {alternativesOf(gift).length > 0 && !taken && !coveredBy && (
            <p className="or-note">
              Au choix avec « {alternativesOf(gift).map((o) => o.name).join(" », « ")} » : une seule des deux suffit,
              prends celle que tu préfères.
            </p>
          )}

          {justReserved ? (
            <p className="thanks">Merci {reservedBy} ! C&apos;est noté, il est pour toi.</p>
          ) : coveredBy ? (
            <div className="taken-box">
              <p>
                Une seule des deux suffit, et {coveredBy.by} offre déjà « {nameOf(coveredBy.takenId)} ». Choisis un autre
                objet !
              </p>
            </div>
          ) : taken ? (
            <div className="taken-box">
              <p>
                {token ? "Tu as réservé ce cadeau." : `${reservedBy} s'en occupe. Choisis un autre objet !`}
              </p>
              {canCancel &&
                (confirmCancel ? (
                  <div className="row">
                    <button className="btn danger" onClick={cancel} disabled={busy}>
                      {busy ? "Annulation…" : "Oui, annuler"}
                    </button>
                    <button className="btn ghost" onClick={() => setConfirmCancel(false)} disabled={busy}>
                      Garder
                    </button>
                  </div>
                ) : (
                  <button className="link" onClick={() => setConfirmCancel(true)}>
                    {token ? "Annuler ma réservation" : "Libérer ce cadeau (hôte)"}
                  </button>
                ))}
            </div>
          ) : (
            <form className="claim" onSubmit={submit} noValidate>
              <label htmlFor="prenom">Ton prénom</label>
              <div className="claim-row">
                <input
                  id="prenom"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Camille"
                  autoComplete="given-name"
                  maxLength={30}
                  enterKeyHint="done"
                />
                <motion.button className="btn" type="submit" disabled={busy} whileTap={{ scale: 0.95 }}>
                  {busy ? "Un instant…" : "Je l'offre"}
                </motion.button>
              </div>
              <p className="hint">Ton prénom sera visible par les autres invités, pour éviter les doublons.</p>
            </form>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
