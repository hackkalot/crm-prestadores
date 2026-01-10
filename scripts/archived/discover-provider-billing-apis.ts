/**
 * PROVIDER BILLING API DISCOVERY
 *
 * Descobre endpoints da página de Billing dos Prestadores
 * https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ProviderBillingProcesses
 *
 * Como usar:
 *   npx tsx scripts/discover-provider-billing-apis.ts
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURAÇÕES
// ============================================
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const TARGET_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ProviderBillingProcesses';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

const DATA_PATH = path.resolve(__dirname, '../data/api-discovery');
const OUTPUT_PATH = DATA_PATH;

// Criar pastas
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
}

// ============================================
// TYPES
// ============================================
interface APICall {
    url: string;
    method: string;
    headers: Record<string, string>;
    payload?: any;
    response?: any;
    statusCode?: number;
    timestamp: string;
}

// ============================================
// HELPERS
// ============================================
function log(message: string, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function wait(ms: number, reason: string) {
    log(`⏳ Aguardando ${ms}ms: ${reason}`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

function tryParseJSON(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

// Filtrar apenas APIs de dados (remover login, moduleinfo, etc)
function isDataAPI(url: string): boolean {
    // Excluir endpoints de sistema/autenticação
    const excludePatterns = [
        '/moduleservices/moduleinfo',
        '/moduleservices/moduleversioninfo',
        'ActionDoLogin',
        'ActionFeature_GetList',
        'GetSitePropertyURLDomain',
        'GetUserNameFromServer',
        'GetUserAndDocumentData',
    ];

    // Se contém algum padrão excluído, retornar false
    for (const pattern of excludePatterns) {
        if (url.includes(pattern)) {
            return false;
        }
    }

    // Incluir TODOS os endpoints de screenservices que não foram excluídos
    return url.includes('/screenservices/');
}

// Limpar API call para output (remover campos desnecessários)
function cleanAPICall(call: APICall): any {
    // Remover headers desnecessários
    const essentialHeaders: Record<string, string> = {};
    const headersToKeep = ['content-type', 'accept', 'x-csrftoken'];

    for (const key of headersToKeep) {
        if (call.headers[key]) {
            essentialHeaders[key] = call.headers[key];
        }
    }

    return {
        url: call.url,
        method: call.method,
        headers: essentialHeaders,
        payload: call.payload,
        response: call.response,
        statusCode: call.statusCode,
        timestamp: call.timestamp,
    };
}

// ============================================
// MAIN DISCOVERY FUNCTION
// ============================================
async function discoverProviderBillingAPIs() {
    log('═══════════════════════════════════════════════');
    log('🔍 PROVIDER BILLING API DISCOVERY');
    log('═══════════════════════════════════════════════');

    const today = formatDate(new Date());
    log(`📅 Data: ${today}`);

    log('🌐 A lançar browser...');
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Array para armazenar API calls
    const capturedAPIs: APICall[] = [];

    try {
        // ============================================
        // INTERCEPTAR REQUESTS E RESPONSES
        // ============================================
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const url = request.url();

            // Interceptar apenas POST requests para screenservices
            if (request.method() === 'POST' && url.includes('/screenservices/')) {
                const apiCall: APICall = {
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers(),
                    payload: request.postData() ? tryParseJSON(request.postData() || '') : undefined,
                    timestamp: new Date().toISOString(),
                };

                // Log para debugging
                console.log(`🔵 REQUEST: ${apiCall.url.split('/').slice(-1)[0]}`);

                capturedAPIs.push(apiCall);
            }

            request.continue();
        });

        page.on('response', async (response) => {
            const url = response.url();

            // Capturar resposta apenas de screenservices
            if (url.includes('/screenservices/')) {
                try {
                    const contentType = response.headers()['content-type'] || '';

                    if (contentType.includes('application/json')) {
                        const responseData = await response.json();
                        const statusCode = response.status();

                        // Encontrar o API call correspondente e adicionar resposta
                        const apiCall = capturedAPIs.find(
                            (call) => call.url === url && !call.response
                        );

                        if (apiCall) {
                            apiCall.response = responseData;
                            apiCall.statusCode = statusCode;
                            console.log(`🟢 RESPONSE: ${url.split('/').slice(-1)[0]} (${statusCode})`);
                        }
                    }
                } catch (error) {
                    // Ignorar erros de parsing
                }
            }
        });

        // ============================================
        // PASSO 1: LOGIN
        // ============================================
        log('PASSO 1/3: Fazendo login...');

        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
        await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Login bem-sucedido!');

        // ============================================
        // PASSO 2: NAVEGAR PARA PROVIDER BILLING
        // ============================================
        log('PASSO 2/3: Navegando para Provider Billing Processes...');

        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Página Provider Billing carregada!');
        await wait(5000, 'Aguardar TODOS os API calls completarem');

        // ============================================
        // PASSO 3: FINALIZAR
        // ============================================
        log('PASSO 3/3: Salvando resultados...');

        // Filtrar apenas APIs de dados
        const dataAPIs = capturedAPIs.filter(api => isDataAPI(api.url));

        log(`📊 APIs capturadas:`);
        log(`   - Total: ${capturedAPIs.length}`);
        log(`   - Dados: ${dataAPIs.length}`);

        // Salvar resultados
        const output = {
            page: 'provider_billing_processes',
            url: TARGET_URL,
            date: today,
            capturedAt: new Date().toISOString(),
            totalAPICalls: dataAPIs.length,
            apis: dataAPIs.map(cleanAPICall),
        };

        const outputFile = path.join(OUTPUT_PATH, `03_provider_billing_apis.json`);
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

        await browser.close();

        log('═══════════════════════════════════════════════');
        log('✅ DISCOVERY CONCLUÍDO COM SUCESSO!');
        log(`📁 Ficheiro: ${outputFile}`);
        log(`   └─ ${dataAPIs.length} APIs de dados capturadas`);
        log('═══════════════════════════════════════════════');

        // Listar APIs descobertas
        log('');
        log('📋 APIs Descobertas:');
        dataAPIs.forEach((api, index) => {
            const endpoint = api.url.split('/').slice(-1)[0];
            log(`   ${index + 1}. ${endpoint}`);
        });

        return { success: true, outputFile, totalAPIs: dataAPIs.length };

    } catch (error) {
        log(`🔴 ERRO: ${error}`, true);
        await browser.close();
        return { success: false, error: String(error) };
    }
}

// ============================================
// EXECUTE
// ============================================
discoverProviderBillingAPIs()
    .then((result) => {
        if (result.success) {
            console.log(`\n✅ Discovery concluído! ${result.totalAPIs} APIs capturadas.`);
            process.exit(0);
        } else {
            console.error(`\n❌ Discovery falhou: ${result.error}`);
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error(`\n💥 Erro fatal: ${error}`);
        process.exit(1);
    });
