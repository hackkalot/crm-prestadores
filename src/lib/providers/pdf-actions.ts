export type ServiceCategory = {
  id: string
  name: string
  cluster: string | null
  vat_rate: number
  is_active: boolean
}

export type ReferencePrice = {
  id: string
  service_id: string
  variant_name: string | null
  variant_description: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

export type ProviderPrice = {
  id: string
  provider_id: string
  service_id: string
  variant_name: string | null
  price_without_vat: number
  valid_from: string
  is_active: boolean
}

export type ServiceWithPrices = {
  id: string
  name: string
  description: string | null
  unit: string | null
  is_active: boolean
  category: ServiceCategory
  reference_prices: ReferencePrice[]
  provider_prices: ProviderPrice[]
}

interface PricingTableData {
  category: ServiceCategory
  services: ServiceWithPrices[]
}

interface ProviderData {
  id: string
  name: string
  nif: string | null
  email: string
}

/**
 * Generate HTML content for a PDF pricing proposal
 */
export function generatePricingProposalHTML(
  provider: ProviderData,
  pricingTable: PricingTableData[]
): string {
  const currentDate = new Date().toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Calculate total services and total price
  let totalServices = 0
  let totalPriceWithoutVat = 0

  const rows: string[] = []

  for (const { category, services } of pricingTable) {
    for (const service of services) {
      const providerPrice = service.provider_prices[0]
      if (providerPrice) {
        totalServices++
        totalPriceWithoutVat += providerPrice.price_without_vat
        const vatAmount = providerPrice.price_without_vat * (category.vat_rate / 100)
        const totalWithVat = providerPrice.price_without_vat + vatAmount

        rows.push(`
          <tr>
            <td style="border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 13px;">
              ${service.name}
              ${providerPrice.variant_name ? `<br/><span style="color: #6b7280; font-size: 12px;">${providerPrice.variant_name}</span>` : ''}
            </td>
            <td style="border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 13px;">
              ${service.unit || '-'}
            </td>
            <td style="border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: right; font-size: 13px;">
              €${providerPrice.price_without_vat.toFixed(2)}
            </td>
            <td style="border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: center; font-size: 13px;">
              ${category.vat_rate}%
            </td>
            <td style="border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: right; font-size: 13px;">
              €${totalWithVat.toFixed(2)}
            </td>
          </tr>
        `)
      }
    }
  }

  // Group by cluster for summary
  const clusterMap = new Map<string, { count: number; total: number }>()
  for (const { category, services } of pricingTable) {
    const clusterName = category.cluster || 'Sem Cluster'
    for (const service of services) {
      const providerPrice = service.provider_prices[0]
      if (providerPrice) {
        if (!clusterMap.has(clusterName)) {
          clusterMap.set(clusterName, { count: 0, total: 0 })
        }
        const cluster = clusterMap.get(clusterName)!
        cluster.count++
        cluster.total += providerPrice.price_without_vat
      }
    }
  }

  const clusterSummary = Array.from(clusterMap.entries())
    .map(
      ([cluster, data]) => `
      <tr style="background-color: #f3f4f6;">
        <td colspan="3" style="padding: 10px 12px; text-align: left; font-weight: 600; font-size: 13px;">
          ${cluster}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 600; font-size: 13px;">
          ${data.count} serviço${data.count !== 1 ? 's' : ''}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; font-size: 13px;">
          €${data.total.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('')

  // Calculate total VAT
  let totalVat = 0
  for (const { category, services } of pricingTable) {
    for (const service of services) {
      const providerPrice = service.provider_prices[0]
      if (providerPrice) {
        totalVat += providerPrice.price_without_vat * (category.vat_rate / 100)
      }
    }
  }

  const totalWithVat = totalPriceWithoutVat + totalVat

  return `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta de Preços - ${provider.name}</title>
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
          background-color: #f9fafb;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          padding: 40px;
        }

        .header {
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .logo-placeholder {
          font-size: 24px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: -0.5px;
        }

        .doc-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          text-align: right;
        }

        .doc-date {
          font-size: 13px;
          color: #6b7280;
          text-align: right;
          margin-top: 4px;
        }

        .provider-info {
          margin-bottom: 30px;
        }

        .provider-info h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1f2937;
        }

        .provider-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          font-size: 13px;
        }

        .detail-row {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .detail-value {
          color: #1f2937;
          font-weight: 500;
        }

        .pricing-section {
          margin-bottom: 40px;
        }

        .pricing-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
        }

        .table-wrapper {
          overflow-x: auto;
          margin-bottom: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        thead tr {
          background-color: #f3f4f6;
          border-bottom: 2px solid #e5e7eb;
        }

        thead th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #374151;
        }

        .summary-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin-top: 30px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e40af;
        }

        .totals-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }

        .total-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .total-label {
          font-size: 13px;
          color: #374151;
        }

        .total-amount {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }

        .grand-total {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-top: 2px solid #1e40af;
          border-bottom: 2px solid #1e40af;
          margin-top: 20px;
        }

        .grand-total-label {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
        }

        .grand-total-amount {
          font-size: 18px;
          font-weight: 700;
          color: #1e40af;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #6b7280;
          text-align: center;
        }

        @media print {
          body {
            background-color: white;
          }
          .container {
            max-width: 100%;
            padding: 20px;
          }
        }

        @page {
          size: A4;
          margin: 20mm;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="logo-placeholder">FIXO</div>
            <div>
              <div class="doc-title">Proposta de Preços</div>
              <div class="doc-date">${currentDate}</div>
            </div>
          </div>
        </div>

        <!-- Provider Info -->
        <div class="provider-info">
          <h2>Informações do Prestador</h2>
          <div class="provider-details">
            <div class="detail-row">
              <span class="detail-label">Nome</span>
              <span class="detail-value">${provider.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value">${provider.email}</span>
            </div>
            ${provider.nif ? `
              <div class="detail-row">
                <span class="detail-label">NIF</span>
                <span class="detail-value">${provider.nif}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Services Table -->
        <div class="pricing-section">
          <h3>Serviços Contratados</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Unidade</th>
                  <th>Preço sem IVA</th>
                  <th>Taxa IVA</th>
                  <th>Total com IVA</th>
                </tr>
              </thead>
              <tbody>
                ${rows.join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cluster Summary -->
        ${clusterSummary ? `
          <div class="pricing-section">
            <h3>Resumo por Cluster</h3>
            <div class="table-wrapper">
              <table>
                <tbody>
                  ${clusterSummary}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total de Serviços</div>
              <div class="summary-value">${totalServices}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Subtotal</div>
              <div class="summary-value" style="font-size: 18px;">€${totalPriceWithoutVat.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total IVA</div>
              <div class="summary-value" style="font-size: 18px;">€${totalVat.toFixed(2)}</div>
            </div>
          </div>

          <div class="grand-total">
            <span class="grand-total-label">Valor Total com IVA:</span>
            <span class="grand-total-amount">€${totalWithVat.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Este documento foi gerado automaticamente pelo CRM FIXO em ${currentDate}.</p>
          <p>Para questões sobre esta proposta, por favor contacte o seu gestor de conta.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

