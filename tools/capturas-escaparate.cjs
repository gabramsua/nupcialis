/**
 * Las capturas del panel y del móvil que van en la HOME de `nupcialis.com`
 * (portada, mosaico, «Diseño», carrusel y «Así es el panel»).
 *
 * Fotografía las rutas de desarrollo con datos llenos (`/dev/panel-basico`,
 * `/dev/panel-extendido`, `/dev/previa`). Hace falta `ng serve --port 4300` y
 * Playwright (no es dependencia del proyecto: `npm i -g playwright`).
 *
 *   node tools/capturas-escaparate.cjs <carpeta-de-salida> [solo]
 *
 * Con `solo` (por ejemplo `diseno`) se fotografía únicamente esa pantalla.
 *
 * Lo que se toca **solo en la captura**, nunca en la aplicación:
 *  - el badge de «8 respuestas nuevas» y «2 fotos nuevas» del menú (todavía no
 *    existen en el panel) y las cifras «198/236» y «185/236» del resumen;
 *  - el menú marcado en la pantalla que se enseña (las rutas de muestra no
 *    cuelgan de `/panel/...`, así que el router no lo marca solo);
 *  - el desenfoque de las fotos de los invitados en la galería;
 *  - un velo más ligero sobre la foto de la portada Romántica, para que se vea.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:4300';
const salida = process.argv[2] ?? 'capturas';
const solo = process.argv[3] ?? null;

const PANTALLAS = [
  // [plan, ruta, entrada del menú que se marca, retoque]
  ['basico', 'rsvp', 'Confirmaciones de asistencia', null],
  ['basico', 'map', 'Cómo llegar', null],
  ['basico', 'timeline', 'Timeline del día', null],
  ['extendido', 'tables', 'Mesas', null],
  ['extendido', 'gallery', 'Galería', 'galeria'],
  ['extendido', 'checklist', 'Tareas', null],
  // La lista de invitados (162, en siete grupos de colores), más ancha y alta.
  ['extendido', 'guests', 'Invitados', 'completa'],
  // «Diseño»: las ocho plantillas y las dieciocho paletas, sin la foto de portada.
  ['basico', 'design', 'Diseño', 'diseno'],
];

/** Se ejecuta dentro de la página. */
function retoques(opciones) {
  const { activo, retoque, resumen } = opciones;

  const enlaces = [...document.querySelectorAll('.np-panel__enlace')];
  const quien = (texto) => enlaces.find((a) => a.textContent.replace(/\s+/g, ' ').includes(texto));

  if (activo) {
    const a = quien(activo);
    if (a) {
      a.classList.add('np-panel__enlace--activo');
      a.setAttribute('aria-current', 'page');
    }
  }

  const insignia = (texto, n) => {
    const a = quien(texto);
    if (!a) return;
    const rosa = getComputedStyle(document.documentElement).getPropertyValue('--np-cat-rosa');
    const s = document.createElement('span');
    s.textContent = String(n);
    s.setAttribute('aria-label', `${n} nuevas`);
    s.style.cssText =
      `margin-inline-start:auto;display:inline-flex;align-items:center;justify-content:center;` +
      `min-inline-size:1.35rem;block-size:1.35rem;padding-inline:.4rem;border-radius:999px;` +
      `background:${rosa || '#d6336c'};color:#fff;font-size:.75rem;font-weight:700;line-height:1`;
    a.appendChild(s);
  };

  if (resumen) {
    insignia('Confirmaciones de asistencia', 8);
    insignia('Galería', 2);
    const cifras = [...document.querySelectorAll('.re__cifra')];
    const poner = (el, n, total) => {
      const dd = el?.querySelector('dd');
      if (!dd) return;
      dd.firstChild.textContent = ` ${n}`;
      const sp = dd.querySelector('span');
      if (sp) sp.textContent = `/${total}`;
    };
    poner(cifras[0], 198, 236);
    poner(cifras[1], 185, 236);
    // El aviso de «primera vez» y los avisos del plan: estorban en una portada.
    document.querySelectorAll('np-alert').forEach((e) => e.remove());
    document.querySelectorAll('aside.re__aviso').forEach((e) => e.remove());
  }

  if (retoque === 'completa') {
    // Algo menos de zoom: caben más filas en la misma captura.
    document.documentElement.style.zoom = '0.78';
    document.querySelectorAll('np-alert').forEach((e) => e.remove());
  }

  if (retoque === 'diseno') {
    // Solo plantillas y colores: la foto de portada es otra decisión y alarga la
    // captura. Se quita también el separador que la precede.
    document.querySelectorAll('np-alert').forEach((e) => e.remove());
    const portada = document.querySelector('np-selector-portada');
    portada?.previousElementSibling?.remove();
    portada?.remove();
  }

  if (retoque === 'galeria') {
    document.querySelectorAll('np-alert').forEach((e) => e.remove());
    const estilo = document.createElement('style');
    estilo.textContent = 'main img { filter: blur(14px) saturate(1.1); transform: scale(1.12); }';
    document.head.appendChild(estilo);
    for (const el of document.querySelectorAll('main *')) {
      if (el.children.length === 0 && el.textContent.trim() === 'Ir a la lista de invitados') {
        el.closest('div')?.remove();
      }
    }
  }
}

async function esperar(pagina) {
  await pagina.waitForLoadState('networkidle');
  // Los trozos diferidos del panel y la fuente: la primera petición compila.
  await pagina.waitForSelector('.np-panel__enlace', { timeout: 30000 });
  await pagina.waitForTimeout(1800);
}

(async () => {
  fs.mkdirSync(salida, { recursive: true });
  const navegador = await chromium.launch();

  // --- Pantallas de los planes ------------------------------------------
  for (const [plan, ruta, activo, retoque] of PANTALLAS) {
    if (solo && retoque !== solo && ruta !== solo) continue;
    const completa = retoque === 'completa';
    const diseno = retoque === 'diseno';
    const contexto = await navegador.newContext({
      viewport: completa
        ? { width: 1500, height: 982 }
        : diseno
          ? { width: 1500, height: 1350 }
          : { width: 1100, height: 720 },
      deviceScaleFactor: 2,
    });
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/dev/panel-${plan}/${ruta}`);
    await esperar(pagina);
    await pagina.evaluate(retoques, { activo, retoque, resumen: false });
    await pagina.waitForTimeout(400);
    await pagina.screenshot({
      path: `${salida}/panel-${plan}-${ruta}.png`,
    });
    await contexto.close();
  }

  // --- El resumen de la portada (extendido, con insignias y cifras) -----
  if (!solo) {
    const contexto = await navegador.newContext({
      viewport: { width: 1100, height: 720 },
      deviceScaleFactor: 2,
    });
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/dev/panel-extendido`);
    await esperar(pagina);
    await pagina.evaluate(retoques, { activo: 'Resumen', retoque: null, resumen: true });
    await pagina.waitForTimeout(400);
    await pagina.screenshot({ path: `${salida}/panel-resumen.png` });
    await contexto.close();
  }

  // --- Móviles ------------------------------------------------------------
  if (solo) {
    await navegador.close();
    return;
  }
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
  for (const [plantilla, paleta] of COMBINACIONES) {
    const contexto = await navegador.newContext({
      viewport: { width: 390, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const pagina = await contexto.newPage();
    await pagina.goto(`${BASE}/dev/previa?plantilla=${plantilla}&paleta=${paleta}&foto=1&barra=0`, {
      waitUntil: 'networkidle',
    });
    await pagina.waitForTimeout(1600);
    if (plantilla === 'romantica') {
      // El velo de serie casi tapa la foto: aquí se aligera, más en la parte de
      // abajo (donde está la pareja) que detrás del texto.
      await pagina.addStyleTag({
        content:
          '.romantica--con-foto{background-image:linear-gradient(' +
          'color-mix(in srgb,var(--fondo) 30%,transparent),' +
          'color-mix(in srgb,var(--fondo) 46%,transparent) 55%,' +
          'color-mix(in srgb,var(--fondo) 4%,transparent) 78%),var(--foto)!important}',
      });
      await pagina.waitForTimeout(300);
    }
    await pagina.screenshot({ path: `${salida}/movil-${plantilla}.png` });
    await contexto.close();
  }

  await navegador.close();
})();
