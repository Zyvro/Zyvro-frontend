// La page de téléchargement lit une vraie release. Ce script exerce le code qui
// la lit, contre la vraie release publiée.
//
// Deux pièges, et aucun des deux ne se voit en regardant la page :
//
// 1. electron-builder ne met pas l'architecture dans le nom du .dmg Intel.
//    C'est sa convention, pas un oubli — donc si le test « arm64 » ne passe pas
//    en premier, tous les Mac reçoivent le paquet Apple Silicon et les Intel
//    téléchargent quelque chose qui ne démarre pas.
//
// 2. Le tableau d'empreintes des notes nomme les fichiers avec des espaces ;
//    GitHub les sert avec des points. Les deux graphies ne se rencontrent
//    jamais, donc sans normalisation la colonne SHA-256 se vide toute seule et
//    la page promet une vérification qu'elle n'affiche pas.
//
// Le module testé est le vrai, compilé par tsc : une copie écrite ici serait
// une deuxième liste, et c'est la faute qui a déjà fait signer des empreintes
// que personne d'autre ne calculait.
//
//     node scripts/check-download.mjs
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"

const ROOT = path.resolve(import.meta.dirname, "..")
const out = mkdtempSync(path.join(tmpdir(), "zyvro-download-"))
execFileSync(
  "npx",
  ["tsc", "src/lib/releases.ts", "--outDir", out, "--module", "commonjs",
   "--target", "es2022", "--lib", "es2022,dom", "--skipLibCheck", "--noEmitOnError"],
  { cwd: ROOT, stdio: "inherit" }
)
const { classifyAsset, parseRelease, checksums, formatSize } =
  createRequire(import.meta.url)(path.join(out, "releases.js"))

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`)
  else {
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`)
    failures++
  }
}

// ---- le nommage d'electron-builder -------------------------------------
const cls = (n) => JSON.stringify(classifyAsset(n))
check("le dmg arm64 est pour Apple Silicon",
  cls("Zyvro.Studio-0.1.0-alpha.5-arm64.dmg") === '{"platform":"mac-arm64","kind":"installer"}', cls("Zyvro.Studio-0.1.0-alpha.5-arm64.dmg"))
check("**le dmg sans architecture est pour Intel**",
  cls("Zyvro.Studio-0.1.0-alpha.5.dmg") === '{"platform":"mac-x64","kind":"installer"}', cls("Zyvro.Studio-0.1.0-alpha.5.dmg"))
check("le Setup .exe est pour Windows",
  cls("Zyvro.Studio.Setup.0.1.0-alpha.5.exe") === '{"platform":"windows","kind":"installer"}')
check("un zip mac est une archive, jamais l'installeur recommandé",
  cls("Zyvro.Studio-0.1.0-alpha.5-arm64-mac.zip") === '{"platform":"mac-arm64","kind":"archive"}')
check("ce qui n'est pas un paquet est ignoré",
  classifyAsset("latest-mac.yml") === null && classifyAsset("sources.tar.gz") === null)

// ---- les empreintes ----------------------------------------------------
const body = [
  "| File | SHA-256 |",
  "|---|---|",
  "| `Zyvro Studio-0.1.0-alpha.5-arm64.dmg` | `" + "d".repeat(64) + "` |",
  "| pas une ligne du tableau |",
].join("\n")
check("le tableau des notes est lu", checksums(body).size === 1)
check("**les espaces des notes rejoignent les points de GitHub**",
  checksums(body).get("Zyvro.Studio-0.1.0-alpha.5-arm64.dmg") === "d".repeat(64))

// ---- contre la vraie release -------------------------------------------
// Réseau coupé, GitHub en panne, machine de build enfermée : la partie hors
// ligne suffit à attraper les deux pièges, et faire échouer une construction de
// production parce qu'une API tierce ne répond pas serait empêcher un
// déploiement pour une raison qui ne le concerne pas.
const res = await fetch("https://api.github.com/repos/Zyvro/Zyvro-desktop/releases?per_page=10", {
  headers: { Accept: "application/vnd.github+json" },
}).catch(() => null)
if (!res || !res.ok) {
  console.log(`\n  (GitHub injoignable ou ${res?.status} — la partie en ligne est sautée)`)
} else {
  const rows = await res.json()
  const raw = rows.find((r) => !r.draft && (r.assets?.length ?? 0) > 0)
  check("une release publiée est trouvée sans /releases/latest", Boolean(raw),
    "toutes nos releases sont des préversions, et /releases/latest les ignore")
  const rel = parseRelease(raw)
  const installers = rel.assets.filter((a) => a.kind === "installer")
  const platforms = new Set(installers.map((a) => a.platform))
  check("les trois plateformes ont leur installeur",
    ["mac-arm64", "mac-x64", "windows"].every((p) => platforms.has(p)), [...platforms].join(", "))
  check("chaque fichier offert a son empreinte",
    rel.assets.every((a) => typeof a.sha256 === "string" && a.sha256.length === 64),
    rel.assets.filter((a) => !a.sha256).map((a) => a.name).join(", "))
  check("l'installeur passe avant l'archive", rel.assets[0].kind === "installer", rel.assets[0].name)
  check("chaque fichier a une taille lisible",
    rel.assets.every((a) => /^\d+ MB$/.test(formatSize(a.size))))
  console.log(`\n  ${rel.tag} — ${rel.assets.length} fichiers, ${installers.length} installeurs`)
}

console.log(failures === 0 ? "\nLa page offrira ce qui a vraiment été publié." : `\n${failures} échec(s)`)
process.exit(failures === 0 ? 0 : 1)
