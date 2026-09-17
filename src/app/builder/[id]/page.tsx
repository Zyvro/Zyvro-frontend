import Builder from "@/components/Builder"

// Cette page est rendue côté serveur, et c'est ce qui a changé ici.
//
// Depuis Next 15, les paramètres d'une route arrivent en promesse : la page
// commence à se rendre avant que le routeur les ait résolus. Les attendre
// demande une fonction asynchrone, et un composant client ne peut pas en être
// une — React 18 n'a pas `use()` pour défaire une promesse dans le rendu.
//
// Le `"use client"` qui était ici ne servait à rien de toute façon : cette page
// ne fait que passer l'identifiant à `Builder`, qui porte le sien. Il est
// retiré, la page redevient un composant serveur, et l'attente est possible.
export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  return <Builder params={await params} />
}