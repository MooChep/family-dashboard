import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // App Router est actif par défaut en Next.js 14
  // On désactive le strict mode React en prod pour éviter les double-renders en dev
  reactStrictMode: true,

  // On autorise uniquement les images locales pour l'instant
  images: {
    remotePatterns: [],
  },
}

export default nextConfig