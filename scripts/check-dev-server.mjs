// Refuser de construire pendant qu'un serveur de développement sert le même
// dossier.
//
// `next build` et `next dev` écrivent tous les deux dans `.next`. Lancer le
// premier pendant que le second tourne lui retire ses fichiers sous les pieds :
// le serveur continue de répondre, il sert la page, et la feuille de style
// qu'elle réclame répond 404. On ne s'en aperçoit pas tout de suite, parce que
// le navigateur qu'on a sous les yeux a l'ancienne en cache — et on cherche le
// bug dans son code pendant que c'est la commande d'à côté qui l'a cassé.
//
// C'est arrivé deux fois dans la même journée. La seconde a coûté le temps de
// comprendre que la première n'était pas un hasard.
//
//     node scripts/check-dev-server.mjs
import { createConnection } from "node:net"

const PORT = Number(process.env.PORT || 4101)

const listening = await new Promise((resolve) => {
  const socket = createConnection({ port: PORT, host: "127.0.0.1" })
  const answer = (value) => {
    socket.destroy()
    resolve(value)
  }
  socket.setTimeout(400)
  socket.on("connect", () => answer(true))
  socket.on("timeout", () => answer(false))
  socket.on("error", () => answer(false))
})

if (!listening) process.exit(0)

console.log(
  `A dev server is listening on ${PORT}. Building now would delete the files it is serving:\n` +
    `the page keeps loading and its stylesheet starts answering 404, which looks like a bug in the CSS.\n\n` +
    `  · to check the types instead:  npm run typecheck\n` +
    `  · to build anyway:             stop the dev server first, or PORT=0 npm run build\n`
)
process.exit(1)
