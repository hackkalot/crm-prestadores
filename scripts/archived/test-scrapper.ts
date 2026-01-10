/**
 * VERSÃO DE TESTE DO SCRAPPER
 * Para testar localmente com browser visível e logs detalhados
 *
 * Como usar:
 *   npx tsx scripts/test-scrapper.ts
 *   npx tsx scripts/test-scrapper.ts --from=01-01-2026 --to=09-01-2026
 */

import puppeteer from 'puppeteer';
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
const OUTPUT_PATH = path.join(DATA_PATH, 'scrapper-outputs');
const LOG_FILE = path.join(DATA_PATH, `test-scrapper_${new Date().toISOString().split('T')[0]}.log`);

// Criar pastas
[DATA_PATH, OUTPUT_PATH].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Logger melhorado
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

// Função helper para esperar e dar feedback visual
async function wait(ms: number, reason: string) {
    log(`⏳ Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

async function testScrapper(dateFrom: string, dateTo: string) {
    log('═══════════════════════════════════════════════');
    log(`🚀 TESTE DO SCRAPPER - MODO INTERATIVO`);
    log(`📅 Período: ${dateFrom} até ${dateTo}`);
    log('═══════════════════════════════════════════════');

    log('🌐 A lançar browser (visível para debugging)...');
    const browser = await puppeteer.launch({
        headless: false,  // SEMPRE VISÍVEL
        slowMo: 100,      // Slow down para ser mais fácil de seguir
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        // ============================================
        // PASSO 1: LOGIN
        // ============================================
        log('PASSO 1/5: Navegando para página de login...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        log('🔑 Preenchendo credenciais...');
        await page.type('input[type="text"], input[name="username"]', USERNAME, { delay: 0 });
        await page.type('input[type="password"], input[name="password"]', PASSWORD, { delay: 0 });

        log('🔐 A fazer login...');
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        // ============================================
        // PASSO 2: ENCONTRAR INPUTS DE DATA
        // ============================================
        log('PASSO 2/5: Procurando inputs de data...');

        // Esperar por inputs de data aparecerem
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });

        // Análise detalhada dos inputs
        const inputsInfo = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            return inputs.map((input: any, index) => {
                const rect = input.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;

                // Procurar labels próximos (vários métodos)
                let label = '';
                const id = input.id;
                if (id) {
                    const labelEl = document.querySelector(`label[for="${id}"]`);
                    if (labelEl) label = labelEl.textContent || '';
                }

                // Procurar label acima do input
                const parent = input.parentElement;
                if (parent) {
                    const labelInParent = parent.querySelector('label');
                    if (labelInParent) label = labelInParent.textContent || '';

                    // Procurar texto antes do input
                    const previousSibling = parent.previousElementSibling;
                    if (previousSibling && previousSibling.tagName === 'LABEL') {
                        label = previousSibling.textContent || '';
                    }
                }

                // Procurar placeholder
                const placeholder = input.placeholder || '';

                return {
                    index,
                    id: input.id || 'sem-id',
                    name: input.name || 'sem-name',
                    placeholder,
                    label: label.trim(),
                    value: input.value || '',
                    isVisible,
                    classes: input.className || '',
                };
            }).filter(info => info.isVisible);
        });

        log(`🔍 Encontrados ${inputsInfo.length} inputs visíveis:`);
        inputsInfo.forEach((info: any, i: number) => {
            log(`  ${i + 1}. ID: ${info.id}, Label: "${info.label}", Placeholder: "${info.placeholder}"`);
        });

        // Estratégia: Identificar inputs de data (placeholder "dd-mm-aaaa")
        const dateInputs = inputsInfo.filter((info: any) =>
            info.placeholder?.toLowerCase().includes('dd-mm-aaaa') ||
            info.placeholder?.toLowerCase().includes('dd-mm-yyyy')
        );

        log(`📅 Encontrados ${dateInputs.length} inputs de data (placeholder dd-mm-aaaa)`);

        if (dateInputs.length < 2) {
            throw new Error(`❌ Apenas ${dateInputs.length} inputs de data encontrados (esperava pelo menos 2)`);
        }

        // Assumir que os 2 ÚLTIMOS inputs de data são "Data Submissão (De)" e "Data Submissão (Até)"
        const submissionFromInput = dateInputs[dateInputs.length - 2];
        const submissionToInput = dateInputs[dateInputs.length - 1];

        log(`✅ Usando os 2 últimos inputs de data:`);
        log(`   - Input ${dateInputs.length - 1} (De): index ${submissionFromInput.index}`);
        log(`   - Input ${dateInputs.length} (Até): index ${submissionToInput.index}`);

        // ============================================
        // PASSO 3: PREENCHER DATAS
        // ============================================
        log('PASSO 3/5: Preenchendo datas...');

        // Função para preencher data em input específico via calendário
        async function fillDate(inputIndex: number, dateString: string, label: string) {
            log(`📅 Preenchendo "${label}" com: ${dateString}`);

            // Clicar no input para abrir o calendário
            const clicked = await page.evaluate((idx) => {
                const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
                const input = allInputs[idx] as HTMLElement;
                if (!input) return false;
                input.click();
                return true;
            }, inputIndex);

            if (!clicked) {
                throw new Error('Failed to click input');
            }

            await wait(800, 'Calendário abrir');

            // Clicar em "Hoje" no calendário Flatpickr
            const todayClicked = await page.evaluate(() => {
                // Procurar o botão "Hoje" no Flatpickr
                const calendars = document.querySelectorAll('.flatpickr-calendar');
                for (const calendar of calendars) {
                    const rect = calendar.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        // Procurar botão "Hoje"
                        const todayBtn = calendar.querySelector('.flatpickr-today-button, [aria-label*="hoje"], [aria-label*="Hoje"]');
                        if (todayBtn) {
                            (todayBtn as HTMLElement).click();
                            return true;
                        }

                        // Fallback: procurar pela classe do dia de hoje
                        const todayDay = calendar.querySelector('.flatpickr-day.today:not(.nextMonthDay):not(.prevMonthDay)');
                        if (todayDay) {
                            (todayDay as HTMLElement).click();
                            return true;
                        }
                    }
                }
                return false;
            });

            if (!todayClicked) {
                log('⚠️  Botão "Hoje" não encontrado, tentando fechar calendário...');
                // Fechar calendário clicando fora
                await page.keyboard.press('Escape');
            }

            log(`✅ Data "${label}" preenchida`);
        }

        // Preencher primeiro input (Data De)
        await fillDate(submissionFromInput.index, dateFrom, 'Data Submissão (De)');
        await wait(1000, 'Aguardar OutSystems processar primeira data');

        // Preencher segundo input (Data Até)
        await fillDate(submissionToInput.index, dateTo, 'Data Submissão (Até)');
        await wait(2000, 'Aguardar OutSystems processar e aplicar filtros');

        // ============================================
        // PASSO 4: CLICAR EXPORTAR
        // ============================================
        log('PASSO 4/5: Procurando botão "Exportar Dados"...');

        const exportButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const exportBtn = buttons.find(btn =>
                btn.textContent?.trim().toLowerCase() === 'exportar dados'
            );
            if (exportBtn) {
                (exportBtn as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
                return true;
            }
            return false;
        });

        if (!exportButton) {
            throw new Error('❌ Botão "Exportar Dados" não encontrado');
        }

        log('✅ Botão encontrado!');

        // Configurar download behavior e listener ANTES de clicar
        const client = await page.createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: OUTPUT_PATH,
        });

        // Track download progress via CDP events
        let downloadCompleted = false;
        let downloadedFileName = '';

        client.on('Page.downloadProgress', (event: any) => {
            if (event.state === 'completed') {
                downloadCompleted = true;
                downloadedFileName = event.guid;
                log(`✅ Download completed: ${event.guid}`);
            }
        });

        log('🖱️  A clicar em "Exportar Dados"...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const exportBtn = buttons.find(btn =>
                btn.textContent?.trim().toLowerCase() === 'exportar dados'
            ) as HTMLElement;
            exportBtn?.click();
        });

        // ============================================
        // PASSO 5: AGUARDAR DOWNLOAD
        // ============================================
        log('PASSO 5/5: Aguardando download do ficheiro...');

        // Esperar por ficheiro Excel (máximo 60s)
        let downloadedFile = '';
        let fileFound = false;

        for (let i = 0; i < 60; i++) {
            const files = fs.readdirSync(OUTPUT_PATH);
            const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~'));

            if (excelFile) {
                downloadedFile = excelFile;
                fileFound = true;
                break;
            }

            if (i % 5 === 0 && i > 0) {
                log(`⏳ Aguardando download... ${i}s`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (fileFound) {
            const filePath = path.join(OUTPUT_PATH, downloadedFile);
            const stats = fs.statSync(filePath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            log('═══════════════════════════════════════════════');
            log('✅ TESTE CONCLUÍDO COM SUCESSO!');
            log(`📁 Ficheiro: ${downloadedFile}`);
            log(`📊 Tamanho: ${fileSizeMB} MB`);
            log(`📂 Localização: ${OUTPUT_PATH}`);
            log('═══════════════════════════════════════════════');

            await wait(2000, 'Visualização final');
            await browser.close();

            return { success: true, filePath };
        } else {
            log('❌ Download não completou em 60 segundos');
            await page.screenshot({ path: path.join(OUTPUT_PATH, '7-timeout.png'), fullPage: true });
            await browser.close();

            return { success: false, error: 'Timeout no download' };
        }

    } catch (error) {
        log(`🔴 ERRO: ${error}`, true);
        await page.screenshot({ path: path.join(OUTPUT_PATH, 'error.png'), fullPage: true });
        log('📸 Screenshot de erro salvo: error.png');
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

console.log('\n🧪 MODO DE TESTE DO SCRAPPER\n');
console.log('Instruções:');
console.log('  - O browser abrirá VISÍVEL para poderes acompanhar');
console.log('  - Logs detalhados aparecerão no terminal');
console.log('  - Screenshots serão guardados em:', OUTPUT_PATH);
console.log('  - Podes interromper com Ctrl+C a qualquer momento\n');

testScrapper(fromArg || today, toArg || today).then(result => {
    if (result.success) {
        console.log('\n✅ Teste bem-sucedido!');
        console.log(`📁 ${result.filePath}`);
        process.exit(0);
    } else {
        console.error('\n❌ Teste falhou:', result.error);
        console.error('📸 Verifica os screenshots em:', OUTPUT_PATH);
        process.exit(1);
    }
});
