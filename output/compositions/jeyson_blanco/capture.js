#!/usr/bin/env node
// capture.js — jeyson_blanco (Windows-adapted)
// Captura PNGs por frame de cada beat HTML y los codifica a ProRes 4444 con alfa.

const puppeteer = require('../../../skills/hyperframes/node_modules/.bun/puppeteer-core@24.40.0/node_modules/puppeteer-core');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Configuración ────────────────────────────────────────────────────────────
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG = process.env.FFMPEG_BIN || 'C:\\Users\\geofo\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const FFPROBE = process.env.FFPROBE_BIN || 'C:\\Users\\geofo\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe';

const FPS = parseInt(process.env.VIDEO_FPS || '30', 10);
const W = parseInt(process.env.VIDEO_W || '540', 10);
const H = parseInt(process.env.VIDEO_H || '960', 10);

const COMP_DIR = __dirname;
const OUT_DIR = path.join(COMP_DIR, 'renders');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Lista de beats ───────────────────────────────────────────────────────────
const BEATS = [
  { file: 'beat_01_intro.html',    duration: 4.5 },
  { file: 'beat_02_problema.html', duration: 3.3 },
  { file: 'beat_03_cta.html',      duration: 2.3 },
  { file: 'beat_04_karaoke.html',  duration: 10.5 },
];

// ── Captura ──────────────────────────────────────────────────────────────────
async function captureBeat(browser, beat) {
  const name = beat.file.replace('.html', '');
  const framesDir = path.join(os.tmpdir(), `hf_${name}_${Date.now()}`);
  fs.mkdirSync(framesDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  // Marcar modo captura ANTES de cargar la página, así render(t) no autoanima
  await page.evaluateOnNewDocument(() => {
    window.__captureMode = true;
  });

  const filePath = path.join(COMP_DIR, beat.file).replace(/\\/g, '/');
  await page.goto(`file:///${filePath}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Forzar fondo transparente — nunca confiar en que el HTML lo haga solo
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  });

  // Esperar a que las fuentes estén listas para evitar FOUT en el primer frame
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });

  const totalFrames = Math.ceil(beat.duration * FPS);
  process.stdout.write(`  ${name} (${W}x${H}, ${totalFrames}f): `);

  for (let f = 0; f < totalFrames; f++) {
    const t = f / FPS;
    await page.evaluate((time) => {
      if (typeof window.render === 'function') window.render(time);
    }, t);

    const framePath = path.join(framesDir, `f${String(f).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png', omitBackground: true });
    if (f % 30 === 0) process.stdout.write('.');
  }

  await page.close();
  console.log(` OK`);

  // Codificar a ProRes 4444 con alfa real
  const outPath = path.join(OUT_DIR, `${name}.mov`);
  const framesGlob = path.join(framesDir, 'f%05d.png');
  execSync(
    `"${FFMPEG}" -nostdin -hide_banner -loglevel error -y -framerate ${FPS} -i "${framesGlob}" ` +
    `-c:v prores_ks -profile:v 4 -pix_fmt yuva444p12le -an "${outPath}"`,
    { stdio: 'inherit' }
  );

  fs.rmSync(framesDir, { recursive: true, force: true });

  // Verificar alfa
  const pix = execSync(
    `"${FFPROBE}" -v quiet -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "${outPath}"`
  ).toString().trim();
  console.log(`  → ${path.basename(outPath)} [${pix}]`);

  if (!pix.startsWith('yuva')) {
    throw new Error(`Alfa incorrecto en ${name}: ${pix}.`);
  }

  return outPath;
}

(async () => {
  if (BEATS.length === 0) {
    console.error('ERROR: lista BEATS vacía.');
    process.exit(1);
  }

  console.log(`Capturando ${BEATS.length} beats a ${W}x${H} @ ${FPS}fps con ProRes 4444...`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      `--window-size=${W},${H}`,
    ],
  });

  let ok = 0;
  for (const beat of BEATS) {
    try {
      await captureBeat(browser, beat);
      ok++;
    } catch (err) {
      console.error(`  ERROR en ${beat.file}:`, err.message);
    }
  }

  await browser.close();
  console.log(`\nDone: ${ok}/${BEATS.length} beats renderizados en ${OUT_DIR}`);
  process.exit(ok === BEATS.length ? 0 : 1);
})();
