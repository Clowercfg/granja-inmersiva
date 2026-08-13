# terrain/

Texturas del suelo (opcional — si faltan, el terreno se hornea proceduralmente):

- `color-map.jpg`   — Mapa de color (sRGB, 512–1024px, potencia de 2).
- `normal-map.jpg`  — Mapa de normales (512px).
- `detail.jpg`      — Textura de detalle para tiling (opcional, aún sin usar).

La altura del terreno es procedural (`src/utils/terrain.ts`); estas texturas
solo sustituyen el color/sombreado.
