"""Pasa las capturas de `capturas-home.cjs` a webp (menos peso, mismo aspecto).

    python3 tools/capturas-home.py <carpeta-con-los-png> public/home
"""
import sys
from pathlib import Path
from PIL import Image

origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
for png in sorted(origen.glob('movil-*.png')):
    imagen = Image.open(png).convert('RGB')
    imagen = imagen.resize((585, 1170), Image.LANCZOS)
    salida = destino / png.with_suffix('.webp').name
    imagen.save(salida, quality=80, method=6)
    print(salida, salida.stat().st_size // 1024, 'kB')
