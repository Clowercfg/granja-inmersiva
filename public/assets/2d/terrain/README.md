# Terrain Assets (2.5D Canvas)

Este directorio contiene los sprites del terreno para el renderer Canvas2D.

## Estructura

- grass/ — tiles de hierba (grass_01.webp ... grass_06.webp)
- dirt/  — tiles de tierra cultivable (dirt_01.webp ... dirt_04.webp)
- path/  — tiles de camino (path_straight, path_curve, path_end, path_intersection)
- sand/  — tiles de arena (sand_01.webp, sand_02.webp)
- water/ — frames de animacion de agua (water_00.webp ... water_07.webp)

## Formato esperado

- WebP, 128x128px (isometrica: rombo centrado con padding transparente)
- Los placeholders actuales son procedurales; estos archivos son para arte final.
- El sistema TileSystem.ts ya esta preparado para cargarlos via SpriteAtlas.loadSprite().

## Sustitucion de placeholders

1. Colocar los .webp en la carpeta correspondiente.
2. En TerrainRenderer.ts, reemplazar getBaseColor() por SpriteAtlas.getSprite().
3. No se requiere cambiar ninguna logica de juego ni coordenadas.

## Estado actual: PLACEHOLDER PROCEDURAL

Los tiles se generan proceduralmente con Canvas2D. Este sistema funciona
sin assets externos y mantiene First Draw ~100ms.
