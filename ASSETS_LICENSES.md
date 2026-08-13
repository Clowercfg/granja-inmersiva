# Licencias de Assets 3D

Todos los modelos 3D usados en este proyecto provienen de packs gratuitos con licencia **CC0 1.0 Universal** (dominio público). No se requiere atribución, pero se documenta el origen por transparencia.

Fecha de integración: 2026-08-13

## Packs

| Pack | Autor | URL oficial | Licencia | Modelos usados |
|------|-------|-------------|----------|----------------|
| Kenney Nature Kit (v2.1) | Kenney (www.kenney.nl) | https://kenney.nl/assets/nature-kit | CC0 1.0 | Cercas, puertas, árboles, arbustos, flores, rocas, cultivos, props |
| Quaternius Farm Animal Pack | Quaternius | https://quaternius.com/packs/farmanimal.html | CC0 1.0 | Vaca (en uso); cerdo, oveja, caballo, cebra, llama, pug (registrados, sin uso en lógica) |
| Quaternius Simple Nature Pack | Quaternius | https://quaternius.com/packs/simplenature.html | CC0 1.0 | Árboles, arbustos, rocas |

- Licencia CC0: https://creativecommons.org/publicdomain/zero/1.0/
- Kenney Nature Kit v2.1 (jun 2021): incluye `License.txt` propio (CC0) dentro del ZIP descargado.
- Farm Animal Pack (jun 2018): 7 animales con animaciones, en FBX/OBJ/Blend.
- Simple Nature Pack (dic 2016): 13 modelos (árboles, hierba, rocas, arbustos) en FBX/OBJ/Blend.

## Archivos por carpeta

Todos los modelos están en `public/assets/3d/`. Fueron convertidos a GLB binario y normalizados (escala/unidades/colores por vértice) con herramientas propias (`obj2gltf`, `glb-tools.mjs`).

| Archivo | Origen |
|---------|--------|
| `animals/*.glb` | Quaternius Farm Animal Pack |
| `crops/*.glb` | Kenney Nature Kit (`crops_cornStageC`, `crops_leafsStageB`, `crops_wheatStageB`, `crop_carrot`) |
| `environment/*.glb` | Kenney Nature Kit (`fence_simple`, `fence_planks`, `fence_gate`) |
| `props/*.glb` | Kenney Nature Kit (`lily_small`, `log_stack`, `stump_round`, `sign`) |
| `vegetation/trees/*.glb` | Kenney (`tree_default`, `tree_cone`, `tree_plateau`) + Quaternius Simple Nature (`Tree1–Tree4`) |
| `vegetation/bushes/*.glb` | Kenney (`plant_bush*`) + Quaternius Simple Nature (`Bush1–Bush3`) |
| `vegetation/flowers/*.glb` | Kenney Nature Kit (`flower_redA`, `flower_yellowA`, `flower_purpleA`) |
| `vegetation/rocks/*.glb` | Kenney (`rock_largeA`, `rock_smallA/B/C`) + Quaternius Simple Nature (`Rock1`) |

## Notas de procesado

- Los modelos Kenney se procesaron con `glb-tools.mjs bake-colors`: sus materiales tienen colores en `baseColorFactor`, que se hornean a `COLOR_0` por vértice para permitir *instancing* con tintado (`vertexColors`).
- Los modelos Quaternius (OBJ) se convirtieron con `obj2gltf` a GLB binario y se normalizaron a la escala de juego (animales ~1.5 u de largo, árboles ~4 u de alto, cultivos ~1 u de alto).
