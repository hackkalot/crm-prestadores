
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÕES
const LOGIN_URL = 'https://fidelidadep10.outsystemsenterprise.com/FixoBackoffice/ServiceRequests';
const USERNAME = 'sofia.amaral.brites@fidelidade.pt';
const PASSWORD = '12345678';

// PASTAS DE OUTPUT
const DATA_PATH = path.resolve(__dirname, '../data');
const OUTPUT_PATH = path.join(DATA_PATH, 'scrapper-outputs');
const LOG_FILE = path.join(DATA_PATH, `scrapper_${new Date().toISOString().split('T')[0]}.log`);

// Função de Logger
function log(message: string, isError = false) {
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] ${message}`;
    if (isError) console.error(formattedMessage);
    else console.log(formattedMessage);

    try {
        if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true });
        fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
    } catch (err) {
        console.error('Erro log:', err);
    }
}

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function exportData() {
    log('🚀 Iniciando scrapper robótico Backoffice FIXO...');

    [DATA_PATH, OUTPUT_PATH].forEach(p => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
        ]
    });

    let page: any = null;
    try {
        page = await browser.newPage();

        // Logs do browser no terminal
        page.on('console', (msg: any) => log(`[BROWSER] ${msg.text()}`));

        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: OUTPUT_PATH,
        });

        log(`🔗 Navegando para: ${LOGIN_URL}`);
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

        // 1. LOGIN
        if (page.url().includes('Login')) {
            log('🔑 A autenticar...');
            await page.waitForSelector('#Input_UsernameVal');
            await page.type('#Input_UsernameVal', USERNAME);
            await page.type('#Input_PasswordVal', PASSWORD);
            await Promise.all([
                page.click('button.btn-primary'),
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
            ]);
            log('✅ Login efetuado.');
        }

        // 2. AGUARDAR PÁGINA DE PEDIDOS
        log('⏳ A aguardar carregamento da lista e filtros...');
        await page.waitForSelector('.list-container, .table', { timeout: 30000 });
        // Pausa extra para garantir que a barra lateral de filtros (pesada em JS) carregue
        await new Promise(r => setTimeout(r, 5000));

        // 3. DEFINIR DATAS (Modo Botão Hoje)
        log(`📅 Alvo: Selecionar "Hoje" no 4º e 5º inputs (Submissão) via calendário`);

        const selectTodayInCalendar = async (inputIndex: number, label: string) => {
            const allInputs = await page.$$('input.form-control');
            const visibleInputsList = [];
            for (const input of allInputs) {
                const info = await input.evaluate((el: any) => ({
                    id: el.id,
                    placeholder: el.getAttribute('placeholder'),
                    isVisible: el.getBoundingClientRect().width > 0,
                    value: el.value
                }));
                if (info.isVisible) visibleInputsList.push({ handle: input, ...info });
            }

            log(`🔎 [DEBUG] Inputs visíveis encontrados (${visibleInputsList.length}):`);
            visibleInputsList.forEach((inp, i) => {
                log(`   [${i}] ID: ${inp.id || '(sem id)'} | Placeholder: ${inp.placeholder || '(limpo)'} | Valor: ${inp.value}`);
            });

            if (visibleInputsList[inputIndex]) {
                const input = visibleInputsList[inputIndex].handle;
                log(`📅 Abrindo calendário do ${label} (Índice ${inputIndex})...`);

                await input.evaluate((el: any) => el.scrollIntoView());
                await input.click();

                await new Promise(r => setTimeout(r, 1000));

                log(`🖱️ Clicando em "Hoje" para ${label}...`);
                const clicked = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const todayLink = links.find(a => a.textContent?.trim() === 'Hoje');
                    if (todayLink) {
                        (todayLink as HTMLElement).click();
                        return true;
                    }
                    return false;
                });

                if (clicked) {
                    log(`✅ "Hoje" selecionado para ${label}.`);
                } else {
                    log(`⚠️ Não encontrei o botão "Hoje" para ${label}. A tentar fallback...`);
                    await page.click('.flatpickr-day.today').catch(() => { });
                }
            }
        };

        // Atacar o 4º e 5º inputs visíveis (índices 3 e 4)
        await selectTodayInCalendar(3, '4º input');
        await new Promise(r => setTimeout(r, 1000));
        await selectTodayInCalendar(4, '5º input');

        // PAUSA PARA INSPEÇÃO VISUAL
        log('⏳ Aguardando 30 segundos para validação visual...');
        await new Promise(r => setTimeout(r, 30000));

        /* 
        // ==========================================================
        // 4. CLICAR NO BOTÃO DE EXPORTAR (DESATIVADO PARA DEBUG)
        // ==========================================================
        
        log('📤 Procurando botões de exportação...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 2000));

        const buttonInfo = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const texts = btns.map(b => b.textContent?.trim());
            const exportBtn = btns.find(b => b.textContent?.toLowerCase().includes('exportar dados'));
            
            if (exportBtn) {
                exportBtn.scrollIntoView();
                return {
                    found: true,
                    text: exportBtn.textContent?.trim(),
                    id: exportBtn.id,
                    allButtons: texts
                };
            }
            return { found: false, allButtons: texts };
        });

        if (!buttonInfo.found) {
            log('❌ Botão "Exportar Dados" não encontrado.', true);
            await page.screenshot({ path: path.join(OUTPUT_PATH, 'error_button_not_found.png'), fullPage: true });
        } else {
            log(`🎯 A clicar no botão: "${buttonInfo.text}"`);
            
            if (buttonInfo.id) {
                await page.click(`#${buttonInfo.id}`);
            } else {
                await page.evaluate((btnText: string) => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const btn = btns.find(b => b.textContent?.trim() === btnText);
                    (btn as HTMLElement)?.click();
                }, buttonInfo.text);
            }

            log('📥 Botão premido. O spinner deve aparecer. Monitorizando download (limite 5 min)...');
            await page.screenshot({ path: path.join(OUTPUT_PATH, 'after_click_debug.png'), fullPage: true });
            
            // MONITORIZAÇÃO DE DOWNLOAD
            let fileFound = false;
            for (let i = 0; i < 300; i++) { 
                const files = fs.readdirSync(OUTPUT_PATH);
                const downloadedFiles = files.filter(f => !f.endsWith('.png') && !f.startsWith('.'));
                
                if (downloadedFiles.length > 0) {
                    log(`🎯 SUCESSO! Ficheiro detetado: ${downloadedFiles[0]}`);
                    fileFound = true;
                    break;
                }
                
                if (i % 30 === 0 && i > 0) log(`... ainda aguardando download (${i}s)...`);
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!fileFound) {
                log('⚠️ O download excedeu os 5 minutos de espera.', true);
            }
        }
        */

    } catch (error) {
        log(`🔴 Erro fatal: ${error}`, true);
        if (page) {
            await page.screenshot({ path: path.join(OUTPUT_PATH, 'crash.png') });
        }
    } finally {
        await browser.close();
        log('🏁 Processo terminado.');
    }
}

exportData();
