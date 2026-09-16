import { NextRequest, NextResponse } from "next/server"

// Une Content-Security-Policy à nonce.
//
// La politique permissive — `script-src 'unsafe-inline'` — était écartée
// d'avance : elle coche la case sans rien arrêter, puisque c'est exactement
// l'injection de script en ligne qu'on cherche à empêcher. Et une politique
// stricte sans nonce casse Next, qui met ses propres scripts en ligne dans
// chaque page. Le nonce est la sortie : un jeton tiré à chaque requête, que
// Next appose sur ses scripts à lui, et que l'attaquant ne peut pas deviner
// puisqu'il n'a pas encore été tiré quand il écrit sa charge.
//
// Le prix est réel : une page qui porte un nonce ne peut pas être servie
// depuis le cache statique, elle est rendue à la demande. On l'assume, ce
// sont pour l'essentiel des pages derrière une session.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  // Là où le front parle vraiment : lui-même, et l'API. Écrit depuis la même
  // variable que le client, pour qu'un changement d'adresse ne laisse pas la
  // politique derrière.
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4102"

  const policy = [
    `default-src 'self'`,
    // 'strict-dynamic' laisse les scripts chargés *par* un script de confiance
    // hériter de cette confiance : c'est ce qui fait marcher le découpage en
    // morceaux de Next sans énumérer chaque fichier. En développement,
    // Fast Refresh compile à la volée et demande eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""}`.trim(),
    // Les styles en ligne restent autorisés : React écrit les `style={{…}}`
    // en attribut, et react-flow positionne tout le canevas comme ça. Le
    // risque qu'on garde est l'exfiltration par CSS, sans commune mesure avec
    // celui d'un script.
    `style-src 'self' 'unsafe-inline'`,
    // L'API est nommée en propre et pas laissée au `https:` qui suit : elle
    // sert les médias produits par les exécutions, et s'en remettre au schéma
    // marchait en production par accident tout en cassant toute installation
    // en http — un poste de développement, un auto-hébergement. Vérifié : sans
    // elle, les vignettes d'`/explore` sont refusées alors que le serveur
    // répond 200. Le `https:` large reste pour les images qu'un fournisseur
    // rend chez lui, dont on ne connaît pas la liste à l'avance. blob: pour
    // les aperçus construits dans la page, data: pour ce qui arrive encodé.
    `img-src 'self' data: blob: https: ${api}`,
    `font-src 'self'`,
    `connect-src 'self' ${api}`,
    `media-src 'self' data: blob: ${api}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // Pas d'`upgrade-insecure-requests` : HSTS le fait déjà au niveau de
    // nginx, et ici ça réécrirait l'API locale en https pour rien.
  ].join("; ")

  // Next lit le nonce dans l'en-tête de la *requête* et l'appose lui-même sur
  // ses balises script. Il faut donc le lui repasser en entrée, pas seulement
  // le poser en sortie.
  const headers = new Headers(request.headers)
  headers.set("content-security-policy", policy)

  const response = NextResponse.next({ request: { headers } })
  response.headers.set("content-security-policy", policy)
  return response
}

export const config = {
  matcher: [
    // Les fichiers déjà construits et les images n'exécutent rien et n'ont pas
    // besoin d'un nonce ; les exclure leur rend le cache statique.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
