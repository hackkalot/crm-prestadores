/**
 * Parse Excel file to see columns and preview data
 */
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../data/scrapper-outputs/service_request_data.xlsx');

console.log('📊 Parsing Excel file:', excelPath);
console.log();

// Read Excel file
const workbook = XLSX.readFile(excelPath);

// Get first sheet
const sheetName = workbook.SheetNames[0];
console.log(`📄 Sheet: ${sheetName}`);
console.log();

// Convert to JSON
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`📈 Total rows: ${data.length}`);
console.log();

if (data.length > 0) {
    console.log('📋 Columns:');
    const columns = Object.keys(data[0] as any);
    columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
    });
    console.log();

    console.log('🔍 First row preview:');
    console.log(JSON.stringify(data[0], null, 2));
}
