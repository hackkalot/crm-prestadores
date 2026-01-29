import type { ServiceTemplate, ServiceTemplateSections } from './utils'
import { parseTemplateSections } from './utils'
import type { CatalogPrice } from '@/lib/service-catalog/actions'

interface ProviderInfo {
  name: string
  nif: string | null
  email: string
}

interface Material {
  id: string
  material_name: string
  category: string | null
  price_without_vat: number
  vat_rate: number
}

// Ordem dos clusters (mesma do pdf-generator original)
const CLUSTER_ORDER = ['Casa', 'Saúde e bem estar', 'Empresas', 'Luxo', 'Pete']

/**
 * Gera HTML para PDF de ficha de serviços com templates + preços
 * @param templates Lista de templates de serviço
 * @param prices Lista de preços do catálogo
 * @param provider Informações do prestador
 * @param materials Lista de materiais (opcional - apenas se canalizador estiver selecionado)
 */
export function generateServiceSheetPDFHTML(
  templates: ServiceTemplate[],
  prices: CatalogPrice[],
  provider: ProviderInfo,
  materials?: Material[]
): string {
  const currentDate = new Date().toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Agrupar templates por cluster
  const groupedTemplates = groupTemplatesByCluster(templates)

  // Criar mapa de preços por service_name para lookup rápido
  const pricesByServiceName = new Map<string, CatalogPrice[]>()
  for (const price of prices) {
    if (!pricesByServiceName.has(price.service_name)) {
      pricesByServiceName.set(price.service_name, [])
    }
    pricesByServiceName.get(price.service_name)!.push(price)
  }

  // Gerar conteúdo das fichas (passando materiais para incluir após canalizador)
  const sheetsHTML = generateSheetsHTML(groupedTemplates, pricesByServiceName, materials)

  return `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fichas de Serviço - ${escapeHTML(provider.name)}</title>
      <style>
        ${getStyles()}
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
              <div class="doc-title">Fichas de Serviço</div>
              <div class="doc-date">${currentDate}</div>
            </div>
          </div>
        </div>
        <div class="header-separator"></div>

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

        <!-- Service Sheets -->
        <div class="body-content">
          ${sheetsHTML}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Documento gerado automaticamente. Para questões, contacte o seu gestor de conta.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Agrupa templates por cluster
 */
function groupTemplatesByCluster(templates: ServiceTemplate[]): Map<string, ServiceTemplate[]> {
  const result = new Map<string, ServiceTemplate[]>()

  // Inicializar clusters na ordem correcta
  for (const cluster of CLUSTER_ORDER) {
    result.set(cluster, [])
  }

  // Adicionar templates
  for (const template of templates) {
    const cluster = template.cluster || 'Outros'
    if (!result.has(cluster)) {
      result.set(cluster, [])
    }
    result.get(cluster)!.push(template)
  }

  // Ordenar templates dentro de cada cluster
  for (const [, temps] of result) {
    temps.sort((a, b) => a.service_name.localeCompare(b.service_name, 'pt'))
  }

  // Remover clusters vazios
  for (const [cluster, temps] of result) {
    if (temps.length === 0) {
      result.delete(cluster)
    }
  }

  return result
}

/**
 * Gera HTML das fichas de serviço
 */
function generateSheetsHTML(
  groupedTemplates: Map<string, ServiceTemplate[]>,
  pricesByServiceName: Map<string, CatalogPrice[]>,
  materials?: Material[]
): string {
  const sections: string[] = []

  for (const [cluster, templates] of groupedTemplates) {
    if (templates.length === 0) continue

    const sheetsHTML = templates.map(template => {
      const templateSections = parseTemplateSections(template.sections)
      const prices = pricesByServiceName.get(template.service_name) || []

      // Gerar card do serviço
      let cardHTML = generateServiceSheetCard(template, templateSections, prices)

      // Se este é um serviço de canalizador e temos materiais, adicionar tabela após o card
      const isCanalizador = template.service_name?.toLowerCase().includes('canalizador')
      if (isCanalizador && materials && materials.length > 0) {
        cardHTML += generateMaterialsTableHTML(materials)
      }

      return cardHTML
    }).join('')

    sections.push(`
      <div class="cluster-section">
        <div class="cluster-title">${escapeHTML(cluster)}</div>
        ${sheetsHTML}
      </div>
    `)
  }

  return sections.join('')
}

/**
 * Gera card individual de ficha de serviço
 */
function generateServiceSheetCard(
  template: ServiceTemplate,
  sections: ServiceTemplateSections,
  prices: CatalogPrice[]
): string {
  const includesHTML = sections.includes?.length
    ? `
      <div class="section">
        <h4 class="section-title includes-title">O que inclui</h4>
        <ul class="section-list">
          ${sections.includes.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  const excludesHTML = sections.excludes?.length
    ? `
      <div class="section">
        <h4 class="section-title excludes-title">O que não inclui</h4>
        <ul class="section-list excludes">
          ${sections.excludes.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  const notesHTML = sections.importantNotes?.length
    ? `
      <div class="section notes-section">
        <h4 class="section-title notes-title">Notas importantes</h4>
        <ul class="section-list notes">
          ${sections.importantNotes.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  const pricesHTML = prices.length
    ? `
      <div class="section prices-section">
        <h4 class="section-title prices-title">Preços</h4>
        <table class="prices-table">
          <thead>
            <tr>
              <th>Unidade</th>
              <th class="text-right">Preço s/IVA</th>
            </tr>
          </thead>
          <tbody>
            ${prices.map(p => `
              <tr>
                <td>${escapeHTML(p.unit_description)}</td>
                <td class="text-right">${formatPrice(p.price_base || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : ''

  return `
    <div class="service-sheet">
      <h3 class="service-name">${escapeHTML(template.service_name)}</h3>
      ${includesHTML}
      ${excludesHTML}
      ${notesHTML}
      ${pricesHTML}
    </div>
  `
}

/**
 * Estilos CSS do PDF
 */
function getStyles(): string {
  return `
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

    /* Header */
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

    /* Service sheet card */
    .service-sheet {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .service-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    /* Sections */
    .section {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .includes-title {
      background-color: #dcfce7;
      color: #166534;
    }

    .excludes-title {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .notes-title {
      background-color: #fef3c7;
      color: #92400e;
    }

    .prices-title {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .section-list {
      margin-left: 20px;
      font-size: 13px;
      color: #374151;
    }

    .section-list li {
      margin-bottom: 4px;
    }

    .section-list.excludes li {
      color: #6b7280;
    }

    .section-list.notes li {
      color: #92400e;
    }

    .notes-section {
      background-color: #fffbeb;
      padding: 12px;
      border-radius: 4px;
      border-left: 3px solid #f59e0b;
    }

    /* Prices table */
    .prices-section {
      margin-top: 16px;
    }

    .prices-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 8px;
    }

    .prices-table th {
      background-color: #f3f4f6;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      color: #4b5563;
      border: 1px solid #e5e7eb;
    }

    .prices-table td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
    }

    .prices-table .text-right {
      text-align: right;
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

      /* Títulos não devem ficar órfãos - usar pseudo-elemento para garantir espaço mínimo */
      .service-name::after {
        content: "";
        display: block;
        height: 80px;
        margin-bottom: -80px;
      }

      .section-title::after {
        content: "";
        display: block;
        height: 50px;
        margin-bottom: -50px;
      }

      .cluster-title::after {
        content: "";
        display: block;
        height: 100px;
        margin-bottom: -100px;
      }

      /* Permitir quebras dentro de cards grandes */
      .service-sheet {
        page-break-inside: auto;
      }

      /* Tabelas podem quebrar entre linhas */
      .prices-table {
        page-break-inside: auto;
      }

      .prices-table tr {
        page-break-inside: avoid;
      }

      /* Manter header da tabela visível em cada página */
      .prices-table thead {
        display: table-header-group;
      }
    }

    @page {
      size: A4;
      margin: 5mm 0 5mm 0;
    }

    @page :first {
      margin: 0;
    }
  `
}

/**
 * Formata preço em euros
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
 * Aparece logo após o card do serviço de canalizador
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
        <td>${escapeHTML(material.material_name)}</td>
        <td class="text-right">${formatPrice(price)}</td>
      </tr>
    `
  }).join('')

  return `
    <div class="service-sheet materials-sheet">
      <h3 class="service-name">Materiais de Canalizador</h3>
      <div class="section prices-section">
        <table class="prices-table">
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
  `
}
