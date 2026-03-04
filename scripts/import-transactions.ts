/**
 * scripts/import-transactions.ts
 * Import de transactions depuis un CSV Excel exporté
 *
 * Usage :
 *   npx ts-node scripts/import-transactions.ts
 *   npx ts-node scripts/import-transactions.ts --file ./data/export.csv --month 2025-09
 *   npx ts-node scripts/import-transactions.ts --dry-run
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { PrismaClient } from '@prisma/client'
import { resolveTags, normalizeTag } from '../src/lib/tags'

const prisma = new PrismaClient()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(q: string): Promise<string> {
  return new Promise((r) => rl.question(q, (a) => r(a.trim())))
}
function askDefault(q: string, d: string): Promise<string> {
  return new Promise((r) => rl.question(`${q} [${d}] `, (a) => r(a.trim() || d)))
}
function confirm(q: string): Promise<boolean> {
  return new Promise((r) => rl.question(`${q} (o/N) `, (a) => r(a.trim().toLowerCase() === 'o')))
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

// ─── Mapping catégories CSV → BDD ─────────────────────────────────────────────
// Clé : nom exact dans le CSV (insensible à la casse)
// Valeur : nom exact dans la BDD

const CATEGORY_ALIASES: Record<string, string> = {
  'voiture': 'Transports',
  // Ajouter d'autres mappings ici si besoin
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[€\s\u00a0]/g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) || val <= 0 ? null : val
}

function parsePointed(raw: string | undefined, hasColumn: boolean): boolean {
  if (!hasColumn) return true
  if (!raw || raw.trim() === '') return true
  return raw.trim().toUpperCase() === 'TRUE'
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

// Mots à exclure des tags
const STOP_WORDS = new Set(['le','la','les','de','du','des','et','au','aux','un','une','en','a','par','sur','sous'])

// Convertit un détail en tags normalisés : "salaire ilan" → ["salaire", "ilan"]
function detailToTags(detail: string): string[] {
  return detail
    .split(/[\s+,;/]+/)
    .map((w) => normalizeTag(w))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
}

function generateId(): string {
  return 'c' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

function validateFilePath(p: string): string | null {
  if (!fs.existsSync(path.resolve(p))) return `Fichier introuvable : ${path.resolve(p)}`
  if (!p.toLowerCase().endsWith('.csv')) return 'Le fichier doit être un .csv'
  return null
}

function validateMonth(m: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(m)) return 'Format attendu : YYYY-MM (ex: 2025-09)'
  const [, mo] = m.split('-').map(Number)
  if (mo < 1 || mo > 12) return 'Mois invalide (01-12)'
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  console.log('\n==========================================')
  console.log('  Import transactions — Family Dashboard')
  console.log('==========================================')
  if (dryRun) console.log('🔍 Mode dry-run — aucune écriture en BDD')
  console.log()

  // Chemin du fichier
  let csvPath = getArg('--file')
  if (!csvPath) {
    while (true) {
      csvPath = await ask('📂 Chemin du fichier CSV : ')
      const err = validateFilePath(csvPath)
      if (!err) break
      console.error('   ❌', err)
    }
  } else {
    const err = validateFilePath(csvPath)
    if (err) { console.error('❌', err); rl.close(); process.exit(1) }
    console.log('📂 Fichier :', csvPath)
  }

  // Mois cible
  let monthArg = getArg('--month')
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (!monthArg) {
    while (true) {
      monthArg = await askDefault('📅 Mois cible (YYYY-MM) :', currentMonth)
      const err = validateMonth(monthArg)
      if (!err) break
      console.error('   ❌', err)
    }
  } else {
    const err = validateMonth(monthArg)
    if (err) { console.error('❌ --month :', err); rl.close(); process.exit(1) }
    console.log('📅 Mois :', monthArg)
  }

  const [year, month] = monthArg.split('-').map(Number)
  const monthDate = new Date(Date.UTC(year, month - 1, 1))
  console.log()

  // Lecture CSV
  const raw = fs.readFileSync(path.resolve(csvPath), 'utf-8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) { console.error('❌ Fichier vide'); rl.close(); process.exit(1) }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(normalizeHeader)

  const idxCategory = headers.findIndex((h) => h.startsWith('cat'))
  const idxAmount   = headers.findIndex((h) => h.startsWith('mont'))
  const idxDetail   = headers.findIndex((h) => h === 'details' || h === 'detail')
  const idxPointed  = headers.findIndex((h) => h.startsWith('point'))
  const hasPointed  = idxPointed !== -1

  if (idxCategory === -1) { console.error('❌ Colonne Catégorie introuvable'); rl.close(); process.exit(1) }
  if (idxAmount   === -1) { console.error('❌ Colonne Montant introuvable');   rl.close(); process.exit(1) }

  console.log('📋 Colonnes détectées :')
  console.log('   Catégorie →', rawHeaders[idxCategory])
  console.log('   Montant   →', rawHeaders[idxAmount])
  console.log('   Détail    →', idxDetail !== -1 ? `${rawHeaders[idxDetail]} (→ tags)` : '(absent)')
  console.log('   Pointage  →', hasPointed ? rawHeaders[idxPointed] : '(absent → tout à true)')
  console.log()

  // Catégories BDD
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]))

  // Tags existants en BDD pour la déduplication
  const allTx = await prisma.transaction.findMany({ select: { tags: true } })
  const existingTagsInDb: string[] = []
  for (const tx of allTx) {
    try {
      const parsed = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : []
      for (const t of parsed) { if (t && !existingTagsInDb.includes(t)) existingTagsInDb.push(t) }
    } catch { /* ignore */ }
  }

  // Parsing des lignes
  interface RowToInsert {
    categoryId: string
    categoryName: string
    amount: number
    tags: string[]
    pointed: boolean
  }

  const toInsert: RowToInsert[] = []
  let skippedEmpty = 0, skippedNoCat = 0, skippedBadAmt = 0
  const unknownCategories = new Set<string>()
  const appliedAliases: string[] = []

  for (const line of lines.slice(1)) {
    const cols        = parseCSVLine(line)
    const rawCategory = cols[idxCategory]?.trim() ?? ''
    const rawAmount   = cols[idxAmount]?.trim()   ?? ''
    const rawDetail   = idxDetail !== -1 ? (cols[idxDetail]?.trim() ?? '') : ''
    const rawPointed  = hasPointed ? cols[idxPointed]?.trim() : undefined

    if (!rawCategory && !rawAmount) { skippedEmpty++; continue }
    if (!rawCategory) { skippedNoCat++; continue }

    const amount = parseAmount(rawAmount)
    if (amount === null) { skippedBadAmt++; continue }

    // Résolution du nom de catégorie (alias ou nom direct)
    const aliasTarget = CATEGORY_ALIASES[rawCategory.toLowerCase().trim()]
    const lookupName  = aliasTarget ?? rawCategory

    if (aliasTarget) {
      appliedAliases.push(`"${rawCategory}" → "${aliasTarget}"`)
    }

    const category = categoryMap.get(lookupName.toLowerCase().trim())
    if (!category) {
      unknownCategories.add(rawCategory)
      skippedNoCat++
      continue
    }

    // Tags : détail → mots → normalisation + déduplication Levenshtein
    const rawTags   = rawDetail ? detailToTags(rawDetail) : []
    const resolvedTags = resolveTags(rawTags, existingTagsInDb)

    // Enrichit la liste pour les prochaines lignes du même fichier
    for (const t of resolvedTags) {
      if (!existingTagsInDb.includes(t)) existingTagsInDb.push(t)
    }

    toInsert.push({
      categoryId:   category.id,
      categoryName: category.name,
      amount,
      tags:         resolvedTags,
      pointed:      parsePointed(rawPointed, hasPointed),
    })
  }

  // Résumé
  console.log('📊 Analyse :')
  console.log('   ✅ À importer               :', toInsert.length)
  console.log('   ⏭️  Lignes vides Excel        :', skippedEmpty)
  console.log('   ⚠️  Catégories vides/inconnues :', skippedNoCat)
  console.log('   ⚠️  Montants invalides         :', skippedBadAmt)

  if (appliedAliases.length > 0) {
    console.log('\n   🔀 Mappings catégories appliqués :')
    for (const a of [...new Set(appliedAliases)]) console.log('      -', a)
  }

  if (unknownCategories.size > 0) {
    console.log('\n   ⚠️  Catégories inconnues en BDD (lignes ignorées) :')
    for (const cat of unknownCategories) console.log(`      - "${cat}"`)
    console.log('   → Crée-les dans l\'interface ou ajoute un alias dans CATEGORY_ALIASES.')
  }

  if (toInsert.length === 0) {
    console.log('\n⚠️  Rien à importer.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  // Aperçu
  console.log('\n📝 Aperçu (5 premières) :')
  for (const row of toInsert.slice(0, 5)) {
    const p      = row.pointed ? '✓' : ' '
    const cat    = row.categoryName.padEnd(20)
    const amt    = row.amount.toFixed(2).padStart(10)
    const tagStr = row.tags.length > 0 ? `[${row.tags.join(', ')}]` : ''
    console.log(`   [${p}] ${cat} ${amt} €  ${tagStr}`)
  }
  if (toInsert.length > 5) console.log(`   ... et ${toInsert.length - 5} autre(s)`)

  if (dryRun) {
    console.log('\n🔍 Dry-run — aucune écriture.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  console.log()
  const ok = await confirm(`⚠️  Insérer ${toInsert.length} transaction(s) pour ${monthArg} ?`)
  if (!ok) {
    console.log('Annulé.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  console.log('\n⏳ Import en cours...')
  let inserted = 0, errors = 0

  for (const row of toInsert) {
    try {
      await prisma.transaction.create({
        data: {
          id:         generateId(),
          month:      monthDate,
          amount:     row.amount,
          tags:       JSON.stringify(row.tags),
          pointed:    row.pointed,
          categoryId: row.categoryId,
        },
      })
      inserted++
    } catch (err) {
      console.error(`   ❌ Erreur (${row.categoryName} / ${row.amount}) :`, err)
      errors++
    }
  }

  console.log('\n✅ Import terminé :')
  console.log('   Insérées :', inserted)
  if (errors > 0) console.log('   Erreurs  :', errors)

  rl.close()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  rl.close()
  prisma.$disconnect().catch(() => null)
  process.exit(1)
}) 