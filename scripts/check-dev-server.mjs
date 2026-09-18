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
// C'est arrivé trois fois. La troisième parce que ce garde vivait uniquement
// ici : `npx next build` ne passe pas par npm, donc personne ne l'appelait. La
// décision est dans `next.config.js` maintenant, que Next charge quoi qu'on
// tape ; ce script reste le point d'entrée en ligne de commande, et il garde
// une raison d'être qui n'est pas cosmétique — `build:prod` fait
// `rm -rf .next` AVANT d'appeler `next build`, donc un garde qui n'existerait
// que dans la configuration arriverait après la suppression.
//
//     node scripts/check-dev-server.mjs
import { devServerVerdict } from "./dev-server-verdict.mjs"

const verdict = await devServerVerdict()
if (verdict.message) console.log(verdict.message)
process.exit(verdict.blocking ? 1 : 0)
