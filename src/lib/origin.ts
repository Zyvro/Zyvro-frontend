// L'adresse de l'API, en un seul endroit.
//
// Elle était écrite deux fois — ici et dans le middleware — avec le même repli
// silencieux vers localhost des deux côtés. Ça a suffi pour mettre la
// production à terre : construit sur un poste de développement, le bundle a
// gravé `http://localhost:4102` dans le code client *et* dans la CSP, le
// déploiement n'a rien signalé, toutes les pages ont répondu 200, et chaque
// navigateur s'est vu dire d'aller parler à une machine qui n'existe pas chez
// lui. Symptôme côté utilisateur : « Failed to fetch ».
//
// Deux choses ont changé. Une seule déclaration, importée par les deux. Et plus
// de repli : une variable absente s'arrête ici, bruyamment, plutôt que de
// produire un site qui a l'air correct. La valeur de développement vit dans
// `.env.development`, donc `npm run dev` marche toujours sans rien savoir.
//
// `NEXT_PUBLIC_*` est gravée à la compilation et jamais relue à l'exécution :
// le `.env.production` du serveur n'y peut rien. C'est pour ça que
// `npm run build:prod` nomme l'origine explicitement et que
// `scripts/check-build-origin.mjs` regarde ce qui est réellement sorti.
function required(name: string, value: string | undefined): string {
  const trimmed = (value ?? "").trim()
  if (trimmed === "") {
    throw new Error(
      `${name} n'est pas définie. Elle est gravée dans le bundle à la compilation, ` +
        `donc un build sans elle produit un site cassé sans le dire. ` +
        `Pour la production : npm run build:prod`
    )
  }
  return trimmed.replace(/\/+$/, "")
}

export const API_URL = required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL)
