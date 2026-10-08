# SPEC 02 — Sonido y explosiones

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-08
> **Objective:** Añadir al juego los sonidos de rebote y de rotura de bloque, la animación de explosión de 4 frames al romper un bloque y una tecla `M` para silenciar, usando solo los assets que ya existen.

## Por qué existe esta spec

La spec 01 dejó fuera sonido y explosiones aunque los assets (`assets/sounds/*.mp3`, `EXPLOSION_FRAMES`) ya están en el repo. Esta spec es el pulido audiovisual mínimo: no cambia las reglas de juego ni las colisiones, solo añade retroalimentación al jugador.

## Alcance

**Dentro:**

- Reproducir `ball-bounce.mp3` cuando la pelota rebota en la pared izquierda, la derecha, el techo o la paleta.
- Reproducir `break-sound.mp3` cuando se rompe un bloque. En ese rebote **no** suena `ball-bounce.mp3`.
- Reproducciones solapables: dos rebotes seguidos suenan a la vez en lugar de cortarse.
- Animación de explosión (`EXPLOSION_FRAMES[color]`, 4 frames repartidos en `EXPLOSION_DURATION` = 150 ms) dibujada en la posición del bloque roto. Es solo visual: el bloque deja de colisionar al instante (`alive = false`, como en la spec 01).
- Las explosiones en curso terminan de animarse en `won` y `lost`. `resetGame()` las vacía.
- Tecla `M` para alternar el silencio en cualquier estado (`ready`, `playing`, `won`, `lost`). El silencio vive en memoria y sobrevive a los reinicios de partida, pero no a recargar la página.
- Indicador `Silencio (M)` en el centro del HUD, visible solo cuando el juego está silenciado.
- Manejo de rechazos de `play()` (autoplay del navegador) sin errores en la consola.

**Fuera de alcance (para specs futuras):**

- Música de fondo.
- Sonidos para perder vida, ganar o perder (no hay assets).
- Control de volumen, persistencia del silencio (`localStorage`) o menú de opciones.
- Web Audio API.
- Sonido o explosión en bloques `gray` o resistentes (no existen aún).
- Cualquier cambio en reglas de colisión, puntuación o vidas.

## Modelo de datos

Se amplía `game.js` (no se crean archivos nuevos, igual que en la spec 01).

```js
// Constantes nuevas
const SOUND_BOUNCE_SRC = 'assets/sounds/ball-bounce.mp3';
const SOUND_BREAK_SRC  = 'assets/sounds/break-sound.mp3';
const SOUND_VOLUME = 0.5;                 // 0..1
const EXPLOSION_FRAME_COUNT = 4;          // longitud de EXPLOSION_FRAMES[color]

// Estado nuevo
const sounds = {
  bounce: new Audio(SOUND_BOUNCE_SRC),    // instancia base: se clona en cada reproducción
  break:  new Audio(SOUND_BREAK_SRC),
};
let muted = false;                        // fuera de `game`: resetGame() no lo toca

game.explosions = [/* { x, y, w, h, color, elapsed } */]; // elapsed en ms
```

Convenciones:

- `playSound(base)` no hace nada si `muted`. Si no, hace `const a = base.cloneNode(); a.volume = SOUND_VOLUME; a.play().catch(() => {})`.
- `elapsed` avanza con `dt * 1000` en `update(dt)`, por lo que usa el `dt` limitado a `MAX_DT` y se congela con la pestaña oculta.
- Frame de la explosión: `Math.min(EXPLOSION_FRAME_COUNT - 1, Math.floor(elapsed / (EXPLOSION_DURATION / EXPLOSION_FRAME_COUNT)))`.
- Una explosión se elimina cuando `elapsed >= EXPLOSION_DURATION`.
- La explosión se dibuja con `drawFrame(ctx, EXPLOSION_FRAMES[color][i], x, y, w, h)` con las mismas `x, y, w, h` del bloque (64x32), después de dibujar los bloques vivos y antes que la pelota y los velos de `won`/`lost`.
- `update(dt)` avanza las explosiones en **todos** los estados (incluidos `won` y `lost`); el resto de la lógica de `update` sigue sin ejecutarse en `won`/`lost`, como en la spec 01.

### Reglas

**Sonidos**

- `bounce` suena en cada rebote efectivo en pared izquierda, pared derecha, techo y paleta (solo cuando la paleta realmente rebota, no en el golpe lateral).
- `break` suena una vez por bloque roto. Como solo se rompe un bloque por frame, suena como máximo una vez por frame por esta causa.
- Si en un mismo frame hay rebote de pared y rotura de bloque, suenan ambos.
- El primer `play()` ocurre tras un gesto del usuario (el lanzamiento con `Espacio` o clic), por lo que no hay bloqueo de autoplay en el flujo normal. Si el navegador lo rechaza, el error se ignora.

**Explosiones**

- Al romper un bloque se añade `{ x, y, w, h, color, elapsed: 0 }` a `game.explosions`.
- Las explosiones se renderizan en cualquier estado mientras existan.
- `resetGame()` hace `game.explosions = []`.

**Silencio**

- `keydown` con `event.code === 'KeyM'` y `!event.repeat` hace `muted = !muted`. Funciona en todos los estados.
- Al silenciar, los sonidos ya en reproducción no se cortan (duran menos de un segundo).
- HUD: si `muted`, texto `Silencio (M)` centrado horizontalmente dentro de `HUD_H`, mismo estilo que el resto del HUD.

## Plan de implementación

1. Añadir las constantes, el objeto `sounds`, la variable `muted` y `playSound(base)`. Probar en la consola: `playSound(sounds.bounce)` suena y no genera errores. Con `muted = true` no suena.
2. Reproducir `bounce` en los rebotes de pared izquierda, pared derecha, techo y paleta. Prueba: cada rebote suena, el golpe lateral a la paleta no suena y en rebotes rápidos los sonidos se solapan.
3. Reproducir `break` al romper un bloque. Prueba: romper un bloque suena `break` y no `bounce` por ese golpe.
4. Añadir `game.explosions`, su creación al romper un bloque, el avance con `dt` en `update` y su eliminación al terminar. Prueba en consola: tras romper un bloque, `game.explosions.length` pasa a 1 y a 0 unos 150 ms después.
5. Dibujar las explosiones con `drawFrame` en la posición del bloque. Prueba: se ve la animación de 4 frames con el color del bloque y desaparece sola.
6. Hacer que las explosiones sigan avanzando en `won`/`lost` y vaciarlas en `resetGame()`. Prueba: la última explosión se ve completa antes de quedar la pantalla de victoria, y tras reiniciar no queda ninguna.
7. Añadir la tecla `M` (ignorando `event.repeat`) y el indicador `Silencio (M)` en el HUD. Prueba: `M` alterna el silencio en los cuatro estados, el texto aparece y desaparece y el silencio se mantiene tras reiniciar.

## Criterios de aceptación

**Sonido**

- [ ] Cada rebote en pared izquierda, pared derecha, techo y paleta reproduce `ball-bounce.mp3`.
- [ ] El golpe lateral a la paleta (sin rebote) no reproduce sonido.
- [ ] Romper un bloque reproduce `break-sound.mp3` y no `ball-bounce.mp3` por ese golpe.
- [ ] Dos sonidos consecutivos muy próximos se solapan y no se cortan.
- [ ] No aparece ningún error ni advertencia no capturada en la consola por el audio, tampoco con `file://`.
- [ ] El juego sigue siendo jugable si los archivos de audio no cargan.

**Silencio**

- [ ] `M` alterna el silencio en `ready`, `playing`, `won` y `lost`.
- [ ] Mantener `M` pulsada no alterna repetidamente.
- [ ] Con silencio activo no suena nada y se ve `Silencio (M)` centrado en el HUD. Sin silencio, no se ve.
- [ ] El silencio se conserva al reiniciar la partida con `Enter` o clic.

**Explosiones**

- [ ] Al romper un bloque aparece una animación de 4 frames con los sprites de su color, en su posición y tamaño (64x32), que dura 150 ms.
- [ ] El bloque deja de colisionar en el instante del golpe; la pelota no rebota contra la explosión.
- [ ] Al romper el último bloque se ve la explosión completa y luego aparece `¡Ganaste!`, sin que se corte la animación.
- [ ] La explosión no tapa la pelota ni el velo de `won`/`lost`.
- [ ] Tras reiniciar no queda ninguna explosión (`game.explosions.length === 0`).
- [ ] Con la pestaña oculta varios segundos, las explosiones no saltan ni se acumulan al volver.

**Regresión**

- [ ] Los criterios de aceptación de la spec 01 siguen cumpliéndose.

## Pruebas manuales

| ID  | Acción                                                                                               | Resultado esperado                                                                      |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| T1  | Abrir `index.html` con doble clic, lanzar la pelota y dejarla rebotar en paredes, techo y paleta     | Suena `ball-bounce` en cada rebote, sin errores en la consola                           |
| T2  | Romper un bloque                                                                                     | Suena `break-sound`, se ve la explosión del color del bloque durante 150 ms             |
| T3  | Ejecutar `game.explosions.length` justo tras romper un bloque y 200 ms después                       | `1` y luego `0`                                                                         |
| T4  | Pulsar `M` en `ready`, `playing`, `won` y `lost`                                                     | Alterna el silencio y el texto `Silencio (M)` en cada estado                            |
| T5  | Mantener `M` pulsada un segundo                                                                      | Solo cambia una vez                                                                     |
| T6  | Activar silencio y reiniciar con `Enter`                                                             | Sigue en silencio y con el texto visible                                                |
| T7  | Ejecutar `game.blocks.forEach((b, i) => { if (i) b.alive = false })` y romper el bloque restante     | La explosión se completa y luego aparece `¡Ganaste!`; tras reiniciar no hay explosiones |
| T8  | Golpear la paleta de lado con la pelota ya bajando junto a ella                                      | No suena nada                                                                           |
| T9  | Cambiar de pestaña 10 s con explosiones en curso y volver                                            | Las explosiones continúan sin saltos ni acumulación                                     |
| T10 | Repetir T1 a T4 en Chrome, Edge y Firefox                                                            | Mismo comportamiento en los tres                                                        |

## Decisiones

- **Sí:** `ball-bounce` en paredes, techo y paleta, y `break-sound` en bloques, sin mezclarlos. Cada golpe tiene un único sonido y es más fácil de distinguir.
- **Sí:** clonar el `Audio` base en cada reproducción. Permite solapes y funciona con `file://`.
- **No:** reutilizar una única instancia reiniciada (`currentTime = 0`). Corta el sonido anterior en rebotes rápidos.
- **No:** Web Audio API. Requiere `fetch` + decodificación, que falla con `file://`, y el proyecto no tiene servidor ni build.
- **Sí:** el bloque deja de ser colisionable al instante y la explosión es solo visual. Mantiene intactas las reglas de colisión de la spec 01.
- **Sí:** la explosión avanza con `dt` (limitado) y no con `performance.now()`. Se congela con la pestaña oculta y no salta al volver.
- **Sí:** las explosiones terminan de animarse en `won`/`lost` y se vacían al reiniciar. La última explosión no se pierde.
- **Sí:** `M` funciona en todos los estados y `muted` vive fuera de `game`. Así sobrevive a `resetGame()` sin tocar la lógica de reinicio.
- **Sí:** indicador `Silencio (M)` solo cuando está silenciado. Evita ruido en el HUD y avisa cuando algo parece "roto".
- **No:** persistir el silencio en `localStorage`. La persistencia sigue fuera del alcance, como en la spec 01.
- **No:** crear `audio.js` o archivos nuevos. Se mantiene la decisión de la spec 01 de un único `game.js`.
- **No:** sonidos para perder vida, ganar o perder. No hay assets y la reutilización de los actuales confundiría.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Autoplay bloqueado por el navegador                                   | Primer sonido tras el gesto de lanzar; `play().catch(() => {})` evita errores no capturados.                  |
| Latencia o retraso del primer sonido al cargar el mp3                 | Crear los `Audio` base al inicio con `preload = 'auto'` para que estén cargados antes del primer rebote.     |
| Muchos clones de `Audio` acumulados en rebotes rápidos                | Los sonidos duran menos de un segundo y los clones se liberan solos al terminar; no se guardan referencias.   |
| `file://` impide algún comportamiento del audio en algún navegador    | `Audio` con `src` relativo funciona con `file://`; se verifica en T10 en los tres navegadores.               |
| `EXPLOSION_FRAMES[color]` ausente para algún color                    | Los 6 colores del nivel existen en `spritesheet.js`; verificar al implementar y registrar el error en consola. |

## Lo que **no** está en esta spec

- Música de fondo y sonidos de vida perdida, victoria o derrota.
- Volumen configurable, persistencia del silencio y menú de opciones.
- Varios niveles, bloques resistentes y power-ups.
- Pantalla de inicio, pausa, high score y persistencia.
- Control táctil, canvas responsive y velocidad creciente.

Cada una de esas cosas, si llega, va en su propia spec.
