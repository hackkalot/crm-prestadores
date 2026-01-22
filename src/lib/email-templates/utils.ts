import type { EmailTemplate } from './actions'

/**
 * Interpolate variables in an email template.
 * Replaces all {{variable}} patterns with the provided values.
 *
 * @example
 * const template = { subject: 'Hello {{name}}', body: 'Welcome, {{name}}!' }
 * const result = interpolateTemplate(template, { name: 'John' })
 * // result = { subject: 'Hello John', body: 'Welcome, John!' }
 */
export function interpolateTemplate(
  template: Pick<EmailTemplate, 'subject' | 'body'>,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body

  // Replace all {{variable}} patterns (with optional whitespace)
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    subject = subject.replace(pattern, value)
    body = body.replace(pattern, value)
  }

  return { subject, body }
}

/**
 * Extract all variable names from a template string.
 *
 * @example
 * extractVariables('Hello {{name}}, your order {{order_id}} is ready')
 * // returns ['name', 'order_id']
 */
export function extractVariables(text: string): string[] {
  const pattern = /\{\{\s*(\w+)\s*\}\}/g
  const variables: string[] = []
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}
