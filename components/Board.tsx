"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENTRIES, EVENT, type Entry, type Gift } from "@/lib/gifts";
import { Art } from "./Art";

type Reservations = Record<string, { name: string }>;

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

/** Le cadeau réservé dans une entrée (un seul possible, même pour un groupe au choix). */
const takenIn = (e: Entry, res: Reservations) => e.options.find((o) => res[o.id]);

export default function Board() {
  const [res, setRes] = useState<Reservations>({});
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState<string>("redis");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/reservations", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setRes(data.reservations ?? {});
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

  const taken = ENTRIES.filter((e) => takenIn(e, res)).length;
  const list = useMemo(() => ENTRIES.filter((e) => !(onlyFree && takenIn(e, res))), [onlyFree, res]);
  const open = ENTRIES.find((e) => e.key === openKey) ?? null;

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
                <b>{taken}</b> sur {ENTRIES.length} déjà offerts
              </>
            ) : (
              "Chargement de la liste…"
            )}
          </span>
          <span className="dots" aria-hidden="true">
            {ENTRIES.map((e) => (
              <i key={e.key} className={takenIn(e, res) ? "on" : ""} />
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
        {list.map((e, i) => (
          <Item
            key={e.key}
            entry={e}
            index={i}
            takenGift={takenIn(e, res)}
            reservedBy={(() => {
              const t = takenIn(e, res);
              return t ? res[t.id].name : undefined;
            })()}
            mine={e.options.some((o) => tokens[o.id] && res[o.id])}
            hidden={openKey === e.key}
            onOpen={() => setOpenKey(e.key)}
            reduce={!!reduce}
          />
        ))}
        {list.length === 0 && <p className="empty">Tout a été offert. Merci à vous tous !</p>}
      </main>

      <footer className="foot">À samedi 28, on a hâte de vous recevoir.</footer>

      <AnimatePresence>
        {open && (
          <Sheet
            key={open.key}
            entry={open}
            res={res}
            tokens={tokens}
            admin={admin}
            onClose={() => setOpenKey(null)}
            onReserved={(gift, name, token) => {
              setRes((r) => ({ ...r, [gift.id]: { name } }));
              saveToken(gift.id, token);
              setToast(`Merci ${name} ! « ${gift.name} » est pour toi.`);
            }}
            onConflict={() => refresh()}
            onReleased={(gift) => {
              setRes((r) => {
                const n = { ...r };
                delete n[gift.id];
                return n;
              });
              saveToken(gift.id, null);
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
  entry,
  index,
  takenGift,
  reservedBy,
  mine,
  hidden,
  onOpen,
  reduce,
}: {
  entry: Entry;
  index: number;
  takenGift?: Gift;
  reservedBy?: string;
  mine: boolean;
  hidden: boolean;
  onOpen: () => void;
  reduce: boolean;
}) {
  const taken = !!takenGift;
  const pair = entry.options.length > 1;
  const first = entry.options[0];
  const label = pair
    ? `${entry.options.map((o) => o.name).join(" ou ")}, au choix, ${
        taken ? `${reservedBy} offre ${takenGift!.name}` : "disponible"
      }`
    : `${first.name}, ${taken ? `réservé par ${reservedBy}` : "disponible"}`;

  return (
    <motion.button
      className={`item ${pair ? "pair" : `size-${first.size}`}${taken ? " taken" : ""}`}
      style={{ ["--tilt" as string]: `${first.tilt}deg` }}
      onClick={onOpen}
      aria-label={label}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.05 * index, type: "spring", stiffness: 260, damping: 24 }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
    >
      <span className="item-stage">
        {entry.options.map((g, i) => (
          <Fragment key={g.id}>
            {i > 0 && (
              <span className="or-mark" aria-hidden="true">
                ou
              </span>
            )}
            {!hidden ? (
              <motion.span
                className={`item-visual${pair ? ` side-${i === 0 ? "l" : "r"}` : ""}${
                  taken && takenGift!.id !== g.id ? " unpicked" : ""
                }`}
                layoutId={`v-${g.id}`}
              >
                <Visual gift={g} />
              </motion.span>
            ) : (
              <span className={`item-visual${pair ? ` side-${i === 0 ? "l" : "r"}` : ""}`} />
            )}
          </Fragment>
        ))}
        {taken && (
          <span className={`sticker${pair ? ` on-${takenGift!.id === first.id ? "l" : "r"}` : ""}`}>
            {mine ? "C'est toi" : reservedBy}
          </span>
        )}
      </span>
      <span className="item-label">
        <span className="item-name">{pair && taken ? takenGift!.name : entry.title}</span>
        {pair && !taken && <span className="item-or">{entry.options.map((o) => o.name).join(" ou ")}</span>}
        <span className={`item-status${taken ? " is-taken" : ""}`}>{taken ? "Réservé" : "Disponible"}</span>
      </span>
    </motion.button>
  );
}

function Sheet({
  entry,
  res,
  tokens,
  admin,
  onClose,
  onReserved,
  onConflict,
  onReleased,
}: {
  entry: Entry;
  res: Reservations;
  tokens: Record<string, string>;
  admin: string | null;
  onClose: () => void;
  onReserved: (gift: Gift, name: string, token: string) => void;
  onConflict: () => void;
  onReleased: (gift: Gift) => void;
}) {
  const pair = entry.options.length > 1;
  const takenGift = takenIn(entry, res);
  const taken = !!takenGift;
  const [pickedId, setPickedId] = useState<string>(takenGift?.id ?? entry.options[0].id);
  const picked = takenGift ?? entry.options.find((o) => o.id === pickedId) ?? entry.options[0];
  const reservedBy = takenGift ? res[takenGift.id].name : undefined;
  const token = takenGift ? tokens[takenGift.id] : undefined;
  const canCancel = !!token || !!admin;

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [justReserved, setJustReserved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useDragControls();

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
    const gift = picked;
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
        onReserved(gift, data.name ?? clean, data.token);
        setTimeout(() => onCloseRef.current(), 1700);
      } else if (r.status === 409) {
        const who = data.by ?? "Quelqu'un";
        const other = entry.options.find((o) => o.id === data.takenId);
        setError(
          other && other.id !== gift.id
            ? `Trop tard, ${who} vient de prendre « ${other.name} ». Une seule des deux suffit.`
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
    if (!takenGift) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(admin ? { "x-admin-key": admin } : {}) },
        body: JSON.stringify({ giftId: takenGift.id, token }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        onReleased(takenGift);
        setConfirmCancel(false);
      } else setError(data.error ?? "L'annulation n'est pas passée.");
    } catch {
      setError("Pas de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={`sheet${pair ? " is-pair" : ""}`}
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

        {pair ? (
          <div className="sheet-stage pair-stage" role="radiogroup" aria-label="Choisis ta desserte">
            {entry.options.map((g, i) => {
              const isPicked = picked.id === g.id;
              return (
                <Fragment key={g.id}>
                  {i > 0 && (
                    <span className="or-mark big" aria-hidden="true">
                      ou
                    </span>
                  )}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    aria-label={g.name}
                    disabled={taken}
                    className={`pick${isPicked ? " picked" : ""}${taken && !isPicked ? " gone" : ""}`}
                    onClick={() => {
                      setPickedId(g.id);
                      setError(null);
                    }}
                  >
                    <motion.span
                      className={`pick-visual side-${i === 0 ? "l" : "r"}`}
                      layoutId={`v-${g.id}`}
                    >
                      <Visual gift={g} />
                    </motion.span>
                    <span className="pick-name">{g.name}</span>
                    {!taken && (
                      <span className="pick-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                </Fragment>
              );
            })}
            <AnimatePresence>
              {taken && (
                <motion.div
                  className={`stamp on-${takenGift!.id === entry.options[0].id ? "l" : "r"}`}
                  initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
                  animate={{ scale: 1, opacity: 1, rotate: -10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                >
                  <span>Offert par</span>
                  <b>{reservedBy}</b>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className={`sheet-stage${taken ? " taken" : ""}`} onPointerDown={(e) => drag.start(e)}>
            <motion.div className="sheet-visual" layoutId={`v-${picked.id}`}>
              <Visual gift={picked} />
            </motion.div>
            <AnimatePresence>
              {taken && (
                <motion.div
                  className="stamp"
                  initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
                  animate={{ scale: 1, opacity: 1, rotate: -10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                >
                  <span>Offert par</span>
                  <b>{reservedBy}</b>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="sheet-body">
          <span className="eyebrow">{pair ? (taken ? "Au choix · réservé" : "Au choix, une seule des deux") : entry.room}</span>
          <h2 id="sheet-title" className="sheet-title">
            {picked.name}
          </h2>
          <p className="sheet-details">{picked.details}</p>
          {pair && !taken && (
            <p className="or-note">
              Elle n&apos;en veut qu&apos;une : touche celle que tu préfères, puis valide.
            </p>
          )}

          {justReserved ? (
            <p className="thanks">Merci {reservedBy} ! C&apos;est noté, elle est pour toi.</p>
          ) : taken ? (
            <div className="taken-box">
              <p>
                {token
                  ? pair
                    ? `Tu offres « ${takenGift!.name} ». L'autre n'est plus nécessaire.`
                    : "Tu as réservé ce cadeau."
                  : pair
                    ? `${reservedBy} offre « ${takenGift!.name} », donc l'autre n'est plus nécessaire. Choisis un autre objet !`
                    : `${reservedBy} s'en occupe. Choisis un autre objet !`}
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
                  {busy ? "Un instant…" : pair ? "J'offre celle-ci" : "Je l'offre"}
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
