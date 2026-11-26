"""Compone las imágenes de la HOME a partir de las capturas de `capturas-escaparate.cjs`.

    python3 tools/componer-escaparate.py <carpeta-con-los-png> <carpeta-de-salida> [diseno|invitados]

Genera, en la carpeta de salida:
  - hero.webp               portátil con el resumen del panel + móvil Romántica (1360x960, transparente)
  - mosaico.webp            los ocho móviles de las plantillas (1508x1572, transparente)
  - movil-<plantilla>.webp  cada móvil suelto (585x1170, para el carrusel)
  - diseno.webp             la pantalla «Diseño» del panel en una ventana (1400 de ancho)
  - galeria-basico-1..3.webp, galeria-extendido-1..4.webp  (1400x916, la galería con flechas)
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
SOLO = sys.argv[3] if len(sys.argv) > 3 else None  # `diseno` o `invitados`: solo esa imagen
destino.mkdir(parents=True, exist_ok=True)

SS = 3  # supersampling para bordes limpios


def redondeada(tam, radio):
    mascara = Image.new('L', (tam[0] * SS, tam[1] * SS), 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        (0, 0, tam[0] * SS - 1, tam[1] * SS - 1), radio * SS, fill=255
    )
    return mascara.resize(tam, Image.LANCZOS)


def sombra(lienzo, caja, radio, desenfoque=28, desplaza=(0, 22), opacidad=70):
    x0, y0, x1, y1 = caja
    capa = Image.new('RGBA', lienzo.size, (0, 0, 0, 0))
    m = Image.new('L', lienzo.size, 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (x0 + desplaza[0], y0 + desplaza[1], x1 + desplaza[0], y1 + desplaza[1]), radio, fill=opacidad
    )
    capa.putalpha(m.filter(ImageFilter.GaussianBlur(desenfoque)))
    lienzo.alpha_composite(capa)


def movil(captura, ancho):
    """Un móvil con marco negro e isla, de `ancho` px de ancho total."""
    marco = round(ancho * 0.046)
    pantalla_w = ancho - 2 * marco
    pantalla_h = pantalla_w * 2
    alto = pantalla_h + 2 * marco
    r_ext = round(ancho * 0.165)
    r_int = r_ext - marco

    img = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
    img.paste(Image.new('RGBA', (ancho, alto), (18, 18, 20, 255)), (0, 0), redondeada((ancho, alto), r_ext))
    canto = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
    ImageDraw.Draw(canto).rounded_rectangle(
        (1, 1, ancho - 2, alto - 2), r_ext, outline=(255, 255, 255, 40), width=2
    )
    img.alpha_composite(canto)

    pantalla = captura.convert('RGBA').resize((pantalla_w, pantalla_h), Image.LANCZOS)
    pantalla.putalpha(redondeada((pantalla_w, pantalla_h), r_int))
    img.alpha_composite(pantalla, (marco, marco))

    isla_w, isla_h = round(ancho * 0.28), round(ancho * 0.07)
    isla = Image.new('RGBA', (isla_w, isla_h), (10, 10, 12, 255))
    isla.putalpha(redondeada((isla_w, isla_h), isla_h // 2))
    img.alpha_composite(isla, ((ancho - isla_w) // 2, marco + round(ancho * 0.03)))
    return img


def ventana(captura, ancho):
    """Una ventana de navegador (barra con tres puntos) con la captura dentro."""
    barra = round(ancho * 0.042)
    cuerpo_h = round(ancho * captura.height / captura.width)
    alto = barra + cuerpo_h
    forma = redondeada((ancho, alto), round(ancho * 0.016))

    lienzo = Image.new('RGBA', (ancho, alto), (236, 236, 238, 255))
    contenido = captura.convert('RGBA').resize((ancho, cuerpo_h), Image.LANCZOS)
    lienzo.paste(contenido, (0, barra))
    d = ImageDraw.Draw(lienzo)
    cy, r = barra // 2, round(barra * 0.18)
    for i, color in enumerate(((255, 95, 87), (254, 188, 46), (40, 200, 64))):
        cx = round(barra * 0.55) + i * round(barra * 0.52)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    lienzo.putalpha(forma)
    return lienzo


def guardar(img, nombre, calidad=84):
    salida = destino / nombre
    img.save(salida, quality=calidad, method=6)
    print(salida, salida.stat().st_size // 1024, 'kB')


def pantalla(nombre, ancho=1400):
    im = Image.open(origen / nombre).convert('RGB')
    return im.resize((ancho, round(ancho * im.height / im.width)), Image.LANCZOS)


if SOLO is None:
    # --- Portada --------------------------------------------------------------
    hero = Image.new('RGBA', (1360, 960), (0, 0, 0, 0))
    vent = ventana(Image.open(origen / 'panel-resumen.png'), 1040)
    sombra(hero, (16, 16, 16 + vent.width, 16 + vent.height), 24)
    hero.alpha_composite(vent, (16, 16))
    tel = movil(Image.open(origen / 'movil-romantica.png'), 372)
    px, py = 1360 - 372 - 16, 960 - tel.height - 6
    sombra(hero, (px, py, px + tel.width, py + tel.height), 60, desenfoque=30, desplaza=(0, 26), opacidad=90)
    hero.alpha_composite(tel, (px, py))
    guardar(hero, 'hero.webp')

    # --- Mosaico y móviles sueltos ------------------------------------------
    ORDEN = ['romantica', 'botanica', 'clasica', 'moderna', 'barroca', 'sevillana', 'cottage', 'acuarela']
    mosaico = Image.new('RGBA', (1508, 1572), (0, 0, 0, 0))
    ANCHO = 330
    huecos = [
        (22, 24), (380, 96), (738, 24), (1096, 96),
        (22, 780), (380, 852), (738, 780), (1096, 852),
    ]
    for nombre, (x, y) in zip(ORDEN, huecos):
        t = movil(Image.open(origen / f'movil-{nombre}.png'), ANCHO)
        sombra(mosaico, (x, y, x + t.width, y + t.height), 52, desenfoque=22, desplaza=(0, 18), opacidad=80)
        mosaico.alpha_composite(t, (x, y))
    guardar(mosaico, 'mosaico.webp')

    for nombre in ORDEN:
        im = Image.open(origen / f'movil-{nombre}.png').convert('RGB').resize((585, 1170), Image.LANCZOS)
        guardar(im, f'movil-{nombre}.webp', 80)

    # --- Paneles ------------------------------------------------------------
    GALERIAS = {
        'basico': ['panel-basico-rsvp.png', 'panel-basico-map.png', 'panel-basico-timeline.png'],
        'extendido': ['panel-extendido-tables.png', 'panel-extendido-gallery.png', 'panel-extendido-checklist.png', 'panel-extendido-guests.png'],
    }
    for plan, fotos in GALERIAS.items():
        for i, f in enumerate(fotos, 1):
            guardar(pantalla(f), f'galeria-{plan}-{i}.webp')


# --- La lista de invitados: la cuarta captura del extendido, sola ----------------
if SOLO == 'invitados':
    guardar(pantalla('panel-extendido-guests.png'), 'galeria-extendido-4.webp')

# --- «Diseño»: plantillas y paletas, en su ventana ----------------------------
if SOLO in (None, 'diseno'):
    guardar(ventana(Image.open(origen / 'panel-basico-design.png'), 1400), 'diseno.webp')
