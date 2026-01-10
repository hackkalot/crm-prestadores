/**
 * API ENDPOINT DISCOVERY SCRAPPER
 * Descobre todos os endpoints de API usados pelo backoffice OutSystems
 *
 * FASE 1: Página de listagem (captura todos os fetch requests)
 * FASE 2: Página de detalhe de 1 pedido (captura novos fetch requests)
 *
 * Como usar:
 *   npx tsx scripts/discover-api-endpoints.ts
 */

import puppeteer, { HTTPRequest, HTTPResponse } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÕES
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'api-discovery');
const LOG_FILE = path.join(DATA_PATH, `api-discovery_${new Date().toISOString().split('T')[0]}.log`);

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

// Helper para wait
async function wait(ms: number, reason: string) {
    log(`⏳ Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

// Estrutura para armazenar API calls
interface APICall {
    url: string;
    method: string;
    headers: Record<string, string>;
    payload?: any;
    response?: any;
    statusCode?: number;
    timestamp: string;
}

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function discoverAPIs() {
    log('═══════════════════════════════════════════════');
    log('🔍 API ENDPOINT DISCOVERY SCRAPPER');
    log('═══════════════════════════════════════════════');

    const today = formatDate(new Date());
    log(`📅 Data: ${today}`);

    log('🌐 A lançar browser...');
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Arrays para armazenar API calls
    const listPageAPIs: APICall[] = [];
    const detailPageAPIs: APICall[] = [];
    let currentPhase: 'list' | 'detail' = 'list';

    // Interceptar TODOS os requests e responses
    page.on('request', async (request: HTTPRequest) => {
        // Apenas capturar fetch/xhr requests
        if (['fetch', 'xhr'].includes(request.resourceType())) {
            const apiCall: APICall = {
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                payload: request.postData() ? tryParseJSON(request.postData() || '') : undefined,
                timestamp: new Date().toISOString(),
            };

            // Log para debugging
            console.log(`🔵 [${currentPhase}] REQUEST: ${apiCall.url.split('/').slice(-1)[0]}`);

            // Adicionar ao array correto baseado na fase
            if (currentPhase === 'list') {
                listPageAPIs.push(apiCall);
            } else {
                detailPageAPIs.push(apiCall);
            }
        }
    });

    page.on('response', async (response: HTTPResponse) => {
        const request = response.request();

        // Apenas para fetch/xhr
        if (['fetch', 'xhr'].includes(request.resourceType())) {
            try {
                // Encontrar o APICall correspondente
                const targetArray = currentPhase === 'list' ? listPageAPIs : detailPageAPIs;
                const apiCall = targetArray.find(
                    call => call.url === request.url() && !call.response
                );

                if (apiCall) {
                    apiCall.statusCode = response.status();

                    // Tentar obter response body
                    try {
                        const contentType = response.headers()['content-type'] || '';
                        if (contentType.includes('application/json')) {
                            apiCall.response = await response.json();
                        }
                    } catch (e) {
                        // Ignorar erros ao parsear response
                    }
                }
            } catch (e) {
                // Ignorar erros
            }
        }
    });

    try {
        // ============================================
        // PASSO 1: LOGIN
        // ============================================
        log('PASSO 1/4: Fazendo login...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
        await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Login concluído!');
        await wait(2000, 'Página estabilizar');

        // ============================================
        // PASSO 2: CAPTURAR APIs DA LISTAGEM
        // ============================================
        log('PASSO 2/4: Capturando APIs da página de listagem...');
        currentPhase = 'list';

        // A página já carregou durante o login, mas vamos dar tempo para todos os requests completarem
        await wait(5000, 'Aguardar todas as APIs da listagem');

        log(`📊 Capturados ${listPageAPIs.length} API calls na listagem`);

        // ============================================
        // PASSO 3: NAVEGAR PARA PÁGINA DE DETALHE
        // ============================================
        log('PASSO 3/4: Navegando para página de detalhe de um pedido...');

        // Obter primeiro ServiceRequestCode da listagem
        const firstRequestCode = await page.evaluate(() => {
            const rows = document.querySelectorAll('.table-row, tbody tr');
            for (const row of rows) {
                const text = row.textContent || '';
                const match = text.match(/SR\d+/);
                if (match) {
                    return match[0];
                }
            }
            return null;
        });

        if (!firstRequestCode) {
            throw new Error('Não consegui encontrar nenhum ServiceRequestCode na listagem');
        }

        log(`✅ Encontrado ServiceRequestCode: ${firstRequestCode}`);

        // CRÍTICO: Mudar fase ANTES de navegar
        currentPhase = 'detail';

        // Navegar para página de detalhe
        const detailURL = `https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequestDetail?SRCode=${firstRequestCode}`;
        log(`🌐 Navegando para: ${detailURL}`);

        await page.goto(detailURL, { waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Página de detalhe carregada!');
        await wait(5000, 'Aguardar TODOS os API calls da página de detalhe completarem');

        // ============================================
        // PASSO 4: FINALIZAR
        // ============================================
        log('PASSO 4/4: Salvando resultados...');

        // Filtrar apenas APIs de dados (remover login, moduleinfo, etc)
        const listDataAPIs = listPageAPIs.filter(api => isDataAPI(api.url));
        const detailDataAPIs = detailPageAPIs.filter(api => isDataAPI(api.url));

        log(`📊 APIs de dados filtradas:`);
        log(`   - Listagem: ${listDataAPIs.length} de ${listPageAPIs.length} total`);
        log(`   - Detalhe: ${detailDataAPIs.length} de ${detailPageAPIs.length} total`);

        // Salvar resultados APENAS com APIs de dados
        const listOutput = {
            phase: 'list_page',
            date: today,
            capturedAt: new Date().toISOString(),
            totalAPICalls: listDataAPIs.length,
            apis: listDataAPIs.map(cleanAPICall),
        };

        const detailOutput = {
            phase: 'detail_page',
            date: today,
            capturedAt: new Date().toISOString(),
            totalAPICalls: detailDataAPIs.length,
            apis: detailDataAPIs.map(cleanAPICall),
        };

        const listFile = path.join(OUTPUT_PATH, `01_list_page_apis.json`);
        const detailFile = path.join(OUTPUT_PATH, `02_detail_page_apis.json`);

        fs.writeFileSync(listFile, JSON.stringify(listOutput, null, 2));
        fs.writeFileSync(detailFile, JSON.stringify(detailOutput, null, 2));

        await browser.close();

        log('═══════════════════════════════════════════════');
        log('✅ DISCOVERY CONCLUÍDO COM SUCESSO!');
        log(`📁 Listagem: ${listFile}`);
        log(`   └─ ${listDataAPIs.length} APIs de dados (de ${listPageAPIs.length} total)`);
        log(`📁 Detalhe: ${detailFile}`);
        log(`   └─ ${detailDataAPIs.length} APIs de dados (de ${detailPageAPIs.length} total)`);
        log('═══════════════════════════════════════════════');

        return { success: true, listFile, detailFile };

    } catch (error) {
        log(`🔴 ERRO: ${error}`, true);
        await browser.close();
        return { success: false, error: String(error) };
    }
}

// Helper para tentar parsear JSON
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
// CLI EXECUTION
// ============================================
console.log('\n🔍 API ENDPOINT DISCOVERY SCRAPPER\n');
console.log('Vai capturar:');
console.log('  1. Todos os fetch requests da página de listagem');
console.log('  2. Todos os fetch requests da página de detalhe (1 pedido)\n');

discoverAPIs().then(result => {
    if (result.success) {
        console.log('\n✅ Discovery bem-sucedido!');
        console.log(`📁 Listagem: ${result.listFile}`);
        console.log(`📁 Detalhe: ${result.detailFile}`);
        process.exit(0);
    } else {
        console.error('\n❌ Discovery falhou:', result.error);
        process.exit(1);
    }
});
