import { chromium } from 'playwright';
import { spawn } from 'child_process';

const cwd = process.cwd();
const port = process.env.BUBBLE_COUPLE_PORT || '4173';

function startDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['dev', '--', '--port', port], {
      cwd,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes(`Local:   http://localhost:${port}/`)) {
        resolve(child);
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });
}

(async () => {
  const serverProcess = await startDevServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });

  const serverUrl = `http://localhost:${port}`;
  await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Navigate to online lobby
  await page.getByRole('button', { name: /online/i }).click();
  await page.waitForTimeout(500);

  // Try clicking PVP quick match
  await page.getByRole('button', { name: /PVP 对战/ }).click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'scripts/debug-lobby.png', fullPage: true });

  await browser.close();
  serverProcess.kill('SIGTERM');
})();
