import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 5202; const BASE_URL = `http://localhost:${PORT}`; const OUTPUT_DIR = path.resolve('artifacts/review/memory-boarding-passes');
async function waitForServer() { const start = Date.now(); while (Date.now() - start < 30_000) { try { if ((await fetch(BASE_URL)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 300)); } throw new Error('Regression capture server did not start'); }
async function freshPage(browser: Browser, spawn: string, errors: string[]) { const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', (error) => errors.push(error.stack ?? error.message)); await page.addInitScript(() => localStorage.removeItem('project-taj:save')); await page.goto(`${BASE_URL}?spawn=${spawn}`, { waitUntil: 'networkidle', timeout: 60_000 }); await page.waitForSelector('canvas'); await page.waitForTimeout(4500); return page; }
async function activate(page: Page, prompt: string) { await page.getByRole('button', { name: prompt }).waitFor(); await page.keyboard.press('KeyE'); await page.waitForTimeout(1250); return page.getByRole('dialog', { name: 'Memory narration' }); }
async function shot(page: Page, name: string) { await page.screenshot({ path: path.join(OUTPUT_DIR, name), timeout: 30_000 }); await page.close(); }
async function run() {
  let server: ChildProcess | undefined; let browser: Browser | undefined; const errors: string[] = [];
  try {
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ENABLE_DEBUG_TOOLS: 'true' }, stdio: 'pipe' }); await waitForServer(); browser = await chromium.launch();
    let page = await freshPage(browser, '-22,2,-60.5', errors); let dialogue = await activate(page, 'Remember The Mints'); await dialogue.waitFor(); await shot(page, 'boarding-passes-28-mints-regression.png');
    page = await freshPage(browser, '-38.3,2,-136', errors); dialogue = await activate(page, 'Remember That One Word: Back'); await dialogue.waitFor(); await page.keyboard.press('Enter'); await page.waitForTimeout(520); await dialogue.getByText('Back.', { exact: true }).waitFor(); await shot(page, 'boarding-passes-29-back-regression.png');
    page = await freshPage(browser, '38.3,2,-136', errors); dialogue = await activate(page, 'Remember The Umbrella'); await dialogue.waitFor(); await page.keyboard.press('Enter'); await dialogue.getByText('…just so you could walk outside and see me off.', { exact: true }).waitFor(); await shot(page, 'boarding-passes-30-umbrella-regression.png');
    page = await freshPage(browser, '-20,2,-120.5', errors); dialogue = await activate(page, 'Remember The Little Details'); await dialogue.waitFor(); await page.keyboard.press('Enter'); await dialogue.getByText('…and everything else that came to your mind.', { exact: true }).waitFor(); await shot(page, 'boarding-passes-31-little-details-regression.png');
    page = await freshPage(browser, '-5.5,5.4,-172.5', errors); dialogue = await activate(page, 'Remember The All-Day Call'); await dialogue.waitFor(); await page.keyboard.press('Enter'); await dialogue.getByText('…not in words, and not in writing…', { exact: true }).waitFor(); await shot(page, 'boarding-passes-32-all-day-call-regression.png');
    if (errors.length) throw new Error(`Browser page errors:\n${errors.join('\n')}`); console.log(`Generated and browser-validated 5 fresh-page prior-memory regression captures in ${OUTPUT_DIR}`);
  } finally { if (browser) await browser.close(); if (server) server.kill(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
