import type { CatalogPrice } from './actions'

// Ordem dos clusters
const CLUSTER_ORDER = ['Casa', 'Saúde e bem estar', 'Empresas', 'Luxo', 'Pete']

// Colunas de preços opcionais
const OPTIONAL_PRICE_COLUMNS = [
  { key: 'typology', label: 'Tipologia', type: 'string' },
  { key: 'price_new_visit', label: 'Nova Visita', type: 'price' },
  { key: 'price_extra_night', label: 'Extra Noite', type: 'price' },
  { key: 'price_hour_no_materials', label: 'Hora (s/ mat.)', type: 'price' },
  { key: 'price_hour_with_materials', label: 'Hora (c/ mat.)', type: 'price' },
  { key: 'price_cleaning', label: 'Limpeza', type: 'price' },
  { key: 'price_cleaning_treatments', label: 'Limp. Tratam.', type: 'price' },
  { key: 'price_cleaning_imper', label: 'Limp. Imper.', type: 'price' },
  { key: 'price_cleaning_imper_treatments', label: 'Limp. Imper. Tratam.', type: 'price' },
] as const

type OptionalColumnKey = (typeof OPTIONAL_PRICE_COLUMNS)[number]['key']

interface ProviderInfo {
  name: string
  nif: string | null
  email: string
}

export interface Material {
  id: string
  material_name: string
  category: string | null
  price_without_vat: number
  vat_rate: number
  is_active: boolean | null
}

/**
 * Gera HTML para PDF de proposta de preços com tabelas agrupadas por cluster/service_group
 * @param prices Lista de preços do catálogo
 * @param provider Informações do prestador (opcional - se não fornecido, gera catálogo geral)
 * @param materials Lista de materiais (opcional - apenas se canalizador estiver selecionado)
 */
export function generateCatalogPricePDFHTML(
  prices: CatalogPrice[],
  provider?: ProviderInfo,
  materials?: Material[]
): string {
  const currentDate = new Date().toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Agrupar por cluster e depois por service_group
  const grouped = groupByClusterAndServiceGroup(prices)

  // Gerar conteúdo das tabelas
  const tablesHTML = generateTablesHTML(grouped)

  // Gerar tabela de materiais (se houver)
  const materialsHTML = materials && materials.length > 0 ? generateMaterialsTableHTML(materials) : ''

  return `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${provider ? `Proposta de Preços - ${provider.name}` : 'Catálogo de Preços FIXO'}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #1f2937;
          line-height: 1.5;
          background-color: #f3f4f6;
        }

        .container {
          max-width: 210mm;
          margin: 0 auto;
          background-color: white;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Header vermelho com logo */
        .header {
          background-color: #dc2626;
          padding: 24px 20px;
          margin-bottom: 0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo img {
          height: 40px;
          filter: brightness(0) invert(1);
        }

        .doc-info {
          text-align: right;
          color: white;
        }

        .doc-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
        }

        .doc-date {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
          margin-bottom: 4px;
        }

        .header-separator {
          height: 3px;
          background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%);
        }

        /* Provider info */
        .provider-info {
          padding: 24px 20px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .provider-info h2 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #374151;
        }

        .provider-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          font-size: 13px;
        }

        .detail-row {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          color: #1f2937;
          font-weight: 600;
        }

        /* Body content */
        .body-content {
          padding: 24px 20px;
        }

        /* Cluster section */
        .cluster-section {
          margin-bottom: 40px;
        }

        .cluster-title {
          font-size: 16px;
          font-weight: 700;
          color: #dc2626;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 12px 0;
          border-bottom: 2px solid #dc2626;
          margin-bottom: 24px;
        }

        /* Service group */
        .service-group {
          margin-bottom: 30px;
        }

        .service-group-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          background-color: #f3f4f6;
          padding: 10px 12px;
          border-radius: 4px 4px 0 0;
          border: 1px solid #e5e7eb;
          border-bottom: none;
        }


        /* Tables */
        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        thead tr {
          background-color: #f9fafb;
        }

        thead th {
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          color: #4b5563;
          border: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        thead th.text-right {
          text-align: right;
        }

        tbody td {
          padding: 10px 8px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }

        tbody td.text-right {
          text-align: right;
        }

        tbody tr:nth-child(even) {
          background-color: #fafafa;
        }

        .service-name {
          font-weight: 500;
          color: #1f2937;
        }

        .price-value {
          color: #6b7280;
          font-weight: 600;
        }

        .vat-rate {
          color: #6b7280;
          font-size: 11px;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
          text-align: center;
        }

        /* Merged cell styling */
        .service-name-cell {
          background-color: #fafafa;
          font-weight: 500;
          vertical-align: middle;
        }

        /* Print styles */
        @media print {
          body {
            background-color: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .container {
            max-width: none;
            width: 100%;
            box-shadow: none;
          }

          .header {
            background-color: #dc2626 !important;
          }

          .cluster-title {
            color: #dc2626 !important;
            border-color: #dc2626 !important;
          }

          /* Permitir quebras dentro de grupos grandes */
          .service-group {
            page-break-inside: auto;
          }

          /* Título do grupo não deve ficar sozinho - forçar quebra ANTES se necessário */
          .service-group-title {
            break-after: avoid;
            page-break-after: avoid;
            /* Fallback: se não couber com conteúdo, vai para próxima página */
            orphans: 3;
            widows: 3;
          }

          /* Tabelas podem quebrar entre linhas */
          table {
            page-break-inside: auto;
          }

          /* Header da tabela repete em cada página */
          thead {
            display: table-header-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* Primeira linha após header não deve separar do título */
          tbody tr:first-child {
            break-before: avoid;
            page-break-before: avoid;
          }
        }

        @page {
          size: A4;
          margin: 5mm 0 5mm 0;
        }

        @page :first {
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <img src="https://nyrnjltpyedfoommmbhs.supabase.co/storage/v1/object/public/Public_images/fixo-logo.png" alt="FIXO" />
            </div>
            <div class="doc-info">
              <div class="doc-title">Proposta de Preços</div>
              <div class="doc-date">${currentDate}</div>
            </div>
          </div>
        </div>
        <div class="header-separator"></div>

        ${provider ? `
        <!-- Provider Info -->
        <div class="provider-info">
          <h2>Informações do Prestador</h2>
          <div class="provider-details">
            <div class="detail-row">
              <span class="detail-label">Nome</span>
              <span class="detail-value">${escapeHTML(provider.name)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value">${escapeHTML(provider.email)}</span>
            </div>
            ${provider.nif ? `
              <div class="detail-row">
                <span class="detail-label">NIF</span>
                <span class="detail-value">${escapeHTML(provider.nif)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Body Content -->
        <div class="body-content">
          ${tablesHTML}
          ${materialsHTML}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Para questões sobre esta proposta, por favor contacte o seu gestor de conta.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Agrupa os preços por cluster e service_group
 */
function groupByClusterAndServiceGroup(prices: CatalogPrice[]): Map<string, Map<string, CatalogPrice[]>> {
  const result = new Map<string, Map<string, CatalogPrice[]>>()

  // Ordenar clusters pela ordem definida
  for (const cluster of CLUSTER_ORDER) {
    result.set(cluster, new Map())
  }

  // Agrupar preços
  for (const price of prices) {
    const cluster = price.cluster || 'Outros'
    const group = price.service_group || 'Outros'

    if (!result.has(cluster)) {
      result.set(cluster, new Map())
    }

    const clusterMap = result.get(cluster)!
    if (!clusterMap.has(group)) {
      clusterMap.set(group, [])
    }

    clusterMap.get(group)!.push(price)
  }

  // Ordenar serviços dentro de cada grupo por service_name
  for (const [, groups] of result) {
    for (const [, services] of groups) {
      services.sort((a, b) => a.service_name.localeCompare(b.service_name, 'pt'))
    }
  }

  // Remover clusters vazios
  for (const [cluster, groups] of result) {
    if (groups.size === 0) {
      result.delete(cluster)
    }
  }

  return result
}

/**
 * Determina quais colunas opcionais devem aparecer para um grupo de serviços
 */
function getOptionalColumnsForGroup(services: CatalogPrice[]): typeof OPTIONAL_PRICE_COLUMNS[number][] {
  const columns: typeof OPTIONAL_PRICE_COLUMNS[number][] = []

  for (const col of OPTIONAL_PRICE_COLUMNS) {
    const hasValue = services.some((s) => {
      const value = s[col.key as keyof CatalogPrice]
      return value !== null && value !== undefined && value !== ''
    })
    if (hasValue) {
      columns.push(col)
    }
  }

  return columns
}

/**
 * Agrupa serviços por service_name para fazer merge das células
 */
function groupServicesByName(services: CatalogPrice[]): Map<string, CatalogPrice[]> {
  const grouped = new Map<string, CatalogPrice[]>()

  for (const service of services) {
    const name = service.service_name
    if (!grouped.has(name)) {
      grouped.set(name, [])
    }
    grouped.get(name)!.push(service)
  }

  return grouped
}

/**
 * Gera o HTML das tabelas agrupadas com merge de células por service_name
 */
function generateTablesHTML(grouped: Map<string, Map<string, CatalogPrice[]>>): string {
  const sections: string[] = []

  for (const [cluster, groups] of grouped) {
    if (groups.size === 0) continue

    // Ordenar grupos alfabeticamente
    const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], 'pt')
    )

    const groupsHTML: string[] = []

    for (const [groupName, services] of sortedGroups) {
      if (services.length === 0) continue

      // Determinar colunas opcionais para este grupo
      const optionalCols = getOptionalColumnsForGroup(services)

      // Gerar header da tabela
      const headerCells = [
        '<th>Serviço</th>',
        '<th>Unidade</th>',
        ...optionalCols.map((col) =>
          col.type === 'price'
            ? `<th class="text-right">${col.label}</th>`
            : `<th>${col.label}</th>`
        ),
        '<th class="text-right">Preço s/IVA</th>',
      ]

      // Agrupar serviços por nome para fazer merge
      const servicesByName = groupServicesByName(services)

      // Ordenar nomes de serviços alfabeticamente
      const sortedServiceNames = Array.from(servicesByName.keys()).sort((a, b) =>
        a.localeCompare(b, 'pt')
      )

      // Gerar linhas da tabela com rowspan para serviços com múltiplas unidades
      const rows: string[] = []

      for (const serviceName of sortedServiceNames) {
        const serviceVariants = servicesByName.get(serviceName)!
        const rowCount = serviceVariants.length

        serviceVariants.forEach((service, index) => {
          const basePrice = service.price_base || 0

          const optionalCells = optionalCols.map((col) => {
            const value = service[col.key as keyof CatalogPrice]
            if (col.type === 'price') {
              return `<td class="text-right">${value !== null ? `<span class="price-value">${formatPrice(value as number)}</span>` : '-'}</td>`
            }
            return `<td>${value ? escapeHTML(String(value)) : '-'}</td>`
          })

          // Primeira linha do serviço - inclui a célula com rowspan
          if (index === 0) {
            rows.push(`
              <tr>
                <td class="service-name-cell" rowspan="${rowCount}"><span class="service-name">${escapeHTML(service.service_name)}</span></td>
                <td>${escapeHTML(service.unit_description)}</td>
                ${optionalCells.join('')}
                <td class="text-right"><span class="price-value">${formatPrice(basePrice)}</span></td>
              </tr>
            `)
          } else {
            // Linhas subsequentes - sem a célula do nome do serviço (coberta pelo rowspan)
            rows.push(`
              <tr>
                <td>${escapeHTML(service.unit_description)}</td>
                ${optionalCells.join('')}
                <td class="text-right"><span class="price-value">${formatPrice(basePrice)}</span></td>
              </tr>
            `)
          }
        })
      }

      groupsHTML.push(`
        <div class="service-group">
          <div class="service-group-title">${escapeHTML(groupName)}</div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>${headerCells.join('')}</tr>
              </thead>
              <tbody>
                ${rows.join('')}
              </tbody>
            </table>
          </div>
        </div>
      `)
    }

    sections.push(`
      <div class="cluster-section">
        <div class="cluster-title">${escapeHTML(cluster)}</div>
        ${groupsHTML.join('')}
      </div>
    `)
  }

  return sections.join('')
}

/**
 * Formata um preço em euros
 */
function formatPrice(value: number): string {
  return `€${value.toFixed(2)}`
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Gera o HTML da tabela de materiais de canalizador
 */
function generateMaterialsTableHTML(materials: Material[]): string {
  if (materials.length === 0) return ''

  // Ordenar materiais alfabeticamente
  const sortedMaterials = [...materials].sort((a, b) =>
    a.material_name.localeCompare(b.material_name, 'pt')
  )

  const rows = sortedMaterials.map((material) => {
    const price = material.price_without_vat || 0

    return `
      <tr>
        <td><span class="service-name">${escapeHTML(material.material_name)}</span></td>
        <td class="text-right"><span class="price-value">${formatPrice(price)}</span></td>
      </tr>
    `
  }).join('')

  return `
    <div class="cluster-section">
      <div class="cluster-title">Materiais de Canalizador</div>
      <div class="service-group">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th class="text-right">Preço s/IVA</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}
