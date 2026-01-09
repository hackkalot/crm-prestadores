import * as XLSX from 'xlsx'

const filePath = './data/hubspot-form-submissions-fo-2025-03-questionario-de-2025-11-18-1.xlsx'

console.log('📊 A ler ficheiro Excel...\n')

const workbook = XLSX.readFile(filePath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const data = XLSX.utils.sheet_to_json(worksheet)

if (data.length > 0) {
  const firstRow = data[0] as Record<string, any>
  const columns = Object.keys(firstRow)

  console.log(`📋 Encontradas ${columns.length} colunas:\n`)

  columns.forEach((col, index) => {
    console.log(`${index + 1}. "${col}"`)
  })

  console.log(`\n✅ Total de ${data.length} linhas de dados`)

  // Show first row data
  console.log('\n🔍 Primeira linha (exemplo):')
  console.log(JSON.stringify(firstRow, null, 2))
} else {
  console.log('❌ Nenhum dado encontrado no ficheiro')
}
