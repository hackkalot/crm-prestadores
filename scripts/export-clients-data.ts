import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURACOES
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/Login';
const CLIENTS_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/Clients';
const USERNAME = process.env.BACKOFFICE_USERNAME || 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = process.env.BACKOFFICE_PASSWORD || '12345678';

// PASTAS DE OUTPUT
const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'clients-outputs');
const LOG_FILE = path.join(DATA_PATH, `clients-scrapper_${new Date().toISOString().split('T')[0]}.log`);

// TIPOS
export interface ClientsScrapperOptions {
    outputPath?: string
    headless?: boolean
}

export interface ClientsScrapperResult {
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
 * Funcao principal exportavel para scrapping de clientes do backoffice
 */
export async function runClientsScrapper(options: ClientsScrapperOptions = {}): Promise<ClientsScrapperResult> {
    const {
        outputPath = OUTPUT_PATH,
        headless = false  // Default: false para ver o que acontece
    } = options;

    log('===============================================');
    log('SCRAPPER DE CLIENTES DO BACKOFFICE');
    log('===============================================');

    // Criar pastas
    [DATA_PATH, outputPath].forEach(p => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    log('A lancar browser...');
    const browser = await puppeteer.launch({
        headless,
        slowMo: headless ? 0 : 50,
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
        log('PASSO 1/3: Fazendo login no backoffice...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        log('Preenchendo credenciais...');
        await page.type('input[type="text"], input[name="username"]', USERNAME);
        await page.type('input[type="password"], input[name="password"]', PASSWORD);

        log('A fazer login...');
        await page.click('button[type="submit"], input[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        // Navegar para pagina de clientes
        log('Navegando para pagina de clientes...');
        await page.goto(CLIENTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        const currentUrl = page.url();
        log(`URL atual: ${currentUrl}`);

        await wait(1000, 'Pagina carregada');

        // ============================================
        // PASSO 2: CLICAR "EXPORTAR DADOS"
        // ============================================
        log('PASSO 2/3: Procurando botao "Exportar Dados"...');

        // Esperar que a tabela carregue
        await page.waitForSelector('table, .table-records', { timeout: 10000 }).catch(() => {
            log('Timeout a esperar por tabela, continuando...');
        });
        await wait(2000, 'Aguardar lista carregar');

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
                exportButtonInfo.allButtons.forEach((btn: { text: string; tag: string }, i: number) => {
                    log(`  ${i + 1}. [${btn.tag}] "${btn.text}"`);
                });
            }
            throw new Error('Botao "Exportar Dados" nao encontrado');
        }

        log(`Botao encontrado: "${exportButtonInfo.text}"`);

        // Limpar ficheiros Excel antigos ANTES de clicar
        log('Removendo ficheiros Excel antigos...');
        const existingFiles = fs.readdirSync(outputPath);
        const oldExcelFiles = existingFiles.filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
        oldExcelFiles.forEach(file => {
            const oldPath = path.join(outputPath, file);
            fs.unlinkSync(oldPath);
            log(`  Removido: ${file}`);
        });

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

        await wait(500, 'Scroll para botao');

        log('A clicar em "Exportar Dados"...');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const exportBtn = buttons.find(btn => {
                const text = btn.textContent?.trim().toLowerCase() || '';
                return text.includes('exportar') && text.includes('dados');
            }) as HTMLElement;
            exportBtn?.click();
        });

        await wait(1000, 'Click executado');

        // ============================================
        // PASSO 3: AGUARDAR DOWNLOAD
        // ============================================
        log('PASSO 3/3: Aguardando download do ficheiro...');

        // Esperar por ficheiro Excel NOVO (maximo 10 minutos = 600s)
        let downloadedFile = '';
        let fileFound = false;

        log(`A monitorizar pasta: ${outputPath}`);

        for (let i = 0; i < 600; i++) {
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
            log('Download nao completou em 10 minutos (600 segundos)', true);

            // Screenshot para debug
            const screenshotPath = path.join(outputPath, `timeout_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            log(`Screenshot salvo: ${screenshotPath}`);

            await browser.close();
            return { success: false, error: 'Timeout no download (10 minutos)' };
        }

    } catch (error) {
        log(`ERRO: ${error}`, true);

        // Screenshot para debug
        try {
            const screenshotPath = path.join(outputPath, `error_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            log(`Screenshot de erro salvo: ${screenshotPath}`);
        } catch (e) {
            // Ignorar erro de screenshot
        }

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

    console.log('\n SCRAPPER DE CLIENTES DO BACKOFFICE\n');
    console.log('Executando scrapper...');
    console.log(`Modo: ${headlessArg ? 'headless (invisivel)' : 'visivel (browser aberto)'}\n`);

    runClientsScrapper({
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
