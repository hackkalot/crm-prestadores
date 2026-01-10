/**
 * BACKOFFICE SYNC - MVP (Fase 1)
 *
 * Sincroniza dados do backoffice OutSystems para Supabase
 * usando os 4 endpoints prioritários:
 *
 * 1. ScreenDataSetGetRequests - Dados principais dos Service Requests
 * 2. ScreenDataSetGetCategories - Lookup table de categorias
 * 3. ScreenDataSetGetDistricts - Lookup table de distritos
 * 4. ScreenDataSetGetServiceRequestStatus - Lookup table de status
 *
 * Como usar:
 *   npx tsx scripts/sync-backoffice-mvp.ts --from 01-01-2026 --to 09-01-2026
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
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

const BASE_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/screenservices';
const MODULE_VERSION = 'Bt6C82gdDc1aqSyWDB5hBQ';

const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'sync-outputs');
const LOG_FILE = path.join(DATA_PATH, `sync-mvp_${new Date().toISOString().split('T')[0]}.log`);

// Criar pastas
[DATA_PATH, OUTPUT_PATH].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ============================================
// LOGGER
// ============================================
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

async function wait(ms: number, reason: string) {
    log(`⏳ Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

// ============================================
// HELPERS DE DATA
// ============================================
function formatDateDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function toISODate(dateStr: string): string {
    // dd-mm-yyyy → yyyy-mm-ddT00:00:00.000Z
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}T00:00:00.000Z`;
}

// ============================================
// ENDPOINT DEFINITIONS (MVP - Fase 1)
// ============================================
interface EndpointConfig {
    name: string;
    url: string;
    apiVersion: string;
    description: string;
    requiresDateFilter: boolean;
}

const ENDPOINTS: Record<string, EndpointConfig> = {
    serviceRequests: {
        name: 'ScreenDataSetGetRequests',
        url: `${BASE_URL}/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests`,
        apiVersion: 'nz47xpJE1xZle9LEOhqb2Q',
        description: 'Service Requests principais',
        requiresDateFilter: true,
    },
    categories: {
        name: 'ScreenDataSetGetCategories',
        url: `${BASE_URL}/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetCategories`,
        apiVersion: 'JGL5R1ZVOEtL7XpHchI39w',
        description: 'Categorias (lookup table)',
        requiresDateFilter: false,
    },
    districts: {
        name: 'ScreenDataSetGetDistricts',
        url: `${BASE_URL}/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetDistricts`,
        apiVersion: 'SAfr6bbrlurrDwOTBr6jXQ',
        description: 'Distritos (lookup table)',
        requiresDateFilter: false,
    },
    statuses: {
        name: 'ScreenDataSetGetServiceRequestStatus',
        url: `${BASE_URL}/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetServiceRequestStatus`,
        apiVersion: 'eLZsS4_+Fp3D+FTfWsR9bw',
        description: 'Status (lookup table)',
        requiresDateFilter: false,
    },
};

// ============================================
// AUTHENTICATION
// ============================================
async function authenticate(): Promise<{ cookies: string; csrfToken: string }> {
    log('═══════════════════════════════════════════════');
    log('🔐 AUTENTICAÇÃO NO BACKOFFICE');
    log('═══════════════════════════════════════════════');

    log('🌐 A lançar browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        log('🌐 Navegando para login...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        log('🔑 Preenchendo credenciais...');
        await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
        await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });

        log('🔐 A fazer login...');
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        log('✅ Login bem-sucedido!');

        // Obter cookies
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // Extrair CSRF token
        const nr2Cookie = cookies.find(c => c.name === 'nr2FixoUsers');
        let csrfToken = '';

        if (nr2Cookie) {
            const match = nr2Cookie.value.match(/crf%3d([^;]+?)%3b/);
            if (match) {
                csrfToken = decodeURIComponent(match[1]);
                log(`✅ CSRF Token extraído: ${csrfToken.substring(0, 20)}...`);
            }
        }

        if (!csrfToken) {
            throw new Error('CSRF Token não encontrado nos cookies!');
        }

        await browser.close();

        return { cookies: cookieString, csrfToken };

    } catch (error) {
        await browser.close();
        throw error;
    }
}

// ============================================
// API FETCHER
// ============================================
async function fetchEndpoint(
    endpoint: EndpointConfig,
    auth: { cookies: string; csrfToken: string },
    dateFrom?: string,
    dateTo?: string
): Promise<any> {
    log(`📡 Chamando endpoint: ${endpoint.description}`);

    // Build payload
    const payload: any = {
        versionInfo: {
            moduleVersion: MODULE_VERSION,
            apiVersion: endpoint.apiVersion,
        },
        viewName: 'MainFlow.ServiceRequests',
        screenData: {
            variables: {},
        },
        inputParameters: {},
    };

    // Adicionar filtros de data se necessário
    if (endpoint.requiresDateFilter && dateFrom && dateTo) {
        payload.screenData.variables = {
            SearchKeyword: '',
            StartIndex: 0,
            MaxRecords: 10000,
            TableSort: 'ServiceRequestCreatedAt DESC',
            CategoryId: '0',
            InputFromSchedullingDate: '',
            InputToSchedullingDate: '',
            InputToSubmissionDate: dateTo,
            InputFromSubmissionDate: dateFrom,
            FromSchedullingDate: '1900-01-01T00:00:00',
            ToSchedullingDate: '1900-01-01T00:00:00',
            FromSubmissionDate: toISODate(dateFrom),
            ToSubmissionDate: toISODate(dateTo),
            SelectedRequestStatusText: '',
            SelectedStatus: {
                List: [],
                EmptyListItem: { Value: '', Text: '' },
            },
            IsScheduledDeliveryDateNotDefined: false,
            HasExportPermissions: true,
            SelectedDistrictId: '',
            OnGoingNewVisit: '',
        };

        payload.inputParameters = {
            StartIndex: 0,
            MaxRecords: 10000,
        };
    }

    try {
        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json; charset=UTF-8',
                'x-csrftoken': auth.csrfToken,
                'cookie': auth.cookies,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Extrair contagem se disponível
        const count = data.data?.Count || data.data?.List?.List?.length || 0;
        log(`✅ ${endpoint.description}: ${count} registos obtidos`);

        return data;

    } catch (error) {
        log(`❌ Erro ao chamar ${endpoint.description}: ${error}`, true);
        throw error;
    }
}

// ============================================
// SYNC MAIN FUNCTION
// ============================================
async function syncBackoffice(dateFrom: string, dateTo: string) {
    log('═══════════════════════════════════════════════');
    log('🚀 BACKOFFICE SYNC - MVP (Fase 1)');
    log('═══════════════════════════════════════════════');
    log(`📅 Data De: ${dateFrom} → ${toISODate(dateFrom)}`);
    log(`📅 Data Até: ${dateTo} → ${toISODate(dateTo)}`);

    const startTime = Date.now();

    try {
        // ============================================
        // PASSO 1: AUTENTICAÇÃO
        // ============================================
        const auth = await authenticate();

        // ============================================
        // PASSO 2: FETCH LOOKUP TABLES (cache)
        // ============================================
        log('');
        log('═══════════════════════════════════════════════');
        log('📚 PASSO 2/3: Buscando Lookup Tables (cache)');
        log('═══════════════════════════════════════════════');

        const [categoriesData, districtsData, statusesData] = await Promise.all([
            fetchEndpoint(ENDPOINTS.categories, auth),
            fetchEndpoint(ENDPOINTS.districts, auth),
            fetchEndpoint(ENDPOINTS.statuses, auth),
        ]);

        // Extrair listas
        const categories = categoriesData.data?.List?.List || [];
        const districts = districtsData.data?.List?.List || [];
        const statuses = statusesData.data?.List?.List || [];

        log(`✅ Lookup tables carregadas:`);
        log(`   - Categorias: ${categories.length}`);
        log(`   - Distritos: ${districts.length}`);
        log(`   - Status: ${statuses.length}`);

        // ============================================
        // PASSO 3: FETCH SERVICE REQUESTS (dados principais)
        // ============================================
        log('');
        log('═══════════════════════════════════════════════');
        log('📋 PASSO 3/3: Buscando Service Requests');
        log('═══════════════════════════════════════════════');

        const serviceRequestsData = await fetchEndpoint(
            ENDPOINTS.serviceRequests,
            auth,
            dateFrom,
            dateTo
        );

        const serviceRequests = serviceRequestsData.data?.List?.List || [];
        const totalCount = serviceRequestsData.data?.Count || serviceRequests.length;

        log(`✅ Service Requests obtidos: ${serviceRequests.length} de ${totalCount} total`);

        // ============================================
        // PASSO 4: SALVAR RESULTADOS
        // ============================================
        log('');
        log('═══════════════════════════════════════════════');
        log('💾 Salvando resultados...');
        log('═══════════════════════════════════════════════');

        const timestamp = new Date().toISOString().split('T')[0];
        const output = {
            syncDate: new Date().toISOString(),
            dateRange: {
                from: dateFrom,
                to: dateTo,
                fromISO: toISODate(dateFrom),
                toISO: toISODate(dateTo),
            },
            summary: {
                serviceRequests: serviceRequests.length,
                categories: categories.length,
                districts: districts.length,
                statuses: statuses.length,
            },
            data: {
                serviceRequests,
                lookupTables: {
                    categories,
                    districts,
                    statuses,
                },
            },
        };

        const outputFile = path.join(OUTPUT_PATH, `sync_${dateFrom}_${dateTo}_${timestamp}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

        const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
        log(`✅ Ficheiro salvo: ${outputFile} (${fileSizeMB} MB)`);

        // ============================================
        // RESUMO FINAL
        // ============================================
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        log('');
        log('═══════════════════════════════════════════════');
        log('✅ SYNC CONCLUÍDO COM SUCESSO!');
        log('═══════════════════════════════════════════════');
        log(`⏱️  Duração: ${duration}s`);
        log(`📊 Estatísticas:`);
        log(`   - Service Requests: ${serviceRequests.length}`);
        log(`   - Categorias: ${categories.length}`);
        log(`   - Distritos: ${districts.length}`);
        log(`   - Status: ${statuses.length}`);
        log(`📁 Ficheiro: ${outputFile}`);
        log('═══════════════════════════════════════════════');

        return {
            success: true,
            outputFile,
            stats: output.summary,
            duration: parseFloat(duration),
        };

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log('');
        log('═══════════════════════════════════════════════');
        log(`❌ SYNC FALHOU! (após ${duration}s)`, true);
        log(`Erro: ${error}`, true);
        log('═══════════════════════════════════════════════');

        return {
            success: false,
            error: String(error),
            duration: parseFloat(duration),
        };
    }
}

// ============================================
// CLI EXECUTION
// ============================================
async function main() {
    console.log('\n🚀 BACKOFFICE SYNC - MVP (Fase 1)\n');

    // Parse CLI args
    const args = process.argv.slice(2);
    let dateFrom = formatDateDDMMYYYY(new Date());
    let dateTo = formatDateDDMMYYYY(new Date());

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--from' && args[i + 1]) {
            dateFrom = args[i + 1];
        }
        if (args[i] === '--to' && args[i + 1]) {
            dateTo = args[i + 1];
        }
    }

    console.log(`📅 Data De: ${dateFrom}`);
    console.log(`📅 Data Até: ${dateTo}\n`);

    const result = await syncBackoffice(dateFrom, dateTo);

    if (result.success) {
        console.log(`\n✅ Sync bem-sucedido! Ficheiro: ${result.outputFile}`);
        process.exit(0);
    } else {
        console.error(`\n❌ Sync falhou: ${result.error}`);
        process.exit(1);
    }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// Export for use as module
export { syncBackoffice, authenticate, fetchEndpoint, ENDPOINTS };
