/**
 * Las capturas móviles de la HOME (`public/home/movil-*.png`, antes de pasarlas
 * a webp con `tools/capturas-home.py`).
 *
 * Fotografía `/dev/previa` con la plantilla, la paleta y la portada de muestra
 * de cada combinación. Hace falta `ng serve --port 4300` y Playwright.
 *
 *   node tools/capturas-home.cjs [carpeta-de-salida]
 *
 * Las combinaciones son las de `HOME_DE_FABRICA.escaparate` (tienen que
 * coincidir con las etiquetas de la HOME).
 */
const { chromium } = require('playwright');

const COMBINACIONES = [
  ['clasica', ''],
  ['botanica', 'salvia'],
  ['romantica', 'rosa-palo'],
  ['moderna', 'grafito-oro'],
  ['barroca', 'burdeos-oro'],
  ['sevillana', 'terracota'],
  ['cottage', 'oliva'],
  ['acuarela', 'lavanda'],
];

(async () => {
  const salida = process.argv[2] ?? 'capturas';
  const navegador = await chromium.launch();
  for (const [plantilla, paleta] of COMBINACIONES) {
    const contexto = await navegador.newContext({
      viewport: { width: 390, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const pagina = await contexto.newPage();
    const url = `http://127.0.0.1:4300/dev/previa?plantilla=${plantilla}&paleta=${paleta}&foto=1&barra=0`;
    await pagina.goto(url, { waitUntil: 'networkidle' });
    await pagina.waitForTimeout(1500);
    await pagina.screenshot({ path: `${salida}/movil-${plantilla}.png` });
    await contexto.close();
  }
  await navegador.close();
})();
