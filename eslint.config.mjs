// La configuration ESLint, au format plat.
//
// `next lint` n'existe plus en Next 16 : la commande a été retirée et `next
// build` ne lint plus. ESLint est donc appelé directement, et son greffon Next
// se déclare maintenant au format plat — celui qu'ESLint 10 sera seul à lire.
//
// Les mêmes règles qu'avant : `next/core-web-vitals`, ni plus ni moins. Ce
// fichier change la façon de les déclarer, pas ce qu'elles disent.
import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals"),
]

export default config
