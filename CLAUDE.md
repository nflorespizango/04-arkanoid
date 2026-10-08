# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Idioma

Siempre responder en español en este proyecto.

## Estado del proyecto

Juego de Arkanoid en HTML, CSS y JavaScript puro, **sin dependencias** (ver `README.md`). El juego **todavía no está implementado**: no hay `index.html`, ni sistema de build, ni gestor de paquetes, ni tests, ni configuración de lint. Solo existen los assets. Todavía no es un repositorio git.

Como no hay paso de build, se espera que el juego se ejecute abriendo `index.html` en un navegador (o con cualquier servidor de archivos estáticos). Ojo: `assets/spritesheet.js` carga el PNG con una ruta relativa (`assets/spritesheet-breakout.png`) y lo copia a un canvas fuera de pantalla, por lo que `index.html` debe estar en la raíz del repositorio, y si se usara `getImageData` habría que servir los archivos por HTTP en vez de `file://`.

## Assets

- `assets/spritesheet.js` — script plano (no módulo) que define globales: `SPRITES` (paleta, pelota y bloques por color), `EXPLOSION_FRAMES` (4 frames por color, `EXPLOSION_DURATION = 150` ms) y los helpers `loadSpritesheet(cb)` (idempotente; encola los callbacks hasta que la imagen cargue), `drawSprite(ctx, name, x, y, w, h)` (los bloques se piden como `'block_<color>'`) y `drawFrame(ctx, frame, x, y, w, h)`. Los helpers de dibujo no hacen nada hasta que la hoja de sprites se carga, así que el juego debe iniciarse desde el callback de `loadSpritesheet`.
- Colores de bloque: gray, red, yellow, cyan, magenta, hotpink, green. Los frames de explosión de `gray` reutilizan las coordenadas de `red`.
- `assets/sounds/` — `ball-bounce.mp3`, `break-sound.mp3`.

## Flujo guiado por specs

El repo incluye dos skills (en `.claude/skills/` y `.agents/skills/`, instaladas desde `Klerith/fernando-skills` y registradas en `skills-lock.json`), ambas de invocación solo por el usuario:

- `/spec <feature>` — entrevista al usuario y luego escribe `specs/NN-slug.md` (estado `Draft`). Nunca escribe código.
- `/spec-impl <NN-slug>` — solo corre sobre specs con estado `Approved` (lo cambia el humano, nunca el agente). Crea la rama `spec-NN-slug` (requiere git; configurable con `AutoCreateBranch` en `specs/.spec-config.yml`) e implementa el plan paso a paso, pausando para revisar cada diff. Nunca hace commit salvo que se lo pidan.

Implementar lo que dice la spec aprobada; los cambios de alcance van en la spec, no en el código. Las respuestas siguen el idioma del prompt del usuario (la documentación del proyecto está en español).
