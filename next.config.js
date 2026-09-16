/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js annonce sa présence dans un en-tête par défaut. Ça ne protège de
  // rien de le cacher, mais ça ne sert à rien de l'annoncer non plus : c'est
  // la première chose qu'un scanner lit pour choisir quoi essayer.
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig
