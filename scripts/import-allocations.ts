/**
 * scripts/import-allocations.ts
 * Import de pourcentages d'épargne depuis un CSV exporté
 *
 * Format CSV attendu (colonnes dans n'importe quel ordre) :
 *   Catégorie,Actuel,Objectif,Pourcentage
 *   Maison,8787.01,30000,45%
 *   Mariage,10619.35,15000,45%
 *
 * Usage :
 *   npx ts-node scripts/import-allocations.ts
 *   npx ts-node scripts/import-allocations.ts --file ./data/allocations.csv --month 2025-01
 *   npx ts-node scripts/import-allocations.ts --dry-run
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(q: string): Promise<string> {
  return new Promise((r) => rl.question(q, (a) => r(a.trim())))
}
function askDefault(q: string, d: string): Promise<string> {
  return new Promise((r) => rl.question(`${q} [${d}] `, (a) => r(a.trim() || d)))
}
const autoYes = process.argv.includes('--yes') || process.argv.includes('-y')

function confirm(q: string): Promise<boolean> {
  if (autoYes) { console.log(`${q} → oui (--yes)`); return Promise.resolve(true) }
  return new Promise((r) => rl.question(`${q} (o/N) `, (a) => r(a.trim().toLowerCase() === 'o')))
}
function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
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

// Parse un pourcentage : "45%", "45", "0,45" → 45
function parsePercentage(raw: string): number | null {
  const cleaned = raw.replace('%', '').replace(',', '.').trim()
  const val = parseFloat(cleaned)
  if (isNaN(val)) return null
  // Si valeur entre 0 et 1 → convertir en %
  if (val > 0 && val <= 1) return Math.round(val * 100)
  if (val < 0 || val > 100) return null
  return val
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  process.stdout.write('\n')  // flush
  console.log('=============================================')
  console.log('  Import allocations — Family Dashboard')
  console.log('=============================================')
  if (dryRun) console.log('🔍 Mode dry-run — aucune écriture en BDD')
  console.log()

  // ── Fichier ────────────────────────────────────────────────────────────────
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

  // ── Mois ───────────────────────────────────────────────────────────────────
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

  // ── Lecture CSV ────────────────────────────────────────────────────────────
  const raw = fs.readFileSync(path.resolve(csvPath), 'utf-8')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) { console.error('❌ Fichier vide'); rl.close(); process.exit(1) }

  const rawHeaders = parseCSVLine(lines[0])
  const headers    = rawHeaders.map(normalizeHeader)

  // Détection colonnes — flexible sur les noms
  const idxName    = headers.findIndex((h) => h.startsWith('cat') || h === 'projet' || h === 'nom')
  const idxPercent = headers.findIndex((h) => h.startsWith('pourcent') || h === 'percent' || h === 'p')

  if (idxName    === -1) { console.error('❌ Colonne projet/catégorie introuvable (attendu: Catégorie, Projet ou Nom)'); rl.close(); process.exit(1) }
  if (idxPercent === -1) { console.error('❌ Colonne pourcentage introuvable (attendu: Pourcentage ou Percent)'); rl.close(); process.exit(1) }

  console.log('📋 Colonnes détectées :')
  console.log('   Projet      →', rawHeaders[idxName])
  console.log('   Pourcentage →', rawHeaders[idxPercent])
  console.log()

  // ── Projets en BDD ─────────────────────────────────────────────────────────
  const projets = await prisma.savingsProject.findMany({ where: { isActive: true } })
  console.log('\n   Projets actifs en BDD :')
  for (const p of projets) console.log('     -', JSON.stringify(p.name))
  console.log()

  function normalizeProjectName(n: string): string {
    return n.toLowerCase().trim().replace(/['''\-]/g, ' ').replace(/\s+/g, ' ')
  }
  const projetMap = new Map(projets.map((p) => [normalizeProjectName(p.name), p]))

  // ── Parsing lignes ─────────────────────────────────────────────────────────
  interface RowToInsert {
    projectId: string
    projectName: string
    percentage: number
  }

  const toInsert: RowToInsert[] = []
  let skippedEmpty = 0, skippedNoProject = 0, skippedZero = 0
  const unknownProjects = new Set<string>()

  for (const line of lines.slice(1)) {
    const cols       = parseCSVLine(line)
    const rawName    = cols[idxName]?.trim()    ?? ''
    const rawPercent = cols[idxPercent]?.trim() ?? ''

    if (!rawName && !rawPercent) { skippedEmpty++; continue }
    if (!rawName) { skippedNoProject++; continue }

    const percentage = parsePercentage(rawPercent)
    if (percentage === null) {
      console.warn(`   ⚠️  Pourcentage invalide pour "${rawName}" : "${rawPercent}" — ligne ignorée`)
      skippedNoProject++
      continue
    }
    if (percentage === 0) { skippedZero++; continue }  // 0% → pas d'allocation à créer

    const projet = projetMap.get(normalizeProjectName(rawName))
    if (!projet) {
      unknownProjects.add(rawName)
      skippedNoProject++
      continue
    }

    toInsert.push({ projectId: projet.id, projectName: projet.name, percentage })
  }

  // ── Résumé parsing ─────────────────────────────────────────────────────────
  console.log('📊 Analyse :')
  console.log('   ✅ À importer              :', toInsert.length)
  console.log('   ⏭️  Lignes vides            :', skippedEmpty)
  console.log('   ⏭️  Pourcentage 0% (ignorés):', skippedZero)
  console.log('   ⚠️  Projets inconnus/invalides:', skippedNoProject)

  if (unknownProjects.size > 0) {
    console.log('\n   ⚠️  Projets inconnus en BDD (lignes ignorées) :')
    for (const name of unknownProjects) console.log(`      - "${name}"`)
    console.log('   → Vérifie les noms dans l\'interface (Catégories → Projets d\'épargne).')
  }

  const totalPercent = toInsert.reduce((s, r) => s + r.percentage, 0)
  if (totalPercent !== 100) {
    console.log(`\n   ⚠️  Total pourcentages : ${totalPercent}% (attendu 100%)`)
  } else {
    console.log(`\n   ✅ Total pourcentages : ${totalPercent}%`)
  }

  if (toInsert.length === 0) {
    console.log('\n⚠️  Rien à importer.')
    rl.close(); await prisma.$disconnect(); return
  }

  // ── Aperçu ─────────────────────────────────────────────────────────────────
  console.log('\n📝 Aperçu :')
  for (const row of toInsert) {
    console.log(`   ${row.projectName.padEnd(25)} ${String(row.percentage).padStart(3)}%`)
  }

  if (dryRun) {
    console.log('\n🔍 Dry-run — aucune écriture.')
    rl.close(); await prisma.$disconnect(); return
  }

  // ── Vérifier allocations existantes ────────────────────────────────────────
  const existing = await prisma.savingsAllocation.findMany({
    where: { month: monthDate },
    include: { project: true },
  })

  if (existing.length > 0) {
    console.log(`\n⚠️  Des allocations existent déjà pour ${monthArg} :`)
    for (const a of existing) {
      console.log(`   - ${a.project.name.padEnd(25)} ${String(a.percentage).padStart(3)}%`)
    }
    console.log()
    const ok = await confirm(`Écraser les ${existing.length} allocation(s) existante(s) pour ${monthArg} ?`)
    if (!ok) {
      console.log('Annulé.')
      rl.close(); await prisma.$disconnect(); return
    }
    // Supprime les existantes
    await prisma.savingsAllocation.deleteMany({ where: { month: monthDate } })
    console.log(`   🗑  ${existing.length} allocation(s) supprimée(s)`)
  } else {
    const ok = await confirm(`⚠️  Importer ${toInsert.length} allocation(s) pour ${monthArg} ?`)
    if (!ok) {
      console.log('Annulé.')
      rl.close(); await prisma.$disconnect(); return
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  // Calcul du reste (revenus - dépenses) pour ce mois afin de calculer les montants
  const transactions = await prisma.transaction.findMany({
    where: { month: monthDate },
    include: { category: true },
  })
  const revenus   = transactions.filter((t) => t.category.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const depenses  = transactions.filter((t) => t.category.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const reste     = revenus - depenses

  console.log(`\n   💰 Reste calculé : ${reste.toFixed(2)} € (revenus ${revenus.toFixed(2)} − dépenses ${depenses.toFixed(2)})`)
  console.log('\n⏳ Import en cours...')

  let inserted = 0, errors = 0

  for (const row of toInsert) {
    try {
      const amount = reste * (row.percentage / 100)
      await prisma.savingsAllocation.create({
        data: {
          month:      monthDate,
          percentage: row.percentage,
          amount,
          projectId:  row.projectId,
        },
      })
      // Recalcule le currentAmount du projet
      const allAllocs = await prisma.savingsAllocation.findMany({
        where: { projectId: row.projectId },
      })
      const total = allAllocs.reduce((s, a) => s + a.amount, 0)
      await prisma.savingsProject.update({
        where: { id: row.projectId },
        data: { currentAmount: total },
      })
      inserted++
    } catch (err) {
      console.error(`   ❌ Erreur (${row.projectName}) :`, err)
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