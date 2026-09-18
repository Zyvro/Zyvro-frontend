// Y a-t-il un serveur de développement qui sert le dossier qu'on s'apprête à
// construire ?
//
// Séparé du script qui l'appelle parce qu'il y a maintenant deux appelants, et
// que c'est tout le sujet. La vérification vivait dans `prebuild`, donc elle
// protégeait `npm run build` et `npm run build:prod` — et pas `npx next build`,
// qui est plus court à taper et que npm ne voit pas passer. C'est arrivé : la
// migration vers Next 16 a été construite avec la commande courte, le serveur
// de développement d'à côté a perdu ses fichiers sous les pieds, et il répond
// 500 sur toutes ses routes depuis.
//
// Un garde qu'on peut contourner sans le savoir protège les jours où l'on n'en
// a pas besoin. Celui-ci descend donc dans `next.config.js`, que Next charge
// quelle que soit la façon dont on l'a lancé.

import { createConnection } from "node:net"

export const DEFAULT_PORT = 4101

/**
 * Ce qu'on sait du port, et ce qu'il faut en conclure.
 *
 * `blocking` est vrai seulement pour un serveur de développement : en
 * production c'est `next start` qui occupe ce port, et refuser là-bas
 * transformerait ce garde en formalité qu'on contourne à chaque mise en ligne.
 * Un garde qu'on apprend à désactiver ne garde plus rien.
 */
export async function devServerVerdict(port = Number(process.env.PORT ?? DEFAULT_PORT)) {
  // `PORT=0` est la sortie de secours, écrite dans le message : un port que
  // personne n'écoute est un port où l'on ne trouve rien.
  if (!Number.isFinite(port) || port <= 0) {
    return { blocking: false, reason: "no-port", message: "" }
  }

  const listening = await new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" })
    const answer = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(400)
    socket.on("connect", () => answer(true))
    socket.on("timeout", () => answer(false))
    socket.on("error", () => answer(false))
  })
  if (!listening) return { blocking: false, reason: "nothing-listening", message: "" }

  // Une route que seul un serveur de développement sert. En production elle
  // rend 404 ; en développement elle rend autre chose — 400 sur une requête
  // sans paramètres, ce qui est une réponse, donc une preuve. Et 500 sur un
  // serveur de développement déjà abîmé, ce qui en est une aussi.
  const dev = await fetch(`http://127.0.0.1:${port}/__nextjs_original-stack-frame`)
    .then((res) => res.status !== 404)
    .catch(() => true)

  if (!dev) {
    return {
      blocking: false,
      reason: "not-a-dev-server",
      message: `Something is listening on ${port}, and it is not a dev server: building is what a deploy does.`,
    }
  }

  return {
    blocking: true,
    reason: "dev-server",
    message:
      `A dev server is listening on ${port}. Building now would delete the files it is serving:\n` +
      `the page keeps loading and its stylesheet starts answering 404, which looks like a bug in the CSS.\n\n` +
      `  · to check the types instead:  npm run typecheck\n` +
      `  · to build anyway:             stop the dev server first, or PORT=0 next build\n`,
  }
}
