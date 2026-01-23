'use client'

import html2pdf from 'html2pdf.js'

interface PDFOptions {
  filename: string
  html: string
}

/**
 * Gera e descarrega um PDF diretamente a partir de HTML
 */
export async function downloadPDF({ filename, html }: PDFOptions): Promise<void> {
  // Criar um elemento temporário para o HTML
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm' // A4 width
  container.innerHTML = html
  document.body.appendChild(container)

  // Aguardar que as imagens carreguem
  const images = container.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
          } else {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          }
        })
    )
  )

  // Pequeno delay para garantir que o CSS é aplicado
  await new Promise((resolve) => setTimeout(resolve, 100))

  const options = {
    margin: [5, 5, 5, 5] as [number, number, number, number],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const },
  }

  try {
    await html2pdf().set(options).from(container).save()
  } finally {
    // Limpar o elemento temporário
    document.body.removeChild(container)
  }
}
