/**
 * VERSÃO API DO SCRAPPER
 * Usa chamadas diretas à API do OutSystems (muito mais rápido!)
 *
 * Como usar:
 *   npx tsx scripts/export-backoffice-api.ts
 *   npx tsx scripts/export-backoffice-api.ts --from=01-01-2026 --to=09-01-2026
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÕES
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const API_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'scrapper-outputs');
const LOG_FILE = path.join(DATA_PATH, `api-scrapper_${new Date().toISOString().split('T')[0]}.log`);

// Criar pastas
[DATA_PATH, OUTPUT_PATH].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Logger
function log(message: string, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    if (isError) {
        console.error(`❌ ${formattedMessage}`);
    } else {
        console.log(`✅ ${formattedMessage}`);
    }

    try {
        fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
    } catch (e) {
        // Ignorar erros de log
    }
}

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Converter dd-mm-yyyy para ISO (yyyy-mm-ddT00:00:00.000Z)
function toISODate(dateString: string): string {
    const [day, month, year] = dateString.split('-');
    return `${year}-${month}-${day}T00:00:00.000Z`;
}

interface ScrapperResult {
    success: boolean;
    filePath?: string;
    error?: string;
    data?: any;
}

async function runAPIScrapper(dateFrom: string, dateTo: string): Promise<ScrapperResult> {
    log('═══════════════════════════════════════════════');
    log('🚀 API SCRAPPER (Versão Otimizada)');
    log(`📅 Período: ${dateFrom} até ${dateTo}`);
    log('═══════════════════════════════════════════════');

    log('🌐 A lançar browser para login...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // ============================================
        // PASSO 1: LOGIN PARA OBTER COOKIES
        // ============================================
        log('PASSO 1/3: Fazendo login para obter cookies...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
        await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Login concluído!');

        // ============================================
        // PASSO 2: EXTRAIR COOKIES E CSRF TOKEN
        // ============================================
        log('PASSO 2/3: Extraindo cookies e CSRF token...');

        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // Extrair CSRF token do cookie nr2FixoUsers
        const nr2Cookie = cookies.find(c => c.name === 'nr2FixoUsers');
        let csrfToken = '';
        if (nr2Cookie) {
            log(`🔍 Cookie nr2FixoUsers encontrado: ${nr2Cookie.value.substring(0, 100)}...`);

            // Try multiple patterns
            // Pattern 1: crf%3dTOKEN%3b (capture everything including %2b, %2f, %3d)
            let match = nr2Cookie.value.match(/crf%3d([^;]+?)%3b/);
            if (match) {
                csrfToken = decodeURIComponent(match[1]);
            }

            // Pattern 2: crf=TOKEN;
            if (!csrfToken) {
                match = nr2Cookie.value.match(/crf=([^;]+);/);
                if (match) {
                    csrfToken = match[1];
                }
            }

            // Pattern 3: csrf token anywhere in cookie
            if (!csrfToken) {
                match = nr2Cookie.value.match(/csrf[^=]*=([^;&]+)/i);
                if (match) {
                    csrfToken = match[1];
                }
            }

            if (csrfToken) {
                log(`✅ CSRF Token extraído: ${csrfToken.substring(0, 20)}...`);
            }
        } else {
            log(`⚠️  Cookie nr2FixoUsers não encontrado. Cookies disponíveis: ${cookies.map(c => c.name).join(', ')}`);
        }

        if (!csrfToken) {
            throw new Error('CSRF Token não encontrado nos cookies!');
        }

        await browser.close();
        log('✅ Browser fechado, cookies obtidos!');

        // ============================================
        // PASSO 3: CHAMAR API DIRETAMENTE
        // ============================================
        log('PASSO 3/3: Chamando API do OutSystems...');

        // Converter datas para formato ISO
        const fromISO = toISODate(dateFrom);
        const toISO = toISODate(dateTo);

        log(`   Data De: ${dateFrom} → ${fromISO}`);
        log(`   Data Até: ${dateTo} → ${toISO}`);

        const payload = {
            versionInfo: {
                moduleVersion: "Bt6C82gdDc1aqSyWDB5hBQ",
                apiVersion: "nz47xpJE1xZle9LEOhqb2Q"
            },
            viewName: "MainFlow.ServiceRequests",
            screenData: {
                variables: {
                    SearchKeyword: "",
                    StartIndex: 0,
                    MaxRecords: 10000,  // High limit to get all records
                    TableSort: "ServiceRequestCreatedAt DESC",
                    CategoryId: "0",
                    InputFromSchedullingDate: "",
                    InputToSchedullingDate: "",
                    InputToSubmissionDate: dateTo,
                    InputFromSubmissionDate: dateFrom,
                    FromSchedullingDate: "1900-01-01T00:00:00",
                    ToSchedullingDate: "1900-01-01T00:00:00",
                    FromSubmissionDate: fromISO,
                    ToSubmissionDate: toISO,
                    SelectedRequestStatusText: "",
                    SelectedStatus: {
                        List: [],
                        EmptyListItem: { Value: "", Text: "" }
                    },
                    IsScheduledDeliveryDateNotDefined: false,
                    HasExportPermissions: true,
                    SelectedDistrictId: "",
                    OnGoingNewVisit: ""
                }
            },
            inputParameters: {
                StartIndex: 0,
                MaxRecords: 10000  // Request all records
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'accept-language': 'pt-GB,pt;q=0.9,en-GB;q=0.8,en;q=0.7',
                'content-type': 'application/json; charset=UTF-8',
                'cookie': cookieString,
                'origin': 'https://fidelidadep10.outsystemsenterprise.com',
                'referer': 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests',
                'x-csrftoken': csrfToken,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API retornou erro: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        log(`✅ API respondeu com sucesso!`);
        log(`📊 Dados recebidos: ${JSON.stringify(data).length} bytes`);

        // Guardar dados
        const jsonPath = path.join(OUTPUT_PATH, `pedidos_${dateFrom}_${dateTo}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

        log('═══════════════════════════════════════════════');
        log('✅ SCRAPPER CONCLUÍDO COM SUCESSO!');
        log(`📁 Ficheiro JSON: ${jsonPath}`);
        log(`📊 Tamanho: ${(fs.statSync(jsonPath).size / 1024).toFixed(2)} KB`);
        log('═══════════════════════════════════════════════');

        return { success: true, filePath: jsonPath, data };

    } catch (error) {
        log(`🔴 ERRO: ${error}`, true);
        await browser.close();
        return { success: false, error: String(error) };
    }
}

// ============================================
// CLI EXECUTION
// ============================================
const args = process.argv.slice(2);
const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1];
const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1];

const today = formatDate(new Date());

console.log('\n🚀 API SCRAPPER (VERSÃO OTIMIZADA)\n');
console.log('Vantagens:');
console.log('  ✅ Muito mais rápido (sem calendários!)');
console.log('  ✅ Mais confiável (API direta)');
console.log('  ✅ Retorna JSON com todos os dados\n');

runAPIScrapper(fromArg || today, toArg || today).then(result => {
    if (result.success) {
        console.log('\n✅ Scrapper bem-sucedido!');
        console.log(`📁 ${result.filePath}`);

        if (result.data) {
            console.log(`\n📊 Preview dos dados:`);
            console.log(JSON.stringify(result.data, null, 2).substring(0, 500) + '...');
        }

        process.exit(0);
    } else {
        console.error('\n❌ Scrapper falhou:', result.error);
        process.exit(1);
    }
});
