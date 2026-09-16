/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js annonce sa présence dans un en-tête par défaut. Ça ne protège de
  // rien de le cacher, mais ça ne sert à rien de l'annoncer non plus : c'est
  // la première chose qu'un scanner lit pour choisir quoi essayer.
  poweredByHeader: false,
  reactStrictMode: true,

  // Explore et la boutique listaient la même chose sous deux noms. Il n'en
  // reste qu'une, et l'ancienne adresse redirige plutôt que de renvoyer 404 :
  // elle a été en ligne, elle est dans des favoris et dans l'historique.
  // Permanente parce qu'elle ne reviendra pas.
  async redirects() {
    return [{ source: "/explore", destination: "/store?tab=workflows", permanent: true }]
  },
}

module.exports = nextConfig
