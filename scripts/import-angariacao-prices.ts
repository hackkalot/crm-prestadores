/**
 * Script para importar preços de angariação do Excel para Supabase
 * Fonte: data/PreçosAngariação_Tabela Resumo.xlsx
 *
 * Uso:
 *   npx tsx scripts/import-angariacao-prices.ts
 *
 * Requer:
 *   - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 *   - Ficheiro Excel em data/PreçosAngariação_Tabela Resumo.xlsx
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Caminho do ficheiro Excel
const EXCEL_PATH = path.join(process.cwd(), 'data', 'PreçosAngariação_Tabela Resumo.xlsx')

// Mapeamento de colunas do Excel para campos da BD
const COLUMN_MAP = {
  'Serviços': 'service_name',
  'Cluster': 'cluster',
  'Grupo (Sheet onde está)': 'service_group',
  'Taxa de IVA': 'vat_rate',
  'Data de lançamento do serviço': 'launch_date',
  'Qtd./Unid.': 'unit_description',
  'Tipologia': 'typology',
  'Valor s/ IVA': 'price_base',
  'Valor s/ IVA - Novas visitas': 'price_new_visit',
  'Valor s/ IVA - Noites seguintes': 'price_extra_night',
  'Valor s/IVA - por hora sem materiais': 'price_hour_no_materials',
  'Valor s/IVA - por hora com materiais': 'price_hour_with_materials',
  'Valor s/IVA - Limpeza': 'price_cleaning',
  'Valor s/IVA - Limpeza + Tratamentos': 'price_cleaning_treatments',
  'Valor s/IVA - Limpeza + Imper.': 'price_cleaning_imper',
  'Valor s/IVA - Limpeza + imper. + Tratamentos': 'price_cleaning_imper_treatments',
}

/**
 * Parseia taxa de IVA (ex: "23%" -> 23)
 */
function parseVatRate(value: string | number | undefined): number {
  if (value === undefined || value === null) return 23
  if (typeof value === 'number') return value * 100 // Excel pode guardar como 0.23
  const str = String(value).replace('%', '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? 23 : (num < 1 ? num * 100 : num)
}

/**
 * Parseia preço (remove espaços, converte "-" para null)
 */
function parsePrice(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return Math.round(value * 100) / 100
  const str = String(value).trim()
  if (str === '-' || str === '' || str === ' - ') return null
  const num = parseFloat(str.replace(',', '.').replace(/\s/g, ''))
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

/**
 * Parseia data do Excel
 */
function parseDate(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') return null

  // Se for número (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    return null
  }

  // Se for string no formato M/D/YY
  const str = String(value).trim()
  const parts = str.split('/')
  if (parts.length === 3) {
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    let year = parseInt(parts[2])
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

/**
 * Limpa string (remove espaços extras, normaliza "-")
 */
function cleanString(value: string | undefined): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  if (str === '-' || str === '') return null
  return str
}

async function importReferencePrices(): Promise<number> {
  console.log('\n📋 A importar preços de referência (Sheet: DB)...')

  const workbook = XLSX.readFile(EXCEL_PATH)
  const sheet = workbook.Sheets['DB']
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: undefined })

  console.log(`   Encontradas ${rows.length} linhas`)

  // Preparar dados para inserção
  const records: Array<Record<string, unknown>> = []

  for (const row of rows as Array<Record<string, unknown>>) {
    const serviceName = cleanString(row['Serviços'] as string)
    const cluster = cleanString(row['Cluster'] as string)
    const unitDescription = cleanString(row['Qtd./Unid.'] as string)

    // Validar campos obrigatórios
    if (!serviceName || !cluster || !unitDescription) {
      continue
    }

    // Nota: As colunas do Excel têm espaços antes e depois dos nomes
    records.push({
      service_name: serviceName,
      cluster: cluster,
      service_group: cleanString(row['Grupo (Sheet onde está)'] as string),
      unit_description: unitDescription,
      typology: cleanString(row['Tipologia'] as string),
      vat_rate: parseVatRate(row[' Taxa de IVA '] as string),
      launch_date: parseDate(row['Data de lançamento do serviço'] as string | number),
      price_base: parsePrice(row[' Valor s/ IVA '] as string | number),
      price_new_visit: parsePrice(row[' Valor s/ IVA - Novas visitas '] as string | number),
      price_extra_night: parsePrice(row[' Valor s/ IVA - Noites seguintes '] as string | number),
      price_hour_no_materials: parsePrice(row[' Valor s/IVA - por hora sem materiais '] as string | number),
      price_hour_with_materials: parsePrice(row[' Valor s/IVA - por hora com materiais '] as string | number),
      price_cleaning: parsePrice(row[' Valor s/IVA - Limpeza '] as string | number),
      price_cleaning_treatments: parsePrice(row[' Valor s/IVA - Limpeza + Tratamentos '] as string | number),
      price_cleaning_imper: parsePrice(row[' Valor s/IVA - Limpeza + Imper. '] as string | number),
      price_cleaning_imper_treatments: parsePrice(row[' Valor s/IVA - Limpeza + imper. + Tratamentos '] as string | number),
    })
  }

  console.log(`   Preparados ${records.length} registos válidos`)

  // Limpar tabela antes de inserir
  const { error: deleteError } = await supabase
    .from('service_prices')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error('   ⚠️  Erro ao limpar tabela:', deleteError.message)
  }

  // Inserir em batches de 100
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase
      .from('service_prices')
      .insert(batch)

    if (error) {
      console.error(`   ❌ Erro ao inserir batch ${i / batchSize + 1}:`, error.message)
      // Tentar inserir um a um para identificar o problema
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('service_prices')
          .insert(record)
        if (singleError) {
          console.error(`      Falhou: ${record.service_name} | ${record.unit_description}`)
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
    }

    process.stdout.write(`\r   Inseridos: ${inserted}/${records.length}`)
  }

  console.log(`\n   ✅ Importados ${inserted} preços de referência`)
  return inserted
}

async function importMaterials(): Promise<number> {
  console.log('\n🔧 A importar materiais (Sheet: Materiais_Canalizador)...')

  const workbook = XLSX.readFile(EXCEL_PATH)
  const sheet = workbook.Sheets['Materiais_Canalizador']
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: undefined })

  console.log(`   Encontradas ${rows.length} linhas`)

  // Preparar dados para inserção
  const records: Array<Record<string, unknown>> = []

  for (const row of rows as Array<Record<string, unknown>>) {
    const materialName = cleanString(row['Material'] as string)
    const priceWithoutVat = row['Valores s/ IVA'] as number
    const vatRate = row['Taxa de IVA'] as number

    if (!materialName || priceWithoutVat === undefined) {
      continue
    }

    records.push({
      material_name: materialName,
      category: 'Canalizador',
      price_without_vat: Math.round(priceWithoutVat * 100) / 100,
      vat_rate: vatRate ? Math.round(vatRate * 100) : 23,
    })
  }

  console.log(`   Preparados ${records.length} registos válidos`)

  // Limpar tabela antes de inserir
  const { error: deleteError } = await supabase
    .from('material_catalog')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('   ⚠️  Erro ao limpar tabela:', deleteError.message)
  }

  // Inserir todos de uma vez (são poucos)
  const { error, count } = await supabase
    .from('material_catalog')
    .insert(records)
    .select()

  if (error) {
    console.error('   ❌ Erro ao inserir materiais:', error.message)
    return 0
  }

  console.log(`   ✅ Importados ${records.length} materiais`)
  return records.length
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  IMPORTAÇÃO DE PREÇOS DE ANGARIAÇÃO')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`📁 Ficheiro: ${EXCEL_PATH}`)

  try {
    const pricesCount = await importReferencePrices()
    const materialsCount = await importMaterials()

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('  RESUMO')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`   📋 Preços de referência: ${pricesCount}`)
    console.log(`   🔧 Materiais:            ${materialsCount}`)
    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ Importação concluída com sucesso!')
  } catch (error) {
    console.error('\n❌ Erro durante importação:', error)
    process.exit(1)
  }
}

main()
