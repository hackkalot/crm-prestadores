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
const OUTPUT_PATH = path.join(DATA_PATH, 'providers-outputs');
const LOG_FILE = path.join(DATA_PATH, `providers-scrapper_${new Date().toISOString().split('T')[0]}.log`);

// TIPOS
export interface ProviderScrapperOptions {
    outputPath?: string
    headless?: boolean
}

export interface ProviderScrapperResult {
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

// Funcao helper para esperar
async function wait(ms: number, reason: string) {
    log(`Aguardando ${ms}ms: ${reason}`);
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Funcao principal exportavel para scrapping de providers do backoffice
 */
export async function runProvidersScrapper(options: ProviderScrapperOptions = {}): Promise<ProviderScrapperResult> {
    const {
        outputPath = OUTPUT_PATH,
        headless = false  // Default: false para ver o que acontece
    } = options;

    log('===============================================');
    log('SCRAPPER DE PROVIDERS DO BACKOFFICE');
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
            '--window-size=1920,1080',
        ]
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
        log('PASSO 1/4: Navegando para pagina de providers...');
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
        // O checkbox deve estar DESMARCADO para mostrar todos os prestadores
        // ============================================
        log('PASSO 2/4: Procurando checkbox para desmarcar e mostrar todos os prestadores...');

        // Procurar checkbox - pode ter varios seletores possiveis
        const checkboxFound = await page.evaluate(() => {
            // Tentar varios seletores para o checkbox
            const selectors = [
                '#b3-Checkbox2',  // ID especifico mencionado
                'input[data-checkbox].checkbox',
                'input.checkbox[type="checkbox"]',
                'input[type="checkbox"]',
            ];

            for (const selector of selectors) {
                const checkboxes = Array.from(document.querySelectorAll(selector));
                for (const cb of checkboxes) {
                    const checkbox = cb as HTMLInputElement;
                    // Verificar se esta visivel
                    const rect = checkbox.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        // Encontrar label ou texto proximo
                        const parent = checkbox.closest('span, div, label');
                        const text = parent?.textContent || '';

                        console.log(`Checkbox encontrado: ${checkbox.id}, checked: ${checkbox.checked}, texto: ${text}`);

                        // Precisamos que esteja DESMARCADO para mostrar todos
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
        // PASSO 3: CLICAR EXPORTAR DADOS
        // ============================================
        log('PASSO 3/4: Procurando botao "Exportar Dados"...');

        // Procurar botao de exportar
        const exportButtonInfo = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('dados');
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

            // Listar todos os botoes para debug
            const allButtons = buttons.map(btn => ({
                text: btn.textContent?.trim().substring(0, 30),
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
            throw new Error('Botao "Exportar Dados" nao encontrado');
        }

        log(`Botao encontrado: "${exportButtonInfo.text}"`);

        // Scroll para o botao e clicar
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('dados');
            }) as HTMLElement;

            if (exportBtn) {
                exportBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });

        await wait(300, 'Scroll para botao');

        log('A clicar em "Exportar Dados"...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('dados');
            }) as HTMLElement;
            exportBtn?.click();
        });

        await wait(500, 'Click executado');

        // ============================================
        // PASSO 4: AGUARDAR DOWNLOAD
        // ============================================
        log('PASSO 4/4: Aguardando download do ficheiro...');

        // Limpar ficheiros Excel antigos ANTES de esperar pelo novo
        log('Removendo ficheiros Excel antigos...');
        const existingFiles = fs.readdirSync(outputPath);
        const oldExcelFiles = existingFiles.filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
        oldExcelFiles.forEach(file => {
            const oldPath = path.join(outputPath, file);
            fs.unlinkSync(oldPath);
            log(`  Removido: ${file}`);
        });

        // Esperar por ficheiro Excel NOVO (maximo 5 minutos = 300s)
        let downloadedFile = '';
        let fileFound = false;

        log(`A monitorizar pasta: ${outputPath}`);

        for (let i = 0; i < 300; i++) {
            const files = fs.readdirSync(outputPath);

            // Log all files every 10 seconds for debugging
            if (i % 10 === 0) {
                log(`Ficheiros na pasta (${i}s): ${files.join(', ') || '(vazio)'}`);
            }

            const excelFile = files.find(f => f.endsWith('.xlsx') && !f.startsWith('~'));

            if (excelFile) {
                // Verificar se o ficheiro esta completo (tamanho > 0 e estavel)
                const candidatePath = path.join(outputPath, excelFile);
                const stats = fs.statSync(candidatePath);

                if (stats.size > 1000) { // Pelo menos 1KB
                    // Esperar 2 segundos e verificar se o tamanho estabilizou
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

            // Verificacao final - o ficheiro ainda existe?
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
    const headlessArg = args.includes('--headless');

    console.log('\n SCRAPPER DE PROVIDERS DO BACKOFFICE\n');
    console.log('Executando scrapper...');
    console.log(`Modo: ${headlessArg ? 'headless (invisivel)' : 'visivel (browser aberto)'}\n`);

    runProvidersScrapper({
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
