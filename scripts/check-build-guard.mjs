// Le garde qui refuse de construire pendant qu'un serveur de développement
// tourne — et qui ne se contourne plus en tapant plus court.
//
// Ce qu'il empêche : `next build` et `next dev` écrivent tous les deux dans
// `.next`. Lancer le premier pendant que le second tourne lui retire ses
// fichiers sous les pieds. Le serveur continue de répondre, il sert la page, et
// la feuille de style qu'elle réclame répond 404 — on cherche alors le bug dans
// son CSS pendant que c'est la commande d'à côté qui l'a cassé.
//
// Pourquoi ce fichier existe : la vérification vivait dans `prebuild`. npm
// l'appelait donc pour `npm run build`, et pas pour `npx next build`, qui est
// plus court à taper. C'est par là que la migration vers Next 16 a été
// construite, et le serveur de développement d'à côté répond 500 sur toutes ses
// routes depuis. Un garde qu'on peut contourner sans le savoir protège les
// jours où l'on n'en a pas besoin.
//
// Ce qui casse en silence ici, et que ce garde tient :
//
// 1. **Refuser au mauvais moment.** `next dev` charge la même configuration.
//    Un refus qui ne regarde pas la phase empêche de démarrer le serveur qu'il
//    est censé protéger.
// 2. **Refuser un déploiement.** En production c'est `next start` qui occupe ce
//    port. Un garde qu'on apprend à désactiver à chaque mise en ligne ne garde
//    plus rien.
// 3. **Perdre la sortie de secours.** `PORT=0` est écrit dans le message ; s'il
//    cessait de marcher, le message enverrait dans le mur.
// 4. **L'ordre dans `build:prod`.** Il fait `rm -rf .next` AVANT d'appeler
//    `next build`. Un garde qui n'existerait que dans la configuration
//    arriverait donc après la suppression.
//
//     node scripts/check-build-guard.mjs
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const ROOT = path.resolve(import.meta.dirname, "..")
const require = createRequire(import.meta.url)
const config = require(path.join(ROOT, "next.config.js"))

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`)
  else {
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`)
    failures++
  }
}

const PHASE_BUILD = "phase-production-build"

// Un serveur qui répond ce qu'on lui dit sur la route que seul un serveur de
// développement sert.
async function serveurFactice(statutRouteDev) {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/__nextjs_original-stack-frame")) {
      res.writeHead(statutRouteDev).end()
      return
    }
    res.writeHead(200).end("ok")
  })
  await new Promise((r) => server.listen(0, "127.0.0.1", r))
  return { port: server.address().port, close: () => new Promise((r) => server.close(r)) }
}

// Appeler la configuration comme Next l'appelle, sur un port donné.
async function charger(phase, port) {
  const avant = process.env.PORT
  process.env.PORT = String(port)
  try {
    return { config: await config(phase), erreur: null }
  } catch (err) {
    return { config: null, erreur: err }
  } finally {
    if (avant === undefined) delete process.env.PORT
    else process.env.PORT = avant
  }
}

// ---- un serveur de développement arrête la construction -------------------
{
  // 400 est ce qu'un vrai `next dev` rend sur cette route sans paramètres ; 500
  // est ce qu'un serveur de développement déjà abîmé rend. Les deux sont des
  // réponses, donc des preuves qu'il y a quelqu'un.
  for (const statut of [400, 500, 200]) {
    const faux = await serveurFactice(statut)
    const { erreur } = await charger(PHASE_BUILD, faux.port)
    await faux.close()
    check(`**une route de développement qui rend ${statut} arrête la construction**`, erreur !== null)
    if (erreur) {
      check(`  et le message dit comment s'en sortir`, /PORT=0/.test(erreur.message), erreur.message.slice(0, 80))
      check(`  en nommant le port`, erreur.message.includes(String(faux.port)))
    }
  }
}

// ---- mais seulement pendant la construction -------------------------------
{
  // `next dev` charge la même configuration : refuser là serait refuser de
  // démarrer le serveur qu'on protège.
  const faux = await serveurFactice(400)
  for (const phase of ["phase-development-server", "phase-production-server", "phase-export"]) {
    const { config: rendu, erreur } = await charger(phase, faux.port)
    check(`**${phase} n'est pas refusée**`, erreur === null && rendu !== null, String(erreur?.message).slice(0, 60))
  }
  await faux.close()
}

// ---- et seulement face à un serveur de développement ----------------------
{
  // En production c'est `next start` qui occupe ce port, et il ne connaît pas
  // cette route : il rend 404. Un déploiement doit passer.
  const production = await serveurFactice(404)
  const { config: rendu, erreur } = await charger(PHASE_BUILD, production.port)
  await production.close()
  check("**un `next start` ne bloque pas un déploiement**", erreur === null && rendu !== null, String(erreur?.message).slice(0, 80))
}

// ---- rien qui écoute, rien à dire ----------------------------------------
{
  // Un port libre : on en prend un, on le rend, et personne ne répond dessus.
  const libre = await serveurFactice(400)
  const port = libre.port
  await libre.close()
  const { config: rendu, erreur } = await charger(PHASE_BUILD, port)
  check("**un port libre laisse construire**", erreur === null && rendu !== null)
  check("et la configuration rendue est bien la vraie", rendu?.poweredByHeader === false && typeof rendu?.redirects === "function")
}

// ---- la sortie de secours écrite dans le message --------------------------
{
  const faux = await serveurFactice(400)
  const { config: rendu, erreur } = await charger(PHASE_BUILD, 0)
  await faux.close()
  check("**`PORT=0` passe, comme le message le promet**", erreur === null && rendu !== null)
}

// ---- et le garde en ligne de commande reste, pour une raison précise ------
{
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"))
  const prod = pkg.scripts["build:prod"] ?? ""
  // `rm -rf .next` arrive avant `next build`. Un garde qui n'existerait que
  // dans la configuration arriverait après la suppression : trop tard.
  check(
    "**`build:prod` vérifie avant de supprimer `.next`**",
    prod.indexOf("check-dev-server") >= 0 && prod.indexOf("check-dev-server") < prod.indexOf("rm -rf .next"),
    prod.slice(0, 90)
  )
  check("et `prebuild` l'appelle aussi", (pkg.scripts.prebuild ?? "").includes("check-dev-server"))

  // Les deux appelants lisent le même verdict : deux réponses à la même
  // question finiraient par différer, et c'est celle qu'on ne teste pas qui
  // aurait tort.
  const cli = readFileSync(path.join(ROOT, "scripts/check-dev-server.mjs"), "utf8")
  const conf = readFileSync(path.join(ROOT, "next.config.js"), "utf8")
  check(
    "**et les deux appellent le même verdict**",
    cli.includes("devServerVerdict") && conf.includes("devServerVerdict"),
    "l'un des deux décide dans son coin"
  )
}

console.log(
  failures === 0
    ? "\nConstruire pendant qu'un serveur de développement tourne est refusé, quelle que soit la commande tapée."
    : `\n${failures} échec(s)`
)
process.exit(failures === 0 ? 0 : 1)
