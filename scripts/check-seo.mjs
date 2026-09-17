// Ce qu'un lien vers Zyvro montre ailleurs — lu sur les pages réellement
// servies, pas dans le code qui est censé les produire.
//
// C'est la seule vérification qui vaut ici. Une balise Open Graph est une
// promesse faite à des machines qu'on ne contrôle pas : elles ne lisent pas
// `metadata`, elles lisent le HTML. Et la façon dont ça casse est silencieuse —
// une image relative, un titre qui traverse deux fois le gabarit, une page
// cliente qui n'annonce rien — sans qu'aucune page n'ait l'air abîmée quand on
// l'ouvre soi-même.
//
// Sans argument, il démarre lui-même la construction qui vient d'être faite et
// l'arrête en partant : un garde qu'il faut penser à lancer à la main, après
// avoir monté un serveur à côté, est un garde que personne ne lance.
//
//     node scripts/check-seo.mjs                  # démarre et arrête tout seul
//     node scripts/check-seo.mjs http://…         # contre une instance à soi
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

const ROOT = path.resolve(import.meta.dirname, "..")
const given = process.argv[2]
const PORT = 4198
const BASE = (given ?? `http://localhost:${PORT}`).replace(/\/+$/, "")

let server = null
if (!given) {
  if (!existsSync(path.join(ROOT, ".next"))) {
    console.log("  (pas de construction dans .next — `npm run build` d'abord)")
    process.exit(0)
  }
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, stdio: "ignore" })
  process.on("exit", () => server?.kill())
}

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`)
  else {
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`)
    failures++
  }
}

async function head(path) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`)
      const html = await res.text()
      return { status: res.status, html }
    } catch {
      await sleep(1000)
    }
  }
  throw new Error(`${BASE}${path} ne répond pas`)
}

// meta lit une balise sans dépendre de l'ordre de ses attributs : Next écrit
// parfois `content` avant `property`, et une expression qui suppose l'inverse
// passe au vert en ne trouvant rien.
function meta(html, key) {
  const attr = key.startsWith("og:") || key.startsWith("article:") ? "property" : "name"
  const re = new RegExp(
    `<meta[^>]*(?:${attr}="${key}"[^>]*content="([^"]*)"|content="([^"]*)"[^>]*${attr}="${key}")[^>]*>`,
    "i"
  )
  const m = html.match(re)
  return m ? (m[1] ?? m[2]) : null
}

function title(html) {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null
}

function canonical(html) {
  return html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? null
}

// ---- l'accueil ----------------------------------------------------------
{
  const { status, html } = await head("/")
  check("l'accueil répond", status === 200, String(status))
  check("il a un titre qui ne répète pas la marque",
    (title(html)?.match(/Zyvro/g) ?? []).length === 1, title(html))
  check("il a une description", (meta(html, "description") ?? "").length > 60, meta(html, "description"))
  check("og:image est une adresse absolue",
    (meta(html, "og:image") ?? "").startsWith("http"), meta(html, "og:image"))
  check("og:image est celle sur fond noir",
    (meta(html, "og:image") ?? "").endsWith("/brand/og-default.png"), meta(html, "og:image"))
  check("la carte est large, pas une vignette carrée",
    meta(html, "twitter:card") === "summary_large_image", meta(html, "twitter:card"))
  check("og:type et og:site_name sont là",
    meta(html, "og:type") === "website" && meta(html, "og:site_name") === "Zyvro")
  check("l'accueil se déclare canonique", Boolean(canonical(html)), canonical(html))
}

// ---- l'image d'aperçu existe vraiment -----------------------------------
{
  const res = await fetch(`${BASE}/brand/og-default.png`)
  check("l'image d'aperçu est servie", res.ok, String(res.status))
  const buf = Buffer.from(await res.arrayBuffer())
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  check("elle est au format qu'attendent les aperçus larges", w === 1200 && h === 630, `${w}x${h}`)
  // Le point de départ de tout ceci : le logo de marque est un PNG transparent,
  // donc sur le fond blanc d'une messagerie il était blanc sur blanc. L'octet
  // 25 de l'en-tête PNG dit le type de couleur — 2, c'est sans canal alpha,
  // donc opaque par construction et non par espoir.
  check("**elle a un fond opaque, pas un canal alpha**", buf[25] === 2, `type de couleur ${buf[25]}`)
}

// ---- le téléchargement --------------------------------------------------
for (const [path, expected] of [
  ["/download", "Download Zyvro Studio"],
  ["/download/mac", "macOS"],
  ["/download/windows", "Windows"],
]) {
  const { status, html } = await head(path)
  check(`${path} répond et s'annonce`, status === 200 && (title(html) ?? "").includes(expected),
    `${status} — ${title(html)}`)
  check(`${path} porte sa propre canonique`, (canonical(html) ?? "").endsWith(path), canonical(html))
  check(`${path} a son og:title`, (meta(html, "og:title") ?? "").includes(expected), meta(html, "og:title"))
}

// ---- la boutique --------------------------------------------------------
{
  const { status, html } = await head("/store")
  check("la boutique s'annonce plutôt que d'hériter du site",
    status === 200 && (title(html) ?? "").startsWith("Store"), `${status} — ${title(html)}`)
}

// ---- robots et plan du site --------------------------------------------
{
  const robots = await (await fetch(`${BASE}/robots.txt`)).text()
  check("robots.txt existe et nomme le plan du site", robots.includes("Sitemap:"), robots.slice(0, 120))
  check("**l'application derrière session n'est pas offerte à l'indexation**",
    ["/dashboard", "/builder", "/settings", "/admin"].every((p) => robots.includes(`Disallow: ${p}`)),
    robots)
  check("un lien de partage n'entre pas dans un index", robots.includes("Disallow: /w/"), robots)

  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
  check("le plan du site liste les pages publiques",
    ["/download", "/store"].every((p) => sitemap.includes(p)), sitemap.slice(0, 200))
  check("il ne liste pas la connexion", !sitemap.includes("/login"))
}

server?.kill()
console.log(failures === 0 ? "\nUn lien vers Zyvro montre ce qu'il contient." : `\n${failures} échec(s)`)
process.exit(failures === 0 ? 0 : 1)
