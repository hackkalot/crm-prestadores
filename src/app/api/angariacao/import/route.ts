import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import type { Database } from '@/types/database'

type AngariacaoPriceInsert = Database['public']['Tables']['angariacao_reference_prices']['Insert']
type AngariacaoMaterialInsert = Database['public']['Tables']['angariacao_materials']['Insert']

// Parseia taxa de IVA (ex: "23%" -> 23, 0.23 -> 23)
function parseVatRate(value: string | number | undefined): number {
  if (value === undefined || value === null) return 23
  if (typeof value === 'number') return value < 1 ? value * 100 : value
  const str = String(value).replace('%', '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? 23 : num < 1 ? num * 100 : num
}

// Parseia preço (converte "-" para null)
function parsePrice(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return Math.round(value * 100) / 100
  const str = String(value).trim()
  if (str === '-' || str === '' || str === ' - ') return null
  const num = parseFloat(str.replace(',', '.').replace(/\s/g, ''))
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

// Parseia data do Excel
function parseDate(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    return null
  }

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

// Limpa string
function cleanString(value: string | undefined): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  if (str === '-' || str === '') return null
  return str
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter ficheiro do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 400 })
    }

    // Ler ficheiro Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Verificar se as sheets existem
    if (!workbook.SheetNames.includes('DB')) {
      return NextResponse.json(
        { error: 'Sheet "DB" não encontrada no ficheiro' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // ==========================================
    // IMPORTAR PREÇOS DE REFERÊNCIA (Sheet: DB)
    // ==========================================
    const dbSheet = workbook.Sheets['DB']
    const dbRows = XLSX.utils.sheet_to_json(dbSheet, { defval: undefined }) as Array<
      Record<string, unknown>
    >

    const priceRecords: AngariacaoPriceInsert[] = []

    for (const row of dbRows) {
      const serviceName = cleanString(row['Serviços'] as string)
      const cluster = cleanString(row['Cluster'] as string)
      const unitDescription = cleanString(row['Qtd./Unid.'] as string)

      if (!serviceName || !cluster || !unitDescription) {
        continue
      }

      // Nota: As colunas do Excel têm espaços antes e depois dos nomes
      priceRecords.push({
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
        price_hour_no_materials: parsePrice(
          row[' Valor s/IVA - por hora sem materiais '] as string | number
        ),
        price_hour_with_materials: parsePrice(
          row[' Valor s/IVA - por hora com materiais '] as string | number
        ),
        price_cleaning: parsePrice(row[' Valor s/IVA - Limpeza '] as string | number),
        price_cleaning_treatments: parsePrice(
          row[' Valor s/IVA - Limpeza + Tratamentos '] as string | number
        ),
        price_cleaning_imper: parsePrice(row[' Valor s/IVA - Limpeza + Imper. '] as string | number),
        price_cleaning_imper_treatments: parsePrice(
          row[' Valor s/IVA - Limpeza + imper. + Tratamentos '] as string | number
        ),
      })
    }

    // Limpar tabela de preços
    await adminClient
      .from('angariacao_reference_prices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Inserir preços em batches
    const batchSize = 100
    let pricesInserted = 0

    for (let i = 0; i < priceRecords.length; i += batchSize) {
      const batch = priceRecords.slice(i, i + batchSize)
      const { error } = await adminClient.from('angariacao_reference_prices').insert(batch)

      if (error) {
        // Se falhar em batch, tentar um a um
        for (const record of batch) {
          const { error: singleError } = await adminClient
            .from('angariacao_reference_prices')
            .insert(record)
          if (!singleError) {
            pricesInserted++
          }
        }
      } else {
        pricesInserted += batch.length
      }
    }

    // ==========================================
    // IMPORTAR MATERIAIS (Sheet: Materiais_Canalizador)
    // ==========================================
    let materialsInserted = 0

    if (workbook.SheetNames.includes('Materiais_Canalizador')) {
      const materialsSheet = workbook.Sheets['Materiais_Canalizador']
      const materialsRows = XLSX.utils.sheet_to_json(materialsSheet, {
        defval: undefined,
      }) as Array<Record<string, unknown>>

      const materialRecords: AngariacaoMaterialInsert[] = []

      for (const row of materialsRows) {
        const materialName = cleanString(row['Material'] as string)
        const priceWithoutVat = row['Valores s/ IVA'] as number
        const vatRate = row['Taxa de IVA'] as number

        if (!materialName || priceWithoutVat === undefined) {
          continue
        }

        materialRecords.push({
          material_name: materialName,
          category: 'Canalizador',
          price_without_vat: Math.round(priceWithoutVat * 100) / 100,
          vat_rate: vatRate ? Math.round(vatRate * 100) : 23,
        })
      }

      // Limpar tabela de materiais
      await adminClient
        .from('angariacao_materials')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Inserir materiais
      const { error } = await adminClient.from('angariacao_materials').insert(materialRecords)

      if (!error) {
        materialsInserted = materialRecords.length
      }
    }

    return NextResponse.json({
      success: true,
      pricesCount: pricesInserted,
      materialsCount: materialsInserted,
    })
  } catch (error) {
    console.error('Error importing angariacao prices:', error)
    return NextResponse.json(
      { error: 'Erro ao processar ficheiro' },
      { status: 500 }
    )
  }
}
