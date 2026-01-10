import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÕES
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

// PASTAS DE OUTPUT
const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'scrapper-outputs');
const LOG_FILE = path.join(DATA_PATH, `scrapper_${new Date().toISOString().split('T')[0]}.log`);

// TIPOS
export interface ScrapperOptions {
    dateFrom: string  // formato: dd-mm-yyyy
    dateTo: string    // formato: dd-mm-yyyy
    outputPath?: string
    headless?: boolean
}

export interface ScrapperResult {
    success: boolean
    filePath?: string
    error?: string
    recordCount?: number
}

// Função de Logger
function log(message: string, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    if (isError) {
        console.error(`❌ ${formattedMessage}`);
    } else {
        console.log(`✅ ${formattedMessage}`);
    }

    try {
        if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });
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

// Função helper para esperar
async function wait(ms: number, reason: string) {
    log(`⏳ Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Função principal exportável para scrapping de dados do backoffice
 */
export async function runScrapper(options: ScrapperOptions): Promise<ScrapperResult> {
    const {
        dateFrom,
        dateTo,
        outputPath = OUTPUT_PATH,
        headless = true
    } = options;

    log('═══════════════════════════════════════════════');
    log(`🚀 Scrapper de Backoffice`);
    log(`📅 Período: ${dateFrom} até ${dateTo}`);
    log('═══════════════════════════════════════════════');

    // Criar pastas
    [DATA_PATH, outputPath].forEach(p => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    log('🌐 A lançar browser...');
    const browser = await puppeteer.launch({
        headless,
        slowMo: headless ? 0 : 100,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Configurar download behavior LOGO NO INÍCIO (crucial para headless mode)
    const client = await page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: outputPath,
        eventsEnabled: true
    });

    try {
        // ============================================
        // PASSO 1: LOGIN
        // ============================================
        log('PASSO 1/5: Navegando para página de login...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        log('🔑 Preenchendo credenciais...');
        await page.type('input[type="text"], input[name="username"]', USERNAME);
        await page.type('input[type="password"], input[name="password"]', PASSWORD);

        log('🔐 A fazer login...');
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await wait(1000, 'Login concluído');

        // ============================================
        // PASSO 2: ENCONTRAR INPUTS DE DATA
        // ============================================
        log('PASSO 2/5: Procurando inputs de data...');

        // Esperar por inputs de data aparecerem
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        await wait(1000, 'Inputs carregados');

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

        log(`🔍 Encontrados ${inputsInfo.length} inputs visíveis`);

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

        // Função para preencher data em input específico usando a API do Flatpickr
        async function fillDate(inputIndex: number, dateString: string, label: string) {
            log(`📅 Preenchendo "${label}" com: ${dateString}`);

            // Converter formato dd-mm-yyyy para Date object
            const [day, month, year] = dateString.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            log(`   Data: ${dateObj.toISOString()}`);

            // Encontrar o input visível pelo índice e usar setDate() do Flatpickr
            const result = await page.evaluate((idx: number, targetDate: string) => {
                try {
                    // Encontrar o input visível
                    const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
                    const visibleInput = allInputs[idx] as HTMLInputElement;

                    if (!visibleInput) {
                        return { success: false, error: 'Input visível não encontrado' };
                    }

                    // Encontrar o input hidden (type="date")
                    const parentSpan = visibleInput.closest('span.input-text');
                    if (!parentSpan) {
                        return { success: false, error: 'Parent span não encontrado' };
                    }

                    const hiddenInput = parentSpan.querySelector('input[type="date"]') as any;
                    if (!hiddenInput) {
                        return { success: false, error: 'Input hidden não encontrado' };
                    }

                    // CRITICAL: Use Flatpickr's _flatpickr instance if available
                    if (hiddenInput._flatpickr) {
                        // Use Flatpickr's setDate() method which triggers all necessary events
                        hiddenInput._flatpickr.setDate(targetDate, true); // true = trigger onChange

                        return {
                            success: true,
                            method: 'flatpickr.setDate',
                            hiddenValue: hiddenInput.value,
                            visibleValue: visibleInput.value
                        };
                    } else {
                        // Fallback: Manual setting with all events
                        const [year, month, day] = targetDate.split('-');
                        const isoDate = `${year}-${month}-${day}`;
                        const displayDate = `${day}-${month}-${year}`;

                        // Set values
                        hiddenInput.value = isoDate;
                        visibleInput.value = displayDate;

                        // Trigger all necessary events
                        ['change', 'input'].forEach(eventType => {
                            const event = new Event(eventType, { bubbles: true });
                            hiddenInput.dispatchEvent(event);
                            visibleInput.dispatchEvent(event);
                        });

                        // Force blur/focus
                        visibleInput.blur();
                        visibleInput.focus();

                        return {
                            success: true,
                            method: 'manual',
                            hiddenValue: hiddenInput.value,
                            visibleValue: visibleInput.value
                        };
                    }
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            }, inputIndex, `${year}-${month}-${day}`);

            if (!result.success) {
                log(`❌ Erro: ${result.error}`, true);
                throw new Error(result.error);
            }

            log(`✅ Data definida com sucesso (${result.method}):`);
            log(`   Hidden input: "${result.hiddenValue}"`);
            log(`   Visible input: "${result.visibleValue}"`);

            await wait(500, 'Aguardar propagação da mudança');
        }

        // Preencher primeiro input (Data De)
        await fillDate(submissionFromInput.index, dateFrom, 'Data Submissão (De)');
        await wait(1000, 'Pausa entre inputs');

        // Preencher segundo input (Data Até)
        await fillDate(submissionToInput.index, dateTo, 'Data Submissão (Até)');
        await wait(3000, 'Aguardar sistema processar filtros (ambas as datas)');

        // Tirar screenshot para debug (opcional)
        const screenshotPath = path.join(outputPath, `debug_filters_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        log(`📸 Screenshot salvo: ${screenshotPath}`);

        // Verificar se as datas foram realmente aplicadas
        const finalValues = await page.evaluate((fromIdx: number, toIdx: number) => {
            const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const fromInput = allInputs[fromIdx] as HTMLInputElement;
            const toInput = allInputs[toIdx] as HTMLInputElement;

            // Tentar diferentes métodos para encontrar os inputs hidden
            let fromHidden: HTMLInputElement | null = null;
            let toHidden: HTMLInputElement | null = null;

            // Método 1: span.input-text parent
            const fromParent = fromInput?.closest('span.input-text');
            const toParent = toInput?.closest('span.input-text');
            if (fromParent) fromHidden = fromParent.querySelector('input[type="date"]');
            if (toParent) toHidden = toParent.querySelector('input[type="date"]');

            // Método 2: procurar por ID (se tiver)
            if (!fromHidden && fromInput?.id) {
                const possibleId = fromInput.id.replace('Input', '');
                fromHidden = document.getElementById(possibleId) as HTMLInputElement;
            }
            if (!toHidden && toInput?.id) {
                const possibleId = toInput.id.replace('Input', '');
                toHidden = document.getElementById(possibleId) as HTMLInputElement;
            }

            // Método 3: procurar siblings
            if (!fromHidden && fromInput) {
                fromHidden = fromInput.parentElement?.querySelector('input[type="date"]') || null;
            }
            if (!toHidden && toInput) {
                toHidden = toInput.parentElement?.querySelector('input[type="date"]') || null;
            }

            return {
                fromVisible: fromInput?.value || 'N/A',
                toVisible: toInput?.value || 'N/A',
                fromHidden: fromHidden?.value || 'N/A',
                toHidden: toHidden?.value || 'N/A',
                fromInputId: fromInput?.id || 'sem-id',
                toInputId: toInput?.id || 'sem-id',
            };
        }, submissionFromInput.index, submissionToInput.index);

        log('🔍 VERIFICAÇÃO FINAL DAS DATAS:');
        log(`   Data De (visível): ${finalValues.fromVisible} (ID: ${finalValues.fromInputId})`);
        log(`   Data De (hidden): ${finalValues.fromHidden}`);
        log(`   Data Até (visível): ${finalValues.toVisible} (ID: ${finalValues.toInputId})`);
        log(`   Data Até (hidden): ${finalValues.toHidden}`);

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
        await wait(1000, 'Scroll para botão');

        log('🖱️  A clicar em "Exportar Dados"...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const exportBtn = buttons.find(btn =>
                btn.textContent?.trim().toLowerCase() === 'exportar dados'
            ) as HTMLElement;
            exportBtn?.click();
        });

        await wait(2000, 'Click executado');

        // ============================================
        // PASSO 5: AGUARDAR DOWNLOAD
        // ============================================
        log('PASSO 5/5: Aguardando download do ficheiro...');

        // Limpar ficheiros Excel antigos ANTES de esperar pelo novo
        log('🧹 Removendo ficheiros Excel antigos...');
        const existingFiles = fs.readdirSync(outputPath);
        const oldExcelFiles = existingFiles.filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
        oldExcelFiles.forEach(file => {
            const oldPath = path.join(outputPath, file);
            fs.unlinkSync(oldPath);
            log(`   Removido: ${file}`);
        });

        // Esperar por ficheiro Excel NOVO (máximo 10 minutos = 600s)
        let downloadedFile = '';
        let fileFound = false;

        for (let i = 0; i < 600; i++) {
            const files = fs.readdirSync(outputPath);
            const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~'));

            if (excelFile) {
                downloadedFile = excelFile;
                fileFound = true;
                break;
            }

            if (i % 10 === 0 && i > 0) {
                log(`⏳ Aguardando download... ${i}s`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (fileFound) {
            const filePath = path.join(outputPath, downloadedFile);
            const stats = fs.statSync(filePath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            log('═══════════════════════════════════════════════');
            log('✅ SCRAPPER CONCLUÍDO COM SUCESSO!');
            log(`📁 Ficheiro: ${downloadedFile}`);
            log(`📊 Tamanho: ${fileSizeMB} MB`);
            log(`📂 Localização: ${outputPath}`);
            log('═══════════════════════════════════════════════');

            await wait(1000, 'Finalização');
            await browser.close();

            return { success: true, filePath };
        } else {
            log('❌ Download não completou em 10 minutos (600 segundos)', true);
            await browser.close();

            return { success: false, error: 'Timeout no download (10 minutos)' };
        }

    } catch (error) {
        log(`🔴 ERRO: ${error}`, true);
        await browser.close();

        return { success: false, error: String(error) };
    }
}

// ============================================
// CLI EXECUTION (backward compatibility)
// ============================================
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1];
    const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1];
    const headlessArg = args.includes('--headless');

    const today = formatDate(new Date());

    console.log('\n🤖 SCRAPPER DE BACKOFFICE\n');
    console.log('Executando scrapper...\n');

    runScrapper({
        dateFrom: fromArg || today,
        dateTo: toArg || today,
        headless: headlessArg
    }).then(result => {
        if (result.success) {
            console.log('\n✅ Scrapper bem-sucedido!');
            console.log(`📁 ${result.filePath}`);
            process.exit(0);
        } else {
            console.error('\n❌ Scrapper falhou:', result.error);
            process.exit(1);
        }
    });
}
