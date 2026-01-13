import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURACOES
const PROVIDERS_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/Providers';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

// PASTAS DE OUTPUT
const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'allocation-outputs');
const LOG_FILE = path.join(DATA_PATH, `allocation-scrapper_${new Date().toISOString().split('T')[0]}.log`);

// TIPOS
export interface AllocationScrapperOptions {
    dateFrom: string  // formato: dd-mm-yyyy
    dateTo: string    // formato: dd-mm-yyyy
    outputPath?: string
    headless?: boolean
}

export interface AllocationScrapperResult {
    success: boolean
    filePath?: string
    error?: string
    recordCount?: number
}

// Funcao de Logger
function log(message: string, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    if (isError) {
        console.error(`X ${formattedMessage}`);
    } else {
        console.log(`> ${formattedMessage}`);
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

// Funcao helper para esperar
async function wait(ms: number, reason: string) {
    log(`Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Funcao principal exportavel para scrapping de historico de alocacao do backoffice
 */
export async function runAllocationHistoryScrapper(options: AllocationScrapperOptions): Promise<AllocationScrapperResult> {
    const {
        dateFrom,
        dateTo,
        outputPath = OUTPUT_PATH,
        headless = false  // Default: false para ver o que acontece
    } = options;

    log('===============================================');
    log('SCRAPPER DE HISTORICO DE ALOCACAO DO BACKOFFICE');
    log(`Periodo: ${dateFrom} ate ${dateTo}`);
    log('===============================================');

    // Criar pastas
    [DATA_PATH, outputPath].forEach(p => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    log('A lancar browser...');
    const browser = await puppeteer.launch({
        headless,
        slowMo: headless ? 0 : 50,  // Mais lento para visualizacao
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
        ],
        // Use Chrome path from env if provided (GitHub Actions sets this)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Configurar download behavior LOGO NO INICIO
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
        log('PASSO 1/6: Navegando para pagina de providers...');
        await page.goto(PROVIDERS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Verificar se precisa fazer login (se foi redirecionado para login)
        const currentUrl = page.url();
        log(`URL atual: ${currentUrl}`);

        if (currentUrl.includes('Login') || currentUrl.includes('login')) {
            log('Preenchendo credenciais...');
            await page.type('input[type="text"], input[name="username"]', USERNAME);
            await page.type('input[type="password"], input[name="password"]', PASSWORD);

            log('A fazer login...');
            await page.click('button[type="submit"], input[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

            // Navegar para providers se nao foi redirecionado automaticamente
            if (!page.url().includes('Providers')) {
                log('Navegando para pagina de providers...');
                await page.goto(PROVIDERS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
            }
        }

        await wait(500, 'Pagina carregada');

        // ============================================
        // PASSO 2: DESMARCAR CHECKBOX PARA MOSTRAR TODOS
        // ============================================
        log('PASSO 2/6: Procurando checkbox para desmarcar e mostrar todos os prestadores...');

        const checkboxFound = await page.evaluate(() => {
            const selectors = [
                '#b3-Checkbox2',
                'input[data-checkbox].checkbox',
                'input.checkbox[type="checkbox"]',
                'input[type="checkbox"]',
            ];

            for (const selector of selectors) {
                const checkboxes = Array.from(document.querySelectorAll(selector));
                for (const cb of checkboxes) {
                    const checkbox = cb as HTMLInputElement;
                    const rect = checkbox.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        const parent = checkbox.closest('span, div, label');
                        const text = parent?.textContent || '';

                        if (checkbox.checked) {
                            checkbox.click();
                            return { found: true, clicked: true, id: checkbox.id, text, wasChecked: true };
                        } else {
                            return { found: true, clicked: false, id: checkbox.id, text, alreadyUnchecked: true };
                        }
                    }
                }
            }
            return { found: false };
        });

        log(`Resultado checkbox: ${JSON.stringify(checkboxFound)}`);

        if (!checkboxFound.found) {
            log('AVISO: Checkbox nao encontrado, continuando mesmo assim...', true);
        } else if (checkboxFound.clicked) {
            log(`Checkbox desmarcado: ${checkboxFound.id}`);
            await wait(3000, 'Aguardar lista atualizar apos desmarcar checkbox');
        } else if (checkboxFound.alreadyUnchecked) {
            log(`Checkbox ja estava desmarcado: ${checkboxFound.id}`);
        }

        // ============================================
        // PASSO 3: CLICAR EXPORTAR HISTORICO DE ALOCACAO
        // ============================================
        log('PASSO 3/6: Procurando botao "Exportar historico de alocacao"...');

        const exportButtonInfo = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('hist') && text.includes('aloca');
            });

            if (exportBtn) {
                const rect = (exportBtn as HTMLElement).getBoundingClientRect();
                return {
                    found: true,
                    text: exportBtn.textContent?.trim(),
                    tag: exportBtn.tagName,
                    visible: rect.width > 0 && rect.height > 0,
                };
            }

            const allButtons = buttons.map(btn => ({
                text: btn.textContent?.trim().substring(0, 50),
                tag: btn.tagName,
            }));

            return { found: false, allButtons };
        });

        log(`Resultado busca botao: ${JSON.stringify(exportButtonInfo)}`);

        if (!exportButtonInfo.found) {
            log('Botoes disponiveis:', true);
            if (exportButtonInfo.allButtons) {
                exportButtonInfo.allButtons.forEach((btn: any, i: number) => {
                    log(`  ${i + 1}. [${btn.tag}] "${btn.text}"`);
                });
            }
            throw new Error('Botao "Exportar historico de alocacao" nao encontrado');
        }

        log(`Botao encontrado: "${exportButtonInfo.text}"`);

        // Scroll para o botao e clicar
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('hist') && text.includes('aloca');
            }) as HTMLElement;

            if (exportBtn) {
                exportBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });

        await wait(300, 'Scroll para botao');

        log('A clicar em "Exportar historico de alocacao"...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('hist') && text.includes('aloca');
            }) as HTMLElement;
            exportBtn?.click();
        });

        await wait(1500, 'Aguardar popup de datas aparecer');

        // ============================================
        // PASSO 4: PREENCHER DATAS NO POPUP
        // ============================================
        log('PASSO 4/6: Preenchendo datas no popup...');

        // Verificar se popup apareceu
        const popupVisible = await page.evaluate(() => {
            // Procurar pelo popup ou pelos inputs de data do popup
            const fromInput = document.getElementById('b3-b8-Input_ScheduledDateMobile3');
            const toInput = document.getElementById('b3-b8-Input_ScheduledDateMobile4');
            return {
                fromInputFound: !!fromInput,
                toInputFound: !!toInput,
            };
        });

        log(`Popup status: ${JSON.stringify(popupVisible)}`);

        if (!popupVisible.fromInputFound || !popupVisible.toInputFound) {
            // Tentar encontrar por outros seletores
            log('Inputs nao encontrados pelos IDs especificos, tentando outros seletores...');

            await wait(2000, 'Aguardar mais tempo para popup');

            // Tirar screenshot para debug
            const screenshotPath = path.join(outputPath, `debug_popup_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: false });
            log(`Screenshot salvo: ${screenshotPath}`);
        }

        // Funcao para preencher data usando Flatpickr (mesmo padrao do service requests)
        // O input visivel e input[type="text"], o hidden e input[type="date"] dentro de span.input-text
        // O _flatpickr esta anexado ao input hidden
        async function fillDateInput(inputId: string, dateString: string, label: string) {
            log(`📅 Preenchendo "${label}" com: ${dateString}`);

            // Converter formato dd-mm-yyyy para ISO yyyy-mm-dd
            const [day, month, year] = dateString.split('-');
            const isoDate = `${year}-${month}-${day}`;
            log(`   Data ISO: ${isoDate}`);

            const result = await page.evaluate((id: string, targetDate: string, displayDate: string) => {
                try {
                    // Metodo 1: Encontrar pelo ID direto (input hidden type="date")
                    let hiddenInput = document.getElementById(id) as any;
                    let visibleInput: HTMLInputElement | null = null;

                    if (hiddenInput) {
                        // Encontrar input visivel associado
                        // Estrutura: <span class="input-text"> -> input[type="date"] + input[type="text"]
                        const parentSpan = hiddenInput.closest('span.input-text, span.input-datetime-local');
                        if (parentSpan) {
                            visibleInput = parentSpan.querySelector('input[type="text"]') as HTMLInputElement;
                        }
                    }

                    // Metodo 2: Procurar pelo input visivel com ID similar e depois encontrar hidden
                    if (!hiddenInput) {
                        // O ID do visible termina em "Input" (ex: ...Input_ScheduledDateMobile3Input)
                        const visibleId = id + 'Input';
                        visibleInput = document.getElementById(visibleId) as HTMLInputElement;

                        if (visibleInput) {
                            const parentSpan = visibleInput.closest('span.input-text, span.input-datetime-local');
                            if (parentSpan) {
                                hiddenInput = parentSpan.querySelector('input[type="date"]') as any;
                            }
                        }
                    }

                    // Metodo 3: Procurar dentro do popup (b3-b8-Datepicker)
                    if (!hiddenInput) {
                        const popup = document.getElementById('b3-b8-Datepicker');
                        if (popup) {
                            const dateInputs = popup.querySelectorAll('input[type="date"]');
                            // Data De = primeiro, Data Ate = segundo
                            const idx = id.includes('Mobile3') ? 0 : 1;
                            if (dateInputs[idx]) {
                                hiddenInput = dateInputs[idx] as any;
                                const parentSpan = hiddenInput.closest('span.input-text, span.input-datetime-local');
                                if (parentSpan) {
                                    visibleInput = parentSpan.querySelector('input[type="text"]') as HTMLInputElement;
                                }
                            }
                        }
                    }

                    if (!hiddenInput) {
                        // Debug: listar todos os inputs de data encontrados
                        const allDateInputs = Array.from(document.querySelectorAll('input[type="date"]'));
                        const inputsInfo = allDateInputs.map((inp: any) => ({
                            id: inp.id,
                            hasFlatpickr: !!inp._flatpickr,
                            parent: inp.parentElement?.className
                        }));
                        return {
                            success: false,
                            error: `Input ${id} nao encontrado. Inputs disponiveis: ${JSON.stringify(inputsInfo)}`
                        };
                    }

                    // CRITICAL: Usar Flatpickr's setDate() se disponivel (como no service requests)
                    if (hiddenInput._flatpickr) {
                        // O segundo parametro true dispara onChange e atualiza o input visivel
                        hiddenInput._flatpickr.setDate(targetDate, true);

                        return {
                            success: true,
                            method: 'flatpickr.setDate',
                            hiddenValue: hiddenInput.value,
                            visibleValue: visibleInput?.value || 'N/A',
                            hasFlatpickr: true
                        };
                    } else {
                        // Fallback: definir manualmente com todos os eventos
                        hiddenInput.value = targetDate;

                        // Disparar eventos no hidden
                        ['change', 'input'].forEach(eventType => {
                            const event = new Event(eventType, { bubbles: true });
                            hiddenInput.dispatchEvent(event);
                        });

                        // Atualizar input visivel tambem
                        if (visibleInput) {
                            visibleInput.value = displayDate;
                            ['change', 'input'].forEach(eventType => {
                                const event = new Event(eventType, { bubbles: true });
                                visibleInput!.dispatchEvent(event);
                            });
                            visibleInput.blur();
                            visibleInput.focus();
                        }

                        return {
                            success: true,
                            method: 'manual',
                            hiddenValue: hiddenInput.value,
                            visibleValue: visibleInput?.value || 'N/A',
                            hasFlatpickr: false
                        };
                    }
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            }, inputId, isoDate, dateString);

            if (!result.success) {
                log(`❌ Erro ao preencher ${label}: ${result.error}`, true);
                throw new Error(result.error);
            }

            log(`✅ Data definida com sucesso (${result.method}):`);
            log(`   Hidden input: "${result.hiddenValue}"`);
            log(`   Visible input: "${result.visibleValue}"`);
            await wait(500, 'Propagacao da mudanca');
        }

        // Preencher data "De"
        await fillDateInput('b3-b8-Input_ScheduledDateMobile3', dateFrom, 'Data De');
        await wait(1000, 'Pausa entre inputs');

        // Preencher data "Ate"
        await fillDateInput('b3-b8-Input_ScheduledDateMobile4', dateTo, 'Data Ate');
        await wait(1500, 'Datas preenchidas');

        // ============================================
        // PASSO 5: CLICAR CONFIRMAR
        // ============================================
        log('PASSO 5/6: Procurando botao "Confirmar"...');

        // Limpar ficheiros Excel antigos ANTES de clicar
        log('Removendo ficheiros Excel antigos...');
        const existingFiles = fs.readdirSync(outputPath);
        const oldExcelFiles = existingFiles.filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
        oldExcelFiles.forEach(file => {
            const oldPath = path.join(outputPath, file);
            fs.unlinkSync(oldPath);
            log(`  Removido: ${file}`);
        });

        const confirmButtonFound = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const confirmBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text === 'confirmar';
            });

            if (confirmBtn) {
                (confirmBtn as HTMLElement).scrollIntoView({ block: 'center' });
                return { found: true, text: confirmBtn.textContent?.trim() };
            }
            return { found: false };
        });

        if (!confirmButtonFound.found) {
            throw new Error('Botao "Confirmar" nao encontrado');
        }

        log('Botao "Confirmar" encontrado, a clicar...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const confirmBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text === 'confirmar';
            }) as HTMLElement;
            confirmBtn?.click();
        });

        await wait(2000, 'Click em Confirmar executado');

        // ============================================
        // PASSO 6: AGUARDAR DOWNLOAD
        // ============================================
        log('PASSO 6/6: Aguardando download do ficheiro...');

        let downloadedFile = '';
        let fileFound = false;

        log(`A monitorizar pasta: ${outputPath}`);

        for (let i = 0; i < 300; i++) {
            const files = fs.readdirSync(outputPath);

            if (i % 10 === 0) {
                log(`Ficheiros na pasta (${i}s): ${files.join(', ') || '(vazio)'}`);
            }

            const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~'));

            if (excelFile) {
                const candidatePath = path.join(outputPath, excelFile);
                const stats = fs.statSync(candidatePath);

                if (stats.size > 1000) {
                    await new Promise(r => setTimeout(r, 2000));
                    const statsAfter = fs.statSync(candidatePath);

                    if (statsAfter.size === stats.size) {
                        downloadedFile = excelFile;
                        fileFound = true;
                        log(`Ficheiro completo detectado: ${excelFile} (${(statsAfter.size / 1024).toFixed(2)} KB)`);
                        break;
                    } else {
                        log(`Ficheiro ainda a ser escrito: ${excelFile} (${stats.size} -> ${statsAfter.size})`);
                    }
                } else {
                    log(`Ficheiro muito pequeno, aguardando: ${excelFile} (${stats.size} bytes)`);
                }
            }

            if (i % 10 === 0 && i > 0) {
                log(`Aguardando download... ${i}s`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (fileFound) {
            const filePath = path.join(outputPath, downloadedFile);

            if (!fs.existsSync(filePath)) {
                log(`ERRO: Ficheiro desapareceu apos deteccao: ${filePath}`, true);
                await browser.close();
                return { success: false, error: 'Ficheiro desapareceu apos download' };
            }

            const stats = fs.statSync(filePath);
            const fileSizeKB = (stats.size / 1024).toFixed(2);

            log('===============================================');
            log('SCRAPPER CONCLUIDO COM SUCESSO!');
            log(`Ficheiro: ${downloadedFile}`);
            log(`Tamanho: ${fileSizeKB} KB`);
            log(`Caminho completo: ${filePath}`);
            log(`Localizacao: ${outputPath}`);
            log('===============================================');

            await browser.close();

            return { success: true, filePath };
        } else {
            log('Download nao completou em 5 minutos (300 segundos)', true);
            await browser.close();
            return { success: false, error: 'Timeout no download (5 minutos)' };
        }

    } catch (error) {
        log(`ERRO: ${error}`, true);
        await browser.close();
        return { success: false, error: String(error) };
    }
}

// ============================================
// CLI EXECUTION
// ============================================
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1];
    const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1];
    const headlessArg = args.includes('--headless');

    // Default: ultimo ano
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const defaultFrom = formatDate(oneYearAgo);
    const defaultTo = formatDate(today);

    console.log('\n SCRAPPER DE HISTORICO DE ALOCACAO DO BACKOFFICE\n');
    console.log('Executando scrapper...');
    console.log(`Modo: ${headlessArg ? 'headless (invisivel)' : 'visivel (browser aberto)'}`);
    console.log(`Periodo: ${fromArg || defaultFrom} ate ${toArg || defaultTo}\n`);

    runAllocationHistoryScrapper({
        dateFrom: fromArg || defaultFrom,
        dateTo: toArg || defaultTo,
        headless: headlessArg
    }).then(result => {
        if (result.success) {
            console.log('\nScrapper bem-sucedido!');
            console.log(`Ficheiro: ${result.filePath}`);
            process.exit(0);
        } else {
            console.error('\nScrapper falhou:', result.error);
            process.exit(1);
        }
    });
}
