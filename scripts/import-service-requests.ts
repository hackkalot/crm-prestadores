import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Column mapping from Excel to database
const columnMapping: Record<string, string> = {
  'REQUEST_CODE': 'request_code',
  'USER_ID': 'user_id',
  'CLUSTER_ID': 'cluster_id',
  'CLUSTER': 'cluster',
  'CATEGORY_ID': 'category_id',
  'CATEGORY': 'category',
  'SERVICE_ID': 'service_id',
  'SERVICE': 'service',
  'SCHEDULED_TO': 'scheduled_to',
  'COST_ESTIMATION': 'cost_estimation',
  'PROMOCODE': 'promocode',
  'PROMOCODE_DISCOUNT': 'promocode_discount',
  'FINAL_COST_ESTIMATION': 'final_cost_estimation',
  'GROSS_ADDITIONAL_CHARGES': 'gross_additional_charges',
  'ADDITIONAL_CHARGES_DISCOUNT': 'additional_charges_discount',
  'NET_ADDITIONAL_CHARGES': 'net_additional_charges',
  'PAYMENT_STATUS': 'payment_status',
  'PAYMENT_METHOD': 'payment_method',
  'PAID_AMOUNT': 'paid_amount',
  'REFUND_AMOUNT': 'refund_amount',
  'REFUND_REASON': 'refund_reason',
  'REFUND_COMMENT': 'refund_comment',
  'NET_AMOUNT': 'net_amount',
  'CREATED_AT': 'created_at',
  'CREATED_BY': 'created_by',
  'SERVICE_ADDRESS_LINE_1': 'service_address_line_1',
  'SERVICE_ADDRESS_LINE_2': 'service_address_line_2',
  'ZIP_CODE': 'zip_code',
  'CITY': 'city',
  'ASSIGNED_PROVIDER_ID': 'assigned_provider_id',
  'ASSIGNED_PROVIDER_NAME': 'assigned_provider_name',
  'LAST_UPDATE': 'last_update',
  'UPDATED_BY': 'updated_by',
  'STATUS': 'status',
  'CANCELLATION_REASON': 'cancellation_reason',
  'CANCELLATION_COMMENT': 'cancellation_comment',
  'STATUS_UPDATED_AT': 'status_updated_at',
  'STATUS_UPDATED_BY': 'status_updated_by',
  'SERVICE_RATING': 'service_rating',
  'TIMESTAMP_RATING': 'timestamp_rating',
  'TECHNICIAN_RATING': 'technician_rating',
  'SERVICE_RATING_COMMENT': 'service_rating_comment',
  'SOURCE': 'source',
  'FID_ID': 'fid_id',
  'USED_WALLET': 'used_wallet',
  'RECURRENCE_CODE': 'recurrence_code',
  'RECURRENCE_TYPE': 'recurrence_type',
  'IS_MGM': 'is_mgm',
  'IS_NEW_PRICING_MODEL': 'is_new_pricing_model',
  'DONE_ON_MBWAY_FLOW': 'done_on_mbway_flow',
  'PROVIDER_ALLOCATION_MANUAL': 'provider_allocation_manual',
  'PROVIDER_CONFIRMED_TIMESTAMP': 'provider_confirmed_timestamp',
  'RESCHEDULE_REASON': 'reschedule_reason',
  'RESCHEDULE_COMMENT': 'reschedule_comment',
  'RESCHEDULE_BO': 'reschedule_bo',
  'DELIVERY_SCHEDULE_PROVIDERS_APP': 'delivery_schedule_providers_app',
  'SCHEDULED_DELIVERY_DATE': 'scheduled_delivery_date',
  'CHECKIN_PROVIDERS_APP': 'checkin_providers_app',
  'CHECKIN_PROVIDERS_APP_TIMESTAMP': 'checkin_providers_app_timestamp',
  'CHECKOUT_PROVIDERS_APP': 'checkout_providers_app',
  'CHECKOUT_PROVIDERS_APP_TIMESTAMP': 'checkout_providers_app_timestamp',
  'CLIENT_TOWN': 'client_town',
  'CLIENT_DISTRICT': 'client_district',
  'PROVIDERS_CONCLUSION_NOTES': 'providers_conclusion_notes',
  'PROVIDERS_DOCUMENTS': 'providers_documents',
  'CONTACT_CLIENT_CTA': 'contact_client_cta',
  'CONTACT_CLIENT_REASON': 'contact_client_reason',
  'CONTACT_CLIENT_TIMESTAMP': 'contact_client_timestamp',
  'CONTACT_CLIENT_CALLTIMES': 'contact_client_calltimes',
  'PROVIDER_REQUEST_NOTES': 'provider_request_notes',
  'HUBSPOT_DEAL_ID': 'hubspot_deal_id',
  'PROVIDER_COST': 'provider_cost',
  'INVOICE_PROCESS_STATUS': 'invoice_process_status',
  'NUMBER_ADDITIONAL_VISITS': 'number_additional_visits',
  'TASKS_COUNT': 'tasks_count',
  'FEES': 'fees',
  'FEES_AMOUNT': 'fees_amount',
  'TECHNICIAN_NAME': 'technician_name',
  'TECHNICIAN_ALLOCATION_TIMESTAMP': 'technician_allocation_timestamp',
  'TECHNICIAN_ALLOCATION_BEFORE_SERVICE': 'technician_allocation_before_service',
  'MULTIPLE_PROVIDERS': 'multiple_providers',
};

// Parse boolean values
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toUpperCase() === 'TRUE' || value === '1';
  }
  return Boolean(value);
}

// Parse date values
function parseDate(value: any): string | null {
  if (!value) return null;

  // Handle Excel serial dates (number format)
  if (typeof value === 'number') {
    // Excel serial date: days since January 1, 1900 (with a bug for 1900 leap year)
    // Excel's epoch is December 30, 1899 (due to the leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // December 30, 1899
    const days = Math.floor(value);
    const fraction = value - days;

    // Calculate the date
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

    // Add the time component (fraction of day)
    const totalSeconds = Math.round(fraction * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    date.setUTCHours(hours, minutes, seconds, 0);

    // Validate the result is reasonable (between 2000 and 2100)
    const year = date.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return date.toISOString();
    }
    return null;
  }

  // Handle string dates like "2026-01-09 14:17:01"
  if (typeof value === 'string') {
    const parsed = new Date(value.replace(' ', 'T'));
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

// Parse numeric values
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// List of date columns in Excel
const dateColumns = [
  'SCHEDULED_TO', 'CREATED_AT', 'LAST_UPDATE', 'STATUS_UPDATED_AT',
  'TIMESTAMP_RATING', 'PROVIDER_CONFIRMED_TIMESTAMP', 'SCHEDULED_DELIVERY_DATE',
  'CHECKIN_PROVIDERS_APP_TIMESTAMP', 'CHECKOUT_PROVIDERS_APP_TIMESTAMP',
  'CONTACT_CLIENT_TIMESTAMP', 'TECHNICIAN_ALLOCATION_TIMESTAMP'
];

// Transform row from Excel to database format
function transformRow(row: Record<string, any>): Record<string, any> {
  // Pre-process raw_data to convert date values for storage
  const processedRawData: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (dateColumns.includes(key) && typeof value === 'number') {
      processedRawData[key] = parseDate(value);
    } else {
      processedRawData[key] = value;
    }
  }

  const transformed: Record<string, any> = {
    raw_data: processedRawData, // Store processed data with converted dates
  };

  for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
    let value = row[excelCol];

    // Skip empty values
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type conversions based on column
    // Date columns - explicitly list all date/timestamp columns
    const dateDbColumns = [
      'scheduled_to', 'created_at', 'last_update', 'status_updated_at',
      'timestamp_rating', 'provider_confirmed_timestamp', 'scheduled_delivery_date',
      'checkin_providers_app_timestamp', 'checkout_providers_app_timestamp',
      'contact_client_timestamp', 'technician_allocation_timestamp'
    ];
    if (dateDbColumns.includes(dbCol)) {
      value = parseDate(value);
    } else if (dbCol.startsWith('is_') || dbCol.includes('_manual') || dbCol.includes('_app') ||
               dbCol === 'used_wallet' || dbCol === 'reschedule_bo' || dbCol === 'providers_documents' ||
               dbCol === 'contact_client_cta' || dbCol === 'multiple_providers' ||
               dbCol === 'technician_allocation_before_service') {
      value = parseBoolean(value);
    } else if (['cost_estimation', 'promocode_discount', 'final_cost_estimation', 'gross_additional_charges',
                'additional_charges_discount', 'net_additional_charges', 'net_amount', 'paid_amount',
                'refund_amount', 'provider_cost', 'fees_amount', 'service_rating', 'technician_rating'].includes(dbCol)) {
      value = parseNumber(value);
    } else if (['cluster_id', 'category_id', 'service_id', 'number_additional_visits',
                'tasks_count', 'contact_client_calltimes'].includes(dbCol)) {
      value = parseNumber(value);
      if (value !== null) value = Math.round(value);
    }

    if (value !== null && value !== undefined) {
      transformed[dbCol] = value;
    }
  }

  return transformed;
}

async function importServiceRequests(filePath: string) {
  console.log('📊 A ler ficheiro Excel...');

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  console.log(`📋 Encontradas ${rows.length} linhas de dados`);

  // Transform all rows
  const transformedRows = rows.map(transformRow);

  // Filter out rows without request_code
  const validRows = transformedRows.filter(row => row.request_code);
  console.log(`✅ ${validRows.length} linhas válidas para importar`);

  // Upsert in batches of 100
  const batchSize = 100;
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('service_requests')
      .upsert(batch, {
        onConflict: 'request_code',
        ignoreDuplicates: false
      })
      .select('request_code');

    if (error) {
      console.error(`❌ Erro no batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      imported += data?.length || 0;
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} registos processados`);
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   ✅ Importados/Atualizados: ${imported}`);
  console.log(`   ❌ Erros: ${errors}`);
}

// Main execution
const args = process.argv.slice(2);
const filePath = args[0] || path.join(__dirname, '../data/scrapper-outputs/service_request_data.xlsx');

if (!filePath) {
  console.error('❌ Por favor forneça o caminho para o ficheiro Excel');
  console.log('Uso: npx tsx scripts/import-service-requests.ts <caminho-ficheiro.xlsx>');
  process.exit(1);
}

console.log(`📂 Ficheiro: ${filePath}`);
importServiceRequests(filePath)
  .then(() => {
    console.log('\n🏁 Importação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🔴 Erro fatal:', error);
    process.exit(1);
  });
