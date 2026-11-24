# Home Wishlist

Liste de cadeaux de crémaillère façon moodboard : les invités choisissent un objet, tapent leur prénom, et il est réservé pour tout le monde (pas de doublon possible, même si deux personnes cliquent en même temps).

- Next.js 15 (App Router) + framer-motion
- Réservations stockées dans Upstash Redis (gratuit), écriture atomique
- Chaque invité peut annuler **sa** réservation (jeton gardé dans son navigateur)
- L'hôte peut libérer n'importe quel cadeau avec une clé admin

## Mettre en ligne sur Vercel (5 minutes)

1. Sur [vercel.com](https://vercel.com) : **Add New → Project**, importe ce dépôt GitHub, clique **Deploy**.
2. Dans le projet Vercel : onglet **Storage → Create Database**, choisis **Upstash for Redis** ou **Redis** (plan gratuit), puis **Connect Project**.
   Vercel ajoute tout seul les variables (`KV_REST_API_URL`/`KV_REST_API_TOKEN` pour Upstash, `REDIS_URL` pour Redis) : les deux fonctionnent.
3. Onglet **Settings → Environment Variables** : ajoute `ADMIN_KEY` avec un mot de passe de ton choix.
4. Onglet **Deployments** : **Redeploy** pour prendre en compte les variables (obligatoire, sinon le site reste en mode démo).

Tant que Redis n'est pas branché, le site affiche « Mode démo » et les réservations ne sont pas sauvegardées.

## Côté hôte

Ouvre une fois `https://ton-site.vercel.app/?admin=TA_CLE` : ton navigateur s'en souvient, et tu peux ensuite libérer n'importe quel cadeau depuis sa fiche.

## Modifier la liste

Tout est dans `lib/gifts.ts` : nom, précisions, image, taille sur le moodboard (`s`, `m`, `l`) et inclinaison.
Les images détourées (fond transparent) vont dans `public/items/`.
Le titre et la date sont dans `EVENT`, en bas du même fichier.

## En local

```bash
npm install
npm run dev
```
