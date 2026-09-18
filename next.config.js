const path = require("node:path")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // La racine que Next trace pour savoir quels fichiers une route emporte.
  //
  // Il la devine, et il devine mal ici : les quatre dépôts sont voisins et le
  // dossier parent a son propre `package-lock.json`, alors Next remonte
  // au-dessus de ce projet et le dit — « inferred your workspace root, but it
  // may not be correct ». Une racine trop haute fait tracer des fichiers qui
  // n'ont rien à voir ; la nommer coûte une ligne et retire l'ambiguïté d'une
  // construction de production.
  outputFileTracingRoot: path.join(__dirname),

  // Next.js annonce sa présence dans un en-tête par défaut. Ça ne protège de
  // rien de le cacher, mais ça ne sert à rien de l'annoncer non plus : c'est
  // la première chose qu'un scanner lit pour choisir quoi essayer.
  poweredByHeader: false,
  reactStrictMode: true,

  // `next dev` écrivait `AGENTS.md` et `CLAUDE.md` à la racine, à chaque
  // démarrage, et les réécrivait quand on les supprimait. Deux fichiers que
  // personne ici n'a décidés, qui salissaient l'arbre un jour sur deux et qui
  // sont une fois entrés dans un commit parlant d'autre chose.
  //
  // Éteint à la source plutôt que masqué : c'est le serveur lui-même qui nomme
  // l'interrupteur dans son journal. Le `.gitignore` les garde tout de même,
  // par précaution, si un jour ce réglage change de nom.
  agentRules: false,

  // Explore et la boutique listaient la même chose sous deux noms. Il n'en
  // reste qu'une, et l'ancienne adresse redirige plutôt que de renvoyer 404 :
  // elle a été en ligne, elle est dans des favoris et dans l'historique.
  // Permanente parce qu'elle ne reviendra pas.
  async redirects() {
    return [{ source: "/explore", destination: "/store?tab=workflows", permanent: true }]
  },
}

// La configuration est une fonction, et c'est là que le garde se tient.
//
// Next la charge quelle que soit la commande — `next dev`, `next build`,
// `next start`, avec ou sans npm — et c'est la seule chose dont on soit sûr.
// La vérification vivait dans `prebuild`, donc npm l'appelait pour
// `npm run build` et pas pour `npx next build`, qui est plus court à taper.
// C'est par là que la migration vers Next 16 a été construite, et le serveur de
// développement d'à côté a perdu ses fichiers sous les pieds.
//
// Un garde qu'on peut contourner sans le savoir protège les jours où l'on n'en
// a pas besoin.
//
// Seulement pendant la phase de construction : `next dev` charge la même
// configuration, et refuser là serait refuser de démarrer le serveur qu'on
// protège. Et seulement face à un serveur de DÉVELOPPEMENT — en production
// c'est `next start` qui occupe ce port, et un déploiement doit passer.
const PHASE_BUILD = "phase-production-build"

module.exports = async (phase) => {
  if (phase !== PHASE_BUILD) return nextConfig

  const { devServerVerdict } = await import("./scripts/dev-server-verdict.mjs")
  const verdict = await devServerVerdict()
  if (verdict.blocking) {
    // Une exception plutôt qu'un `process.exit` : Next la montre avec le nom du
    // fichier qui l'a levée, et quelqu'un qui découvre ce refus a besoin de
    // savoir d'où il vient.
    throw new Error(`\n${verdict.message}`)
  }
  if (verdict.message) console.log(verdict.message)
  return nextConfig
}
