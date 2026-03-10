import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('🚀 Seeding themes with CSS variables...')

  // --- CONFIGURATION THÈME DARK ---
  const darkVars = {
    bg: '#0a0c12',
    surface: '#111318',
    surface2: '#1a1d27',
    border: '#1f2235',
    border2: '#2a2f4a',
    accent: '#6c63ff',
    'accent-dim': '#6c63ff22',
    text: '#e8e8f0',
    text2: '#c4c4d4',
    muted: '#555870',
    muted2: '#7a7d9a',
    success: '#43e8b0',
    warning: '#f9c74f',
    danger: '#f87171',
    'font-display': "'Syne', sans-serif",
    'font-body': "'Syne', sans-serif",
    'font-mono': "'DM Mono', monospace"
  }

  // --- CONFIGURATION THÈME LIGHT ---
  const lightVars = {
    bg: '#f5f3ef',
    surface: '#ffffff',
    surface2: '#faf8f5',
    border: '#e4dfd6',
    border2: '#d4cec4',
    accent: '#2d4a3e',
    'accent-dim': '#2d4a3e18',
    text: '#1a1a18',
    text2: '#3d3d38',
    muted: '#8c8880',
    muted2: '#b0aba3',
    success: '#3a7d5c',
    warning: '#c9a84c',
    danger: '#c9623f',
    'font-display': "'Playfair Display', serif",
    'font-body': "'DM Sans', sans-serif",
    'font-mono': "'DM Mono', monospace"
  }

  // Upsert Dark
  await prisma.theme.upsert({
    where: { name: 'dark' },
    update: {
      label: 'Sombre',
      isDefault: true,
      cssVars: JSON.stringify(darkVars),
    },
    create: {
      name: 'dark',
      label: 'Sombre',
      isDefault: true,
      cssVars: JSON.stringify(darkVars),
    },
  })

  // Upsert Light
  await prisma.theme.upsert({
    where: { name: 'light' },
    update: {
      label: 'Clair',
      isDefault: false,
      cssVars: JSON.stringify(lightVars),
    },
    create: {
      name: 'light',
      label: 'Clair',
      isDefault: false,
      cssVars: JSON.stringify(lightVars),
    },
  })

  console.log('✅ Themes seeded with success: dark, light')
}

main()
  .catch((e) => {
    console.error('❌ Error during theme seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })