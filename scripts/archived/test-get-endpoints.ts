/**
 * TEST GET ENDPOINTS - Tentativa e Erro
 *
 * Testa vários padrões de endpoints GET para descobrir APIs REST "escondidas"
 * que não foram capturadas durante a navegação com Puppeteer.
 *
 * Como usar:
 *   npx tsx scripts/test-get-endpoints.ts
 */

import puppeteer from 'puppeteer';

const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

// ============================================
// PATTERNS TO TEST
// ============================================
const BASE_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice';

const TEST_ENDPOINTS = [
    // REST API v1 patterns
    `${BASE_URL}/api/service-requests`,
    `${BASE_URL}/api/service-requests/SR116935`,
    `${BASE_URL}/api/v1/service-requests`,
    `${BASE_URL}/api/v1/service-requests/SR116935`,

    // REST module patterns
    `${BASE_URL}/rest/ServiceRequest`,
    `${BASE_URL}/rest/ServiceRequest/SR116935`,
    `${BASE_URL}/rest/v1/service-requests`,
    `${BASE_URL}/rest/FXBO_ServiceRequest_CW/ServiceRequest`,
    `${BASE_URL}/rest/FXBO_ServiceRequest_CW/ServiceRequest/SR116935`,

    // OData patterns
    `${BASE_URL}/odata/ServiceRequest`,
    `${BASE_URL}/odata/ServiceRequest('SR116935')`,

    // GraphQL
    `${BASE_URL}/graphql`,

    // Direct entity patterns
    `${BASE_URL}/ServiceRequest/SR116935`,
    `${BASE_URL}/ServiceRequests`,
    `${BASE_URL}/ServiceRequests/SR116935`,

    // Screen services with GET (unlikely but worth trying)
    `${BASE_URL}/screenservices/FXBO_ServiceRequest_CW/RequestList/RequestsList/ScreenDataSetGetRequests`,

    // Module REST services
    `${BASE_URL}/FXBO_ServiceRequest_CW.aspx/ServiceRequest`,
    `${BASE_URL}/FXBO_ServiceRequest_CW/ServiceRequest`,

    // JSON endpoints
    `${BASE_URL}/data/service-requests.json`,
    `${BASE_URL}/api/data/service-requests`,

    // Metadata endpoints
    `${BASE_URL}/swagger.json`,
    `${BASE_URL}/api-docs`,
    `${BASE_URL}/api/docs`,
    `${BASE_URL}/.well-known/api`,
    `${BASE_URL}/metadata`,
    `${BASE_URL}/api/metadata`,

    // Entity framework patterns
    `${BASE_URL}/entities/ServiceRequest`,
    `${BASE_URL}/entities/ServiceRequest/SR116935`,
];

// ============================================
// AUTHENTICATION
// ============================================
async function authenticate() {
    console.log('🔐 Autenticando...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
    await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const nr2Cookie = cookies.find(c => c.name === 'nr2FixoUsers');
    let csrfToken = '';
    if (nr2Cookie) {
        const match = nr2Cookie.value.match(/crf%3d([^;]+?)%3b/);
        if (match) {
            csrfToken = decodeURIComponent(match[1]);
        }
    }

    await browser.close();
    console.log('✅ Autenticado!');

    return { cookies: cookieString, csrfToken };
}

// ============================================
// TEST GET ENDPOINT
// ============================================
async function testGETEndpoint(
    url: string,
    cookies: string,
    csrfToken: string
): Promise<{ success: boolean; status: number; data?: any; error?: string }> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'cookie': cookies,
                'x-csrftoken': csrfToken,
            },
        });

        const contentType = response.headers.get('content-type') || '';
        let data = null;

        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch {
                data = await response.text();
            }
        } else {
            data = await response.text();
        }

        return {
            success: response.ok,
            status: response.status,
            data,
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: String(error),
        };
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function main() {
    console.log('\n🔍 TEST GET ENDPOINTS - Tentativa e Erro\n');
    console.log(`📊 Testando ${TEST_ENDPOINTS.length} endpoints...\n`);

    const { cookies, csrfToken } = await authenticate();

    const results = {
        success: [] as string[],
        notFound: [] as string[],
        forbidden: [] as string[],
        methodNotAllowed: [] as string[],
        error: [] as string[],
        other: [] as Array<{ url: string; status: number }>,
    };

    for (const url of TEST_ENDPOINTS) {
        process.stdout.write(`Testing: ${url.replace(BASE_URL, '')}... `);

        const result = await testGETEndpoint(url, cookies, csrfToken);

        if (result.success && result.status === 200) {
            console.log(`✅ SUCCESS (200)`);
            results.success.push(url);
        } else if (result.status === 404) {
            console.log(`❌ Not Found (404)`);
            results.notFound.push(url);
        } else if (result.status === 403) {
            console.log(`🚫 Forbidden (403)`);
            results.forbidden.push(url);
        } else if (result.status === 405) {
            console.log(`⛔ Method Not Allowed (405)`);
            results.methodNotAllowed.push(url);
        } else if (result.status === 0) {
            console.log(`💥 Error: ${result.error}`);
            results.error.push(url);
        } else {
            console.log(`❓ Other (${result.status})`);
            results.other.push({ url, status: result.status });
        }

        // Rate limiting - wait 200ms between requests
        await new Promise(r => setTimeout(r, 200));
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 RESULTADOS');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ Success (200):           ${results.success.length}`);
    console.log(`❌ Not Found (404):         ${results.notFound.length}`);
    console.log(`🚫 Forbidden (403):         ${results.forbidden.length}`);
    console.log(`⛔ Method Not Allowed (405): ${results.methodNotAllowed.length}`);
    console.log(`💥 Network Errors:          ${results.error.length}`);
    console.log(`❓ Other Status:            ${results.other.length}`);
    console.log('═══════════════════════════════════════════════\n');

    // Show successful endpoints
    if (results.success.length > 0) {
        console.log('🎉 ENDPOINTS GET QUE FUNCIONAM:');
        results.success.forEach(url => {
            console.log(`   ✅ ${url}`);
        });
        console.log();
    } else {
        console.log('❌ Nenhum endpoint GET encontrado.\n');
    }

    // Show method not allowed (means endpoint exists but doesn't support GET)
    if (results.methodNotAllowed.length > 0) {
        console.log('⚠️  ENDPOINTS QUE EXISTEM MAS NÃO SUPORTAM GET (405):');
        results.methodNotAllowed.forEach(url => {
            console.log(`   ⛔ ${url}`);
        });
        console.log();
    }

    // Show forbidden (might be interesting)
    if (results.forbidden.length > 0) {
        console.log('🔒 ENDPOINTS PROIBIDOS (403 - podem existir mas sem permissão):');
        results.forbidden.forEach(url => {
            console.log(`   🚫 ${url}`);
        });
        console.log();
    }

    // Show other interesting statuses
    if (results.other.length > 0) {
        console.log('❓ OUTROS STATUS (podem ser interessantes):');
        results.other.forEach(({ url, status }) => {
            console.log(`   ${status}: ${url}`);
        });
        console.log();
    }

    console.log('═══════════════════════════════════════════════');
    console.log('✅ TESTE CONCLUÍDO');
    console.log('═══════════════════════════════════════════════\n');

    // Save results to file
    const outputPath = 'data/api-discovery/get-endpoints-test-results.json';
    const output = {
        testDate: new Date().toISOString(),
        totalTested: TEST_ENDPOINTS.length,
        results,
    };

    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`📁 Resultados salvos em: ${outputPath}\n`);
}

main().catch(console.error);
