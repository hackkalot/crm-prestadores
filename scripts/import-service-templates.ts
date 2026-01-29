/**
 * Script to import service templates from DOCX files into Supabase
 *
 * Usage: npm run import:templates
 *
 * This script:
 * 1. Scans the "data/05. Fichas de Serviços" folder recursively
 * 2. Converts each DOCX file to Markdown using mammoth
 * 3. Parses sections (Inclui, Exclui, Notas importantes)
 * 4. Matches service names with service_prices table
 * 5. Inserts into service_templates table
 */

import mammoth from 'mammoth'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  FOLDER_TO_CLUSTER,
  FILENAME_TO_SERVICE_NAME,
  FILES_TO_SKIP,
  FOLDERS_TO_SKIP,
} from '../src/lib/service-templates/mapping-config'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ParsedTemplate {
  serviceName: string
  serviceGroup: string | null
  cluster: string | null
  folderPath: string
  fileName: string
  contentMarkdown: string
  sections: {
    includes?: string[]
    excludes?: string[]
    importantNotes?: string[]
  }
}

interface ServicePrice {
  service_name: string
  service_group: string | null
  cluster: string
}

// Store service names from database for matching
let dbServiceNames: ServicePrice[] = []

/**
 * Fetch all service names from service_prices table
 */
async function fetchServiceNames(): Promise<ServicePrice[]> {
  const { data, error } = await supabase
    .from('service_prices')
    .select('service_name, service_group, cluster')

  if (error) {
    console.error('Error fetching service names:', error)
    return []
  }

  // Remove duplicates by service_name
  const unique = new Map<string, ServicePrice>()
  for (const item of data || []) {
    if (!unique.has(item.service_name)) {
      unique.set(item.service_name, item)
    }
  }

  return Array.from(unique.values())
}

/**
 * Recursively scan folder for DOCX files
 */
async function scanForDocxFiles(basePath: string): Promise<string[]> {
  const files: string[] = []

  async function scan(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        // Skip certain folders
        if (FOLDERS_TO_SKIP.includes(entry.name)) {
          console.log(`  Skipping folder: ${entry.name}`)
          continue
        }
        await scan(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.docx')) {
        // Skip certain files
        if (FILES_TO_SKIP.includes(entry.name)) {
          console.log(`  Skipping file: ${entry.name}`)
          continue
        }
        files.push(fullPath)
      }
    }
  }

  await scan(basePath)
  return files
}

/**
 * Clean filename to extract service name
 */
function cleanFilename(filename: string): string {
  return filename
    .replace(/\.docx$/i, '')
    // Remove date patterns like (jan-26), _fev 25, etc.
    .replace(/\s*\([^)]*\d+[^)]*\)\s*/g, '')
    .replace(/\s*_[a-zA-Z]{3}\s*\d+\s*$/g, '')
    // Remove leading date patterns like "20250408-"
    .replace(/^\d{8}\s*-\s*/g, '')
    .trim()
}

/**
 * Find best matching service name from database
 * Only uses exact or very close matches to avoid wrong assignments
 */
function findMatchingService(cleanedName: string): ServicePrice | null {
  const normalizedClean = cleanedName.toLowerCase().trim()

  // First try exact match
  const exactMatch = dbServiceNames.find(
    s => s.service_name.toLowerCase() === normalizedClean
  )
  if (exactMatch) return exactMatch

  // Try exact match ignoring accents
  const normalizedNoAccents = removeAccents(normalizedClean)
  const exactNoAccents = dbServiceNames.find(
    s => removeAccents(s.service_name.toLowerCase()) === normalizedNoAccents
  )
  if (exactNoAccents) return exactNoAccents

  // Try if one is contained entirely in the other (for minor variations)
  // Only if the match is at least 80% similar in length
  for (const service of dbServiceNames) {
    const serviceLower = service.service_name.toLowerCase()
    if (serviceLower.includes(normalizedClean) || normalizedClean.includes(serviceLower)) {
      const lengthRatio = Math.min(serviceLower.length, normalizedClean.length) /
                         Math.max(serviceLower.length, normalizedClean.length)
      if (lengthRatio >= 0.7) {
        return service
      }
    }
  }

  // No match found - return null (will use cleaned filename as service_name)
  return null
}

/**
 * Remove accents from string for comparison
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Parse markdown content to extract sections
 */
function parseSections(markdown: string): ParsedTemplate['sections'] {
  const sections: ParsedTemplate['sections'] = {}

  // Parse "Inclui" section - various patterns
  const incluiPatterns = [
    /#+\s*(?:O que )?[Ii]nclui[:\s]*([\s\S]*?)(?=#+|$)/i,
    /\*\*[Ii]nclui[:\s]*\*\*([\s\S]*?)(?=\*\*[Ee]xclui|\*\*[Nn]otas?|$)/i,
    /[Ii]nclui[:\s]*([\s\S]*?)(?=[Ee]xclui|[Nn]otas?\s+[Ii]mportantes?|$)/i,
  ]

  for (const pattern of incluiPatterns) {
    const match = markdown.match(pattern)
    if (match) {
      sections.includes = parseListItems(match[1])
      break
    }
  }

  // Parse "Exclui" section - various patterns
  const excluiPatterns = [
    /#+\s*(?:O que )?[Ee]xclui[:\s]*([\s\S]*?)(?=#+|$)/i,
    /\*\*[Ee]xclui[:\s]*\*\*([\s\S]*?)(?=\*\*[Nn]otas?|$)/i,
    /[Ee]xclui[:\s]*([\s\S]*?)(?=[Nn]otas?\s+[Ii]mportantes?|$)/i,
  ]

  for (const pattern of excluiPatterns) {
    const match = markdown.match(pattern)
    if (match) {
      sections.excludes = parseListItems(match[1])
      break
    }
  }

  // Parse "Notas importantes" section
  const notasPatterns = [
    /#+\s*[Nn]otas?\s+[Ii]mportantes?[:\s]*([\s\S]*?)(?=#+|$)/i,
    /\*\*[Nn]otas?\s+[Ii]mportantes?[:\s]*\*\*([\s\S]*?)$/i,
    /[Nn]otas?\s+[Ii]mportantes?[:\s]*([\s\S]*?)$/i,
  ]

  for (const pattern of notasPatterns) {
    const match = markdown.match(pattern)
    if (match) {
      sections.importantNotes = parseListItems(match[1])
      break
    }
  }

  return sections
}

/**
 * Parse list items from markdown text
 */
function parseListItems(text: string): string[] {
  if (!text) return []

  const items: string[] = []

  // Split by list markers (-, *, •, numbers)
  const lines = text.split(/\n/)

  for (const line of lines) {
    // Remove list markers and trim
    const cleaned = line
      .replace(/^[\s]*[-*•]\s*/, '')
      .replace(/^[\s]*\d+[.)]\s*/, '')
      .trim()

    // Skip empty lines and section headers
    if (cleaned && !cleaned.startsWith('#') && !cleaned.startsWith('**')) {
      items.push(cleaned)
    }
  }

  return items.filter(item => item.length > 0)
}

/**
 * Process a single DOCX file
 */
async function processDocxFile(
  filePath: string,
  basePath: string
): Promise<ParsedTemplate | null> {
  const relativePath = path.relative(basePath, filePath)
  const pathParts = relativePath.split(path.sep)
  const folderName = pathParts.length > 1 ? pathParts[0] : ''
  const fileName = path.basename(filePath)

  console.log(`\nProcessing: ${relativePath}`)

  try {
    // Convert DOCX to Markdown
    const buffer = await fs.readFile(filePath)
    const result = await mammoth.convertToMarkdown({ buffer })
    const markdown = result.value

    if (result.messages.length > 0) {
      console.log(`  Warnings: ${result.messages.map(m => m.message).join(', ')}`)
    }

    // Check manual mapping first
    let serviceName = FILENAME_TO_SERVICE_NAME[fileName]
    let matchedService: ServicePrice | null = null

    if (serviceName) {
      console.log(`  Using manual mapping: ${serviceName}`)
      matchedService = dbServiceNames.find(s => s.service_name === serviceName) || null
    } else {
      // Clean filename and try to match
      const cleanedName = cleanFilename(fileName)
      console.log(`  Cleaned name: ${cleanedName}`)

      matchedService = findMatchingService(cleanedName)

      if (matchedService) {
        serviceName = matchedService.service_name
        console.log(`  Matched to: ${serviceName}`)
      } else {
        serviceName = cleanedName
        console.log(`  ⚠️ No match found, using cleaned name: ${serviceName}`)
      }
    }

    // Get cluster: prefer matched service, fallback to folder mapping
    // Normalize folder name for lookup (handle encoding differences)
    const normalizedFolderName = folderName.normalize('NFC')
    const folderCluster = FOLDER_TO_CLUSTER[normalizedFolderName] ||
                         FOLDER_TO_CLUSTER[folderName] ||
                         // Try finding by partial match
                         Object.entries(FOLDER_TO_CLUSTER).find(([key]) =>
                           key.normalize('NFC').toLowerCase() === normalizedFolderName.toLowerCase()
                         )?.[1] ||
                         null
    const cluster = matchedService?.cluster || folderCluster || null
    const serviceGroup = matchedService?.service_group || null

    // Parse sections
    const sections = parseSections(markdown)

    console.log(`  Cluster: ${cluster || 'Unknown'}`)
    console.log(`  Service Group: ${serviceGroup || 'None'}`)
    console.log(`  Sections found: ${Object.keys(sections).join(', ') || 'None'}`)

    return {
      serviceName,
      serviceGroup,
      cluster,
      folderPath: folderName,
      fileName,
      contentMarkdown: markdown,
      sections,
    }
  } catch (error) {
    console.error(`  Error processing file: ${error}`)
    return null
  }
}

/**
 * Insert templates into database using upsert to handle duplicates
 */
async function insertTemplates(templates: ParsedTemplate[]): Promise<void> {
  console.log(`\n\nInserting ${templates.length} templates into database...`)

  // Delete existing templates first (fresh import)
  const { error: deleteError } = await supabase
    .from('service_templates')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error('Error deleting existing templates:', deleteError)
    // Continue anyway - table might be empty
  }

  // Track already inserted service names to avoid duplicates
  const insertedNames = new Set<string>()

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const template of templates) {
    // Skip if we already inserted this service_name
    const key = `${template.serviceName}|${template.version || 1}`
    if (insertedNames.has(key)) {
      console.log(`  Skipping duplicate: "${template.serviceName}" (${template.fileName})`)
      skipCount++
      continue
    }

    const { error } = await supabase
      .from('service_templates')
      .insert({
        service_name: template.serviceName,
        service_group: template.serviceGroup,
        cluster: template.cluster,
        folder_path: template.folderPath,
        file_name: template.fileName,
        content_markdown: template.contentMarkdown,
        sections: template.sections,
        version: 1,
        is_active: true,
      })

    if (error) {
      console.error(`  Error inserting "${template.serviceName}": ${error.message}`)
      errorCount++
    } else {
      insertedNames.add(key)
      successCount++
    }
  }

  console.log(`\nInsert complete: ${successCount} success, ${skipCount} skipped (duplicates), ${errorCount} errors`)
}

/**
 * Main function
 */
async function main() {
  const basePath = path.join(process.cwd(), 'data', '05. Fichas de Serviços')

  console.log('='.repeat(60))
  console.log('Service Templates Import Script')
  console.log('='.repeat(60))
  console.log(`\nBase path: ${basePath}`)

  // Check if folder exists
  try {
    await fs.access(basePath)
  } catch {
    console.error(`\nError: Folder not found: ${basePath}`)
    process.exit(1)
  }

  // Fetch service names from database
  console.log('\nFetching service names from database...')
  dbServiceNames = await fetchServiceNames()
  console.log(`Found ${dbServiceNames.length} unique services in database`)

  // Scan for DOCX files
  console.log('\nScanning for DOCX files...')
  const docxFiles = await scanForDocxFiles(basePath)
  console.log(`Found ${docxFiles.length} DOCX files`)

  // Process each file
  const templates: ParsedTemplate[] = []
  const unmapped: string[] = []

  for (const filePath of docxFiles) {
    const template = await processDocxFile(filePath, basePath)
    if (template) {
      templates.push(template)

      // Track unmapped (no cluster)
      if (!template.cluster) {
        unmapped.push(template.fileName)
      }
    }
  }

  // Insert into database
  await insertTemplates(templates)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total files processed: ${templates.length}`)
  console.log(`Unmapped files (no cluster): ${unmapped.length}`)

  if (unmapped.length > 0) {
    console.log('\nUnmapped files:')
    for (const file of unmapped) {
      console.log(`  - ${file}`)
    }
  }

  // List templates by cluster
  const byCluster = new Map<string, string[]>()
  for (const t of templates) {
    const cluster = t.cluster || 'Unknown'
    if (!byCluster.has(cluster)) {
      byCluster.set(cluster, [])
    }
    byCluster.get(cluster)!.push(t.serviceName)
  }

  console.log('\nTemplates by cluster:')
  for (const [cluster, services] of byCluster) {
    console.log(`  ${cluster}: ${services.length} templates`)
  }
}

main().catch(console.error)
