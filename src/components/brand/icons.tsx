// Les marques, dessinées plutôt qu'approchées.
//
// La page de téléchargement affichait la pomme d'une bibliothèque d'icônes
// générique — un contour qui ressemble à une cerise — et, pour Windows, un
// écran surmonté d'une flèche. Aucun des deux ne dit « ce paquet est pour cette
// machine-là », et c'est la seule chose que ces deux glyphes ont à faire.
//
// Les vraies marques sont ici en chemins pleins : c'est ce qu'un bouton de
// téléchargement montre partout ailleurs, et c'est reconnaissable à seize
// pixels, ce qu'un contour n'est pas.

type IconProps = { className?: string }

export function AppleMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.62c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.93 1.16 9.2.77 1.11 1.68 2.35 2.88 2.31 1.16-.05 1.6-.75 3-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.24.88-1.28 1.24-2.53 1.26-2.59-.03-.01-2.41-.93-2.44-3.67zM14.1 5.9c.64-.78 1.07-1.85.95-2.93-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.84 1.03.08 2.08-.52 2.71-1.29z" />
    </svg>
  )
}

export function WindowsMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      {/* Les quatre carreaux, avec la fuite que la marque a vraiment : les
          colonnes de gauche sont un peu plus basses que celles de droite.
          
          Descendu de 1,33 et ramené à 0,95 : mesuré dans le moteur de rendu
          plutôt qu'ajusté à l'œil. Brut, ce glyphe occupe 1,75 → 20,90, centre
          11,33 ; la pomme occupe 2,97 → 21,21, centre 12,09. Ce sont les
          centres optiques qui doivent coïncider, pas les boîtes, et une
          approximation se voit tout de suite quand les deux sont côte à côte
          dans un bouton. */}
      <g transform="translate(0.3 1.33) scale(0.95)">
        <path d="M3 5.6l7.4-1.02v7.15H3V5.6zm0 12.8l7.4 1.02v-7.06H3v6.04zm8.25 1.14L21 20.9V12.5h-9.75v7.04zM11.25 3.1v7.47H21V1.75l-9.75 1.35z" />
      </g>
    </svg>
  )
}

export function GithubMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1.7a10.3 10.3 0 00-3.26 20.07c.52.1.71-.22.71-.5v-1.9c-2.87.63-3.48-1.22-3.48-1.22-.47-1.2-1.15-1.52-1.15-1.52-.94-.64.07-.63.07-.63 1.04.08 1.58 1.07 1.58 1.07.92 1.58 2.42 1.12 3.01.86.1-.67.36-1.13.66-1.39-2.29-.26-4.7-1.15-4.7-5.11 0-1.13.4-2.05 1.07-2.78-.11-.26-.46-1.31.1-2.73 0 0 .87-.28 2.85 1.06a9.9 9.9 0 015.2 0c1.97-1.34 2.84-1.06 2.84-1.06.57 1.42.21 2.47.11 2.73.67.73 1.07 1.65 1.07 2.78 0 3.97-2.42 4.85-4.72 5.1.37.32.7.95.7 1.92v2.85c0 .28.19.61.72.5A10.3 10.3 0 0012 1.7z" />
    </svg>
  )
}

// ---- les fournisseurs qui n'avaient qu'une lettre dans un rond ----------
//
// Une initiale grise dans un cercle, c'est ce qu'on affiche quand on n'a rien à
// afficher, et ça se voyait. Ces marques-ci ne copient aucun logo : elles
// disent ce que le fournisseur *est*, avec le dégradé de la maison pour qu'on
// voie qu'elles ont été voulues.

export function LMStudioMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="zy-lms" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C7CFF" />
          <stop offset="100%" stopColor="#4B31D6" />
        </linearGradient>
      </defs>
      {/* Un potentiomètre : un modèle qu'on charge et qu'on règle soi-même. */}
      <rect x="3" y="3.5" width="18" height="17" rx="4.5" fill="url(#zy-lms)" />
      <path d="M8 8.5v7M12 8.5v7M16 8.5v7" stroke="#0B0B0F" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <circle cx="8" cy="13.5" r="2" fill="#F7F7FF" />
      <circle cx="12" cy="10" r="2" fill="#F7F7FF" />
      <circle cx="16" cy="12.5" r="2" fill="#F7F7FF" />
    </svg>
  )
}

export function EndpointMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="zy-endpoint" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5EE7FF" />
          <stop offset="100%" stopColor="#5B5BFF" />
        </linearGradient>
      </defs>
      {/* Une machine avec une adresse : deux baies et le voyant qui dit qu'il y
          a quelqu'un au bout. */}
      <rect x="3" y="4" width="18" height="7" rx="2.4" fill="url(#zy-endpoint)" />
      <rect x="3" y="13" width="18" height="7" rx="2.4" fill="url(#zy-endpoint)" opacity="0.55" />
      <circle cx="7" cy="7.5" r="1.15" fill="#0B0B0F" />
      <circle cx="7" cy="16.5" r="1.15" fill="#0B0B0F" />
      <path d="M11 7.5h6.5M11 16.5h6.5" stroke="#0B0B0F" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

export function ImageEndpointMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="zy-imgep" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8ADE" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Un cadre et ce qui pousse dedans : une image fabriquée, pas une photo
          rangée. */}
      <rect x="3" y="4" width="18" height="16" rx="4" fill="url(#zy-imgep)" />
      <circle cx="9" cy="9.5" r="1.8" fill="#FFF6FC" opacity="0.95" />
      <path d="M4.5 17.5l4.2-4.6 3.1 3.2 3-3.3 4.7 4.7" stroke="#1A0B24" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

export function FluxMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="zy-flux" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1C1C22" />
          <stop offset="100%" stopColor="#3A3A46" />
        </linearGradient>
      </defs>
      {/* Le flux : un champ qui se réordonne, ce que fait un modèle de
          diffusion, en noir de forêt. */}
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#zy-flux)" />
      <path
        d="M6 16.5c2.2-5.4 4.4-8.1 6.6-8.1 1.7 0 2.9 1.3 3.6 3.9"
        stroke="#F4F4F8"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M6 12.2c1.5-3.4 3-5.1 4.4-5.1" stroke="#F4F4F8" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.55" />
      <circle cx="17" cy="15.4" r="1.5" fill="#F4F4F8" />
    </svg>
  )
}

export function CliMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="3.5" fill="#15151C" stroke="#2E2E3A" strokeWidth="1" />
      <path d="M6.5 9.5l3 2.6-3 2.6" stroke="#8B8BFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15.2h5.5" stroke="#8B8BFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}
