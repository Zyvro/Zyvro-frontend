// Ce qu'un build de production a réellement gravé comme adresse d'API.
//
// C'est arrivé le 16/09 et rien dans la chaîne ne pouvait l'attraper.
// `NEXT_PUBLIC_API_URL` est gravée à la compilation, jamais relue à
// l'exécution : construit sur un poste de développement, le bundle a emporté
// le `.env.local` de ce poste, et le `.env.production` du serveur n'y pouvait
// plus rien. Le build était vert, le typecheck vert, le service a démarré,
// toutes les pages ont répondu 200 — et chaque navigateur s'est vu dire
// d'appeler `http://localhost:4102`, que la CSP, construite depuis la même
// variable, interdisait par-dessus le marché. Ce que l'utilisateur voit de
// tout ça : « Failed to fetch ».
//
// Donc on regarde ce qui est sorti, pas ce qui est entré. Uniquement
// `.next/static`, les fichiers que le navigateur télécharge : le bundle
// serveur de Next porte ses propres `localhost` (un utilitaire d'URL, un proxy
// de test) qui ne sont pas les nôtres et qui faisaient crier ce script à tort.
//
//     node scripts/check-build-origin.mjs https://server.zyv.ro [.next]
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const expected = (process.argv[2] || "").replace(/\/+$/, "")
const root = path.resolve(process.argv[3] || ".next")
if (!expected) {
  console.log("usage : node scripts/check-build-origin.mjs <origine attendue> [.next]")
  process.exit(2)
}

const served = path.join(root, "static")
function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) yield* files(full)
    else if (/\.(js|mjs|json)$/.test(entry) && !full.endsWith(".map")) yield full
  }
}

const LOCAL = /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/g
const offenders = new Map()
let namesExpected = false
for (const file of files(served)) {
  const text = readFileSync(file, "utf8")
  if (text.includes(expected)) namesExpected = true
  const found = text.match(LOCAL)
  if (found) offenders.set(path.relative(root, file), [...new Set(found)])
}

let failed = false
if (offenders.size > 0) {
  failed = true
  console.log(`Ce build envoie une adresse locale au navigateur, dans ${offenders.size} fichier(s) :\n`)
  for (const [file, urls] of offenders) console.log(`  ${file}\n      ${urls.join(", ")}`)
}
if (!namesExpected) {
  failed = true
  console.log(`\nAucun morceau servi ne nomme ${expected}.`)
}

if (failed) {
  console.log(`
Il a presque sûrement été construit avec un .env.local. Reconstruire avec
l'origine nommée explicitement — une vraie variable d'environnement l'emporte
sur les fichiers .env :

  npm run build:prod
`)
  process.exit(1)
}
console.log(`ok — le navigateur reçoit ${expected}, et aucune adresse locale.`)
