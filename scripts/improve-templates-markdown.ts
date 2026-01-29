/**
 * Script para melhorar o markdown dos service_templates usando OpenAI
 *
 * Uso: npx tsx scripts/improve-templates-markdown.ts
 *
 * Requer OPENAI_API_KEY no .env.local
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

interface ServiceTemplate {
  id: string
  service_name: string
  content_markdown: string
  sections: Record<string, unknown> | null
}

const SYSTEM_PROMPT = `Tu és um assistente especializado em formatar fichas de serviço para prestadores de serviços domésticos em Portugal.

O teu objetivo é analisar o conteúdo markdown de uma ficha de serviço e extrair/estruturar a informação em 3 secções claras:

1. **O que inclui** - Lista de itens/serviços incluídos
2. **O que não inclui** - Lista de itens/serviços NÃO incluídos (exclusões)
3. **Notas importantes** - Avisos, condições especiais, informações relevantes

Regras:
- Mantém a linguagem em Português de Portugal
- Remove duplicações e informação redundante
- Cada item deve ser conciso e claro (máximo 1-2 linhas)
- Remove preços, valores monetários e referências a custos
- Remove informação sobre a empresa FIXO
- Foca apenas no conteúdo relevante para o prestador entender o serviço
- Se uma secção não tiver conteúdo relevante, devolve um array vazio

Responde APENAS em JSON válido com este formato exato:
{
  "includes": ["item 1", "item 2", ...],
  "excludes": ["item 1", "item 2", ...],
  "importantNotes": ["nota 1", "nota 2", ...]
}`

async function improveTemplateMarkdown(template: ServiceTemplate): Promise<{
  includes: string[]
  excludes: string[]
  importantNotes: string[]
} | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Serviço: ${template.service_name}\n\nConteúdo:\n${template.content_markdown}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error(`  No response from OpenAI for ${template.service_name}`)
      return null
    }

    const parsed = JSON.parse(content)
    return {
      includes: Array.isArray(parsed.includes) ? parsed.includes : [],
      excludes: Array.isArray(parsed.excludes) ? parsed.excludes : [],
      importantNotes: Array.isArray(parsed.importantNotes) ? parsed.importantNotes : [],
    }
  } catch (error) {
    console.error(`  Error processing ${template.service_name}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching service templates...\n')

  // Fetch all templates
  const { data: templates, error } = await supabase
    .from('service_templates')
    .select('id, service_name, content_markdown, sections')
    .eq('is_active', true)
    .order('service_name')

  if (error) {
    console.error('Error fetching templates:', error)
    process.exit(1)
  }

  if (!templates?.length) {
    console.log('No templates found')
    process.exit(0)
  }

  console.log(`Found ${templates.length} templates to process\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i]
    console.log(`[${i + 1}/${templates.length}] Processing: ${template.service_name}`)

    // Skip if no markdown content
    if (!template.content_markdown?.trim()) {
      console.log(`  Skipping - no markdown content`)
      skipCount++
      continue
    }

    // Process with OpenAI
    const improved = await improveTemplateMarkdown(template)

    if (!improved) {
      errorCount++
      continue
    }

    // Check if we got meaningful content
    const hasContent =
      improved.includes.length > 0 ||
      improved.excludes.length > 0 ||
      improved.importantNotes.length > 0

    if (!hasContent) {
      console.log(`  No structured content extracted`)
      skipCount++
      continue
    }

    // Update the template
    const { error: updateError } = await supabase
      .from('service_templates')
      .update({
        sections: improved,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)

    if (updateError) {
      console.error(`  Error updating: ${updateError.message}`)
      errorCount++
    } else {
      console.log(
        `  Updated: ${improved.includes.length} includes, ${improved.excludes.length} excludes, ${improved.importantNotes.length} notes`
      )
      successCount++
    }

    // Rate limiting - wait 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('\n========================================')
  console.log(`Done!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Skipped: ${skipCount}`)
  console.log(`  Errors: ${errorCount}`)
}

main()
