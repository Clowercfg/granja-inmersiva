# Granja Inmersiva · Panel de Acceso

Pantalla de bienvenida con **registro e inicio de sesión** (demo de frontend) antes de entrar al simulador 3D. Estética "vida real" de lujo rural: glassmorphism, paleta verde bosque, beige y dorado miel.

## Ejecución

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # revisión de tipos
npm run build      # build de producción
```

## Qué incluye

- **Login**: correo o usuario + contraseña, "Recordarme" (persistencia `localStorage`/`sessionStorage`).
- **Registro**: nombre, correo, teléfono con máscara `(###) ###-####`, medidor de fortaleza de contraseña, confirmación y aceptación de términos. Sin categorías: todos los usuarios se registran igual.
- **Extras**: música ambiente permanente (viento y pájaros, WebAudio procedural), partículas de polen, frases motivacionales rotatorias, contador animado de agricultores, modales (recuperar contraseña / términos) y notificaciones toast.
- **En el juego**: botón de perfil en la barra superior con opciones de acceso rápido (inventario, calendario, mejoras, ayuda) y **cerrar sesión** para volver a la pantalla de acceso.
- **Fondo**: paisaje agrícola generado proceduralmente (SVG + canvas), sin assets externos. Respeta `prefers-reduced-motion`.

## Cómo funciona el almacenamiento

Todo es **demo de frontend**: los usuarios y la sesión viven en el navegador con prefijo `granja_`.

| Clave | Contenido |
| --- | --- |
| `granja_users` | Lista de cuentas registradas |
| `granja_session` | Sesión activa (o en `sessionStorage` si no se eligió "Recordarme") |
| `granja_theme` / `granja_sound` / `granja_particles` | Preferencias de la pantalla |

No se transmite nada a ningún servidor. En producción se conectaría a un backend real.

## Estructura del módulo

```
src/ui/auth/
├── authStore.ts      # validadores, persistencia, roles y frases
├── AuthPanel.tsx     # interfaz: tabs, formularios, toasts y modales
├── auth.css          # estilos (paleta, glassmorphism, responsive)
├── FarmBackdrop.tsx  # paisaje SVG + capa de polen (canvas)
└── ambient.ts        # sonido ambiente con WebAudio
```

## Demo rápida

1. Crea una cuenta en la pestaña **Crear Cuenta** (cualquier correo válido + contraseña de 8+ caracteres).
2. Al confirmar, entras automáticamente al simulador.
3. En "Iniciar Sesión" puedes volver a entrar con las mismas credenciales; los datos se conservan entre recargas.
4. Para restablecer la demo, borra los datos del sitio en el navegador.
