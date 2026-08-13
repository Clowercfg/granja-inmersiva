# Assets del juego (Granja Inmersiva 3D)

Carpeta pública de modelos, texturas e imágenes. Se sirven desde `/assets/...`
y se cargan de forma **modular** por el gestor de assets
(`src/core/assets/`). Si un archivo no existe, el juego usa automáticamente
un **placeholder procedural** (los gráficos actuales) sin romper nada.

## Estructura

```
public/assets/
  environment/   Props decorativos del mundo (farolas, bancos, pacas de paja, abrevaderos...)
  buildings/     Modelos de edificios y cercas (granero, casa, almacén, invernadero, taller...)
  animals/       Modelos de animales animados (vaca, gallina)
  crops/         Modelos de cultivos por tipo (trigo, maíz, zanahoria...)
  trees/         Modelos de árboles (un solo modelo, se instancia en todo el mapa)
  terrain/       Texturas de suelo (color, normal, detalle) — opcional
  ui/            Imágenes de interfaz (logo, iconos, fondos de panel)
```

## Convenciones de nombres

Cada asset se resuelve por clave lógica. Los archivos deben llamarse EXACTAMENTE
como indica la tabla. Modelos en **GLB** (`.glb`, idealmente comprimidos con
Draco — el decodificador ya está incluido en `public/three/draco/`).

| Clave | Ruta esperada |
| --- | --- |
| `building:barn` | `buildings/barn.glb` |
| `building:house` | `buildings/house.glb` |
| `building:warehouse` | `buildings/warehouse.glb` |
| `building:greenhouse` | `buildings/greenhouse.glb` |
| `building:workshop` | `buildings/workshop.glb` |
| `fence` | `buildings/fence.glb` |
| `fence-gate` | `buildings/gate.glb` |
| `pen-rail` | `buildings/pen-rail.glb` |
| `animal:cow` | `animals/cow.glb` |
| `animal:chicken` | `animals/chicken.glb` |
| `tree` | `trees/tree.glb` |
| `crop:wheat` | `crops/wheat.glb` |
| `crop:corn` | `crops/corn.glb` |
| `crop:carrot` | `crops/carrot.glb` |
| `crop:tomato` | `crops/tomato.glb` |
| `terrain-color` | `terrain/color-map.jpg` (o `.png`) |
| `terrain-normal` | `terrain/normal-map.jpg` (o `.png`) |

## Cómo reemplazar un gráfico

1. **Edificio / animal / árbol**: coloca el `.glb` en la ruta indicada con el
   nombre exacto. El gestor lo detecta y lo usa automáticamente en la próxima
   carga; si se borra el archivo, vuelve el placeholder procedural.
2. **Terreno**: exporta una `color-map` y `normal-map` (2D, sin elevación — la
   altura sigue siendo procedural). El color se aplica en espacio sRGB.
3. **Cultivos**: agrega el `.glb` por tipo en `crops/`; la disposición se
   define en `src/config/crops.ts` y se renderiza en `src/entities/crops/`.

### Nombres de nodos para animación (animales)

Para que un modelo de animal conserve la animación existente (paso, comer,
dormir, cola, alas), nombra los nodos del GLB de esta forma:

- Vaca: `body`, `head`, `tail`, `leg_1..leg_4` (o `leg_L1`, `leg_R1`...).
- Gallina: `body`, `head`, `tail`, `leg_1`, `leg_2`, `wing_L`, `wing_R`.

Si un nodo no existe, esa parte simplemente no se anima (no rompe nada).

## Optimización recomendada

- Exporta con `gltf-transform`: `gltf transform --compress=meshopt` o `--compress=draco`.
  Ambos decodificadores ya están integrados (Draco en `public/three/draco/`, Meshopt embebido).
- Texturas `.webp` o `.jpg`, potencia de 2, máximo 2048px (512–1024 para terreno).
- Un solo material por modelo cuando sea posible.
