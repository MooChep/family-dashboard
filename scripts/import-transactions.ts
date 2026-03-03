/**
 * Script d'import de transactions depuis un CSV Excel exporté
 *
 * Usage :
 *   npx ts-node scripts/import-transactions.ts
 *   npx ts-node scripts/import-transactions.ts --file ./data/export.csv --month 2025-09
 *   npx ts-node scripts/import-transactions.ts --dry-run
 *
 * Si --file ou --month sont absents, le script les demande interactivement.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Helpers readline ─────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

function askWithDefault(question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}] `, (answer) => {
      resolve(answer.trim() || defaultValue)
    })
  })
}

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (o/N) `, (answer) => {
      resolve(answer.trim().toLowerCase() === 'o')
    })
  })
}

// ─── Parsing des arguments CLI ────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

// ─── Helpers parsing ──────────────────────────────────────────────────────────

// "1 230,72 €" → 1230.72
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
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function generateId(): string {
  return 'c' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

// ─── Validation du chemin fichier ─────────────────────────────────────────────

function validateFilePath(filePath: string): string | null {
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) return `Fichier introuvable : ${resolved}`
  if (!filePath.toLowerCase().endsWith('.csv')) return 'Le fichier doit être un .csv'
  return null
}

// ─── Validation du mois ───────────────────────────────────────────────────────

function validateMonth(m: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(m)) return 'Format attendu : YYYY-MM (ex: 2025-09)'
  const [y, mo] = m.split('-').map(Number)
  if (mo < 1 || mo > 12) return 'Mois invalide (01–12)'
  if (y < 2000 || y > 2100) return 'Année invalide'
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   Import transactions — Family Dashboard  ║')
  console.log('╚══════════════════════════════════════════╝')
  if (dryRun) console.log('\n🔍  Mode dry-run activé — aucune écriture en BDD')
  console.log()

  // ── 1. Chemin du fichier ────────────────────────────────────────────────────
  let csvPath = getArg('--file')

  if (!csvPath) {
    while (true) {
      csvPath = await ask('📂  Chemin du fichier CSV : ')
      const err = validateFilePath(csvPath)
      if (!err) break
      console.error('   ❌ ', err)
    }
  } else {
    const err = validateFilePath(csvPath)
    if (err) {
      console.error('❌ ', err)
      rl.close()
      process.exit(1)
    }
    console.log('📂  Fichier :', csvPath)
  }

  // ── 2. Mois cible ───────────────────────────────────────────────────────────
  let monthArg = getArg('--month')
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!monthArg) {
    while (true) {
      monthArg = await askWithDefault('📅  Mois cible (YYYY-MM) : ', currentMonth)
      const err = validateMonth(monthArg)
      if (!err) break
      console.error('   ❌ ', err)
    }
  } else {
    const err = validateMonth(monthArg)
    if (err) {
      console.error('❌  --month :', err)
      rl.close()
      process.exit(1)
    }
    console.log('📅  Mois :', monthArg)
  }

  const [year, month] = monthArg.split('-').map(Number)
  const monthDate = new Date(Date.UTC(year, month - 1, 1))

  // ── 3. Lecture et parsing du CSV ────────────────────────────────────────────
  console.log()
  const raw = fs.readFileSync(path.resolve(csvPath), 'utf-8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '')

  if (lines.length < 2) {
    console.error('❌  Fichier vide ou sans données')
    rl.close()
    process.exit(1)
  }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(normalizeHeader)

  const idxCategory = headers.findIndex((h) => h.startsWith('cat'))
  const idxAmount   = headers.findIndex((h) => h.startsWith('mont'))
  const idxDetail   = headers.findIndex((h) => h === 'details' || h === 'detail')
  const idxPointed  = headers.findIndex((h) => h.startsWith('point'))
  const hasPointed  = idxPointed !== -1

  if (idxCategory === -1) { console.error('❌  Colonne "Catégorie" introuvable'); rl.close(); process.exit(1) }
  if (idxAmount   === -1) { console.error('❌  Colonne "Montant" introuvable');   rl.close(); process.exit(1) }

  console.log('📋  Colonnes détectées :')
  console.log('    Catégorie →', rawHeaders[idxCategory])
  console.log('    Montant   →', rawHeaders[idxAmount])
  console.log('    Détail    →', idxDetail !== -1 ? rawHeaders[idxDetail] : '(absente)')
  console.log('    Pointage  →', hasPointed ? rawHeaders[idxPointed] : '(absent → tout à true)')
  console.log()

  // ── 4. Chargement des catégories BDD ───────────────────────────────────────
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]))

  // ── 5. Parsing des lignes ───────────────────────────────────────────────────
  interface RowToInsert {
    categoryId:   string
    categoryName: string
    amount:       number
    detail:       string | null
    pointed:      boolean
  }

  const toInsert: RowToInsert[] = []
  let skippedEmpty  = 0
  let skippedNoCat  = 0
  let skippedBadAmt = 0
  const unknownCategories = new Set<string>()

  for (const line of lines.slice(1)) {
    const cols        = parseCSVLine(line)
    const rawCategory = cols[idxCategory]?.trim() ?? ''
    const rawAmount   = cols[idxAmount]?.trim()   ?? ''
    const rawDetail   = idxDetail !== -1 ? (cols[idxDetail]?.trim() || null) : null
    const rawPointed  = hasPointed ? cols[idxPointed]?.trim() : undefined

    if (!rawCategory && !rawAmount) { skippedEmpty++; continue }

    if (!rawCategory) {
      console.warn('  ⚠️  Catégorie vide — ligne ignorée')
      skippedNoCat++
      continue
    }

    const amount = parseAmount(rawAmount)
    if (amount === null) {
      console.warn(`  ⚠️  Montant invalide "${rawAmount}" (${rawCategory}) — ignorée`)
      skippedBadAmt++
      continue
    }

    const category = categoryMap.get(rawCategory.toLowerCase().trim())
    if (!category) {
      unknownCategories.add(rawCategory)
      skippedNoCat++
      continue
    }

    toInsert.push({
      categoryId:   category.id,
      categoryName: category.name,
      amount,
      detail:       rawDetail,
      pointed:      parsePointed(rawPointed, hasPointed),
    })
  }

  // ── 6. Résumé ───────────────────────────────────────────────────────────────
  console.log('📊  Résumé d\'analyse :')
  console.log('    ✅  À importer              :', toInsert.length)
  console.log('    ⏭️   Lignes vides Excel      :', skippedEmpty)
  console.log('    ⚠️   Catégories vides/inconnues :', skippedNoCat)
  console.log('    ⚠️   Montants invalides      :', skippedBadAmt)

  if (unknownCategories.size > 0) {
    console.log('\n  ⚠️  Catégories inconnues en BDD (lignes ignorées) :')
    for (const cat of unknownCategories) {
      console.log(`      - "${cat}"`)
    }
    console.log('  → Crée-les dans l\'interface puis relance le script.')
  }

  if (toInsert.length === 0) {
    console.log('\n⚠️  Rien à importer.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  // ── 7. Aperçu ───────────────────────────────────────────────────────────────
  console.log('\n📝  Aperçu (5 premières) :')
  for (const row of toInsert.slice(0, 5)) {
    const p   = row.pointed ? '✓' : ' '
    const cat = row.categoryName.padEnd(22)
    const amt = row.amount.toFixed(2).padStart(10)
    console.log(`    [${p}] ${cat} ${amt} €  ${row.detail ?? ''}`)
  }
  if (toInsert.length > 5) console.log(`    ... et ${toInsert.length - 5} autre(s)`)

  if (dryRun) {
    console.log('\n🔍  Dry-run — aucune écriture effectuée.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  // ── 8. Confirmation ─────────────────────────────────────────────────────────
  console.log()
  const ok = await confirm(`⚠️   Insérer ${toInsert.length} transaction(s) pour ${monthArg} ?`)
  if (!ok) {
    console.log('Annulé.')
    rl.close()
    await prisma.$disconnect()
    return
  }

  // ── 9. Insertion ─────────────────────────────────────────────────────────────
  console.log('\n⏳  Import en cours...')
  let inserted = 0
  let errors   = 0

  for (const row of toInsert) {
    try {
      await prisma.transaction.create({
        data: {
          id:         generateId(),
          month:      monthDate,
          amount:     row.amount,
          detail:     row.detail,
          tags:       '[]',
          pointed:    row.pointed,
          categoryId: row.categoryId,
        },
      })
      inserted++
    } catch (err) {
      console.error(`  ❌  Erreur (${row.categoryName} / ${row.amount}) :`, err)
      errors++
    }
  }

  console.log('\n✅  Import terminé :')
  console.log('    Insérées :', inserted)
  if (errors > 0) console.log('    Erreurs  :', errors)

  rl.close()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  rl.close()
  prisma.$disconnect().catch(() => null)
  process.exit(1)
})