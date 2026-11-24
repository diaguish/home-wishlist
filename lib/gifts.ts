export type ArtKind = "projector" | "giftcard" | "book-fourthwing" | "book-seasons" | "book-shatterme";

export type Gift = {
  id: string;
  name: string;
  details: string;
  room: "Salon" | "Cuisine" | "Rangement" | "Chambre" | "Lecture" | "Carte cadeau";
  /** Image détourée dans /public/items, ou un visuel dessiné en code. */
  image?: string;
  art?: ArtKind;
  /** Taille sur le moodboard. */
  size: "s" | "m" | "l";
  /** Petite inclinaison pour l'effet "posé à la main". */
  tilt: number;
  /** Cadeaux « au choix » : un seul du même groupe peut être offert. */
  group?: string;
};

// L'ordre compose le moodboard : alterner grands / petits objets.
export const GIFTS: Gift[] = [
  { id: "fauteuil", name: "Fauteuil", details: "Fauteuil design vert olive, comme sur la photo", room: "Salon", image: "/items/fauteuil.webp", size: "l", tilt: -2 },
  { id: "fourth-wing", name: "Fourth Wing, tome 1", details: "Version française, édition collector", room: "Lecture", art: "book-fourthwing", size: "s", tilt: 6 },
  { id: "miroir", name: "Grand miroir", details: "Dimensions et style au choix", room: "Chambre", image: "/items/miroir.webp", size: "l", tilt: 0 },
  { id: "projecteur", name: "Projecteur portable", details: "Niklok, le modèle de la photo", room: "Salon", art: "projector", size: "s", tilt: -5 },
  { id: "plaid", name: "Plaid", details: "Couleur et dimensions au choix", room: "Salon", image: "/items/plaid.webp", size: "m", tilt: 3 },
  { id: "bols", name: "Set de bols de préparation", details: "12 pièces, inox", room: "Cuisine", image: "/items/bols.webp", size: "s", tilt: -3 },
  { id: "raskog", name: "Desserte IKEA RÅSKOG", details: "Gris-vert, 3 niveaux", room: "Rangement", image: "/items/raskog.webp", size: "m", tilt: 2, group: "desserte" },
  { id: "trolley-bambou", name: "Desserte en bambou", details: "3 plateaux et 1 étagère", room: "Cuisine", image: "/items/trolley.webp", size: "m", tilt: 1, group: "desserte" },
  { id: "seasons", name: "Saga Seasons", details: "Morgane Moncomble, grand format (pas en poche)", room: "Lecture", art: "book-seasons", size: "s", tilt: -6 },
  { id: "corbeille", name: "Corbeille à fruits", details: "2 niveaux", room: "Cuisine", image: "/items/corbeille.webp", size: "m", tilt: -2 },
  { id: "carte-ikea", name: "Carte cadeau IKEA", details: "Montant libre", room: "Carte cadeau", art: "giftcard", size: "s", tilt: 7 },
  { id: "egouttoir", name: "Égouttoir à vaisselle", details: "2 niveaux, modèle noir de la photo", room: "Cuisine", image: "/items/egouttoir.webp", size: "m", tilt: -3 },
  { id: "shatter-me", name: "Saga Shatter Me", details: "Grand format, l'édition avec l'œil sur la couverture", room: "Lecture", art: "book-shatterme", size: "s", tilt: 4 },
  { id: "draps", name: "Draps", details: "Taille au choix : 80 × 200 cm ou 160 × 200 cm", room: "Chambre", image: "/items/draps.webp", size: "m", tilt: -2 },
  { id: "variera", name: "Demi-étagère IKEA VARIERA", details: "Blanche, 32 × 28 × 16 cm", room: "Rangement", image: "/items/variera.webp", size: "s", tilt: 3 },
  { id: "organiseur-bambou", name: "Organiseur en bambou", details: "Plateau de rangement, 6 pièces", room: "Rangement", image: "/items/couverts.webp", size: "s", tilt: -4 },
  { id: "boite-tiroir", name: "Boîte de rangement pour tiroir", details: "Salle de bain, dimensions et compartiments au choix", room: "Rangement", image: "/items/boite.webp", size: "s", tilt: 2 },
];

export const GIFT_IDS = new Set(GIFTS.map((g) => g.id));

/** Clé de stockage : partagée par les cadeaux d'un même groupe, pour qu'un seul puisse être réservé. */
export const storageId = (g: Gift) => (g.group ? `group-${g.group}` : g.id);

/** Les autres cadeaux au choix avec celui-ci. */
export const alternativesOf = (g: Gift) => (g.group ? GIFTS.filter((o) => o.group === g.group && o.id !== g.id) : []);

/** Nombre de « places » à offrir : un groupe au choix compte pour une seule. */
export const SLOT_IDS = [...new Set(GIFTS.map(storageId))];

export const EVENT = {
  title: ["Home", "Wishlist"] as const,
  tag: "Crémaillère · samedi 28 novembre",
};
