# crops/

Modelos de cultivos. Archivos esperados (nombres exactos):

- `wheat.glb`   — Trigo
- `corn.glb`    — Maíz
- `carrot.glb`  — Zanahoria
- `tomato.glb`  — Tomate

La disposición de parcelas está en `src/config/crops.ts` y el renderizado en
`src/entities/crops/CropField.tsx`. Los modelos deben ser de una sola planta
pequeña (se instancian en filas dentro de cada parcela).
