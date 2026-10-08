# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-10-08
> **Objective:** Un `index.html` con canvas donde se juega un único nivel de Arkanoid (paleta, pelota, 60 bloques, 3 vidas y puntuación), controlado con teclado o ratón, desde la carga hasta la victoria o el game over.

## Por qué existe esta spec

Hoy el repo solo tiene assets. Esta spec define el núcleo mínimo para que una persona abra el juego en un navegador y lo juegue de principio a fin. Sonido, explosiones, niveles y persistencia quedan para specs posteriores, de modo que el MVP sea pequeño y verificable.

## Alcance

**Dentro:**

- `index.html` en la raíz, con un `<canvas>` de 640x600 y scripts clásicos (sin módulos), que funciona abriéndolo con `file://` o desde un servidor estático.
- Carga de la hoja de sprites con `loadSpritesheet` y arranque del juego desde su callback.
- Control de la paleta con teclado (`←` `→` / `A` `D`) y con ratón (la paleta sigue al cursor en X sobre el canvas). Ambos conviven: gana la última entrada recibida.
- Pelota pegada a la paleta al inicio y tras perder una vida. `Espacio` o clic izquierdo sobre el canvas la lanzan hacia arriba con una ligera inclinación.
- Rebotes en paredes izquierda y derecha, en el techo del área de juego, en bloques y en la paleta.
- En la paleta, el ángulo de salida depende del punto de impacto y la velocidad es constante.
- Un nivel fijo de 10x6 bloques, una fila por color. Todos se rompen de un golpe.
- 3 vidas. Si la pelota cae por el borde inferior se pierde una vida.
- Puntuación por color de fila, visible en el HUD junto a las vidas.
- Estados de juego: `ready`, `playing`, `won` y `lost`.
- Pantallas de victoria y game over dibujadas sobre el canvas. `Enter` o clic reinician la partida sin recargar la página.
- Funcionamiento en Chrome, Edge y Firefox recientes.

**Fuera de alcance (para specs futuras):**

- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- Animación de explosión (`EXPLOSION_FRAMES`).
- Varios niveles, bloques resistentes (`gray`) o indestructibles.
- Power-ups.
- Pantalla de inicio con título y pausa.
- High score y cualquier persistencia (`localStorage`).
- Control táctil.
- Canvas responsive o escalado a la ventana.
- Velocidad creciente de la pelota.

## Modelo de datos

```js
// Constantes (game.js)
const CANVAS_W = 640, CANVAS_H = 600;
const HUD_H = 60;                    // franja superior: puntuación y vidas. Su borde inferior es el techo
const BLOCK_W = 64, BLOCK_H = 32;    // sprite 32x16 escalado x2; 10 columnas = 640
const BLOCK_COLS = 10;
const BLOCKS_TOP = 80;               // y de la primera fila de bloques
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']; // de arriba abajo
const ROW_POINTS = [60, 50, 40, 30, 20, 10];                                 // mismo orden
const PADDLE_W = 120, PADDLE_H = 14;
const PADDLE_Y = 560;                // CANVAS_H - 40
const PADDLE_SPEED = 480;            // px/s (teclado)
const BALL_R = 8;                    // sprite 16x16 sin escalar
const BALL_SPEED = 360;              // px/s, módulo constante
const LAUNCH_ANGLE = 15;             // grados respecto a la vertical, hacia la derecha
const MAX_BOUNCE_ANGLE = 60;         // grados respecto a la vertical, en la paleta
const INITIAL_LIVES = 3;
const MAX_DT = 1 / 30;               // s
const END_INPUT_LOCK = 500;          // ms sin aceptar reinicio al entrar en won/lost

// Estado del juego
const game = {
  status: 'ready',   // 'ready' | 'playing' | 'won' | 'lost'
  score: 0,
  lives: INITIAL_LIVES,
  endedAt: 0,        // performance.now() al entrar en won/lost
  paddle: { x: (CANVAS_W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
  ball: { x, y, vx: 0, vy: 0 },   // x,y = centro; en 'ready' sigue a la paleta
  blocks: [/* { x, y, w, h, color, points, alive } */],
};

const keys = {};     // teclas pulsadas, por event.code
```

Convenciones:

- Origen (0,0) arriba a la izquierda; Y crece hacia abajo.
- Velocidades en px/s, integradas con el `dt` (en segundos) de `requestAnimationFrame`, limitado a `MAX_DT`.
- La pelota se trata como un cuadrado `[x-BALL_R, x+BALL_R] × [y-BALL_R, y+BALL_R]` para las colisiones con bloques y paleta.
- Sprites: `drawSprite(ctx, 'paddle' | 'ball' | 'block_<color>', x, y, w, h)` con `ctx.imageSmoothingEnabled = false` para conservar el pixel art.
- Bloques: bloque `(fila, col)` en `x = col * BLOCK_W`, `y = BLOCKS_TOP + fila * BLOCK_H`. Ocupan de `y = 80` a `y = 272`.
- Posiciones iniciales y tras perder una vida: pelota en `x = paddle.x + PADDLE_W / 2`, `y = PADDLE_Y - BALL_R`. Al perder una vida la paleta conserva su `x`; al reiniciar vuelve al centro.

### Reglas de juego

**Entrada**

- `keydown`/`keyup` en `window` rellenan `keys`. Se llama a `preventDefault()` para `ArrowLeft`, `ArrowRight` y `Space`, para que la página no haga scroll.
- `window.blur` vacía `keys`, para que no queden teclas "pegadas".
- `mousemove` sobre el canvas coloca la paleta con `paddle.x = mouseX - PADDLE_W / 2`, donde `mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width)`, limitado a `[0, CANVAS_W - PADDLE_W]`.
- El teclado mueve la paleta `PADDLE_SPEED * dt` por frame en `ready` y `playing`. La paleta no se mueve en `won` ni `lost`.
- Acciones: en `ready`, `Espacio` o `mousedown` (botón izquierdo) sobre el canvas lanzan la pelota. En `won`/`lost`, `Enter` o `mousedown` reinician, pero solo si han pasado `END_INPUT_LOCK` ms desde `endedAt` (evita reinicios accidentales). El resto de combinaciones estado-tecla se ignora.

**Lanzamiento**

- `vx = BALL_SPEED * sin(LAUNCH_ANGLE)`, `vy = -BALL_SPEED * cos(LAUNCH_ANGLE)`. El estado pasa a `playing`.

**Colisiones (orden por frame: mover, paredes, paleta, bloque, pérdida)**

- **Paredes:** si `x - BALL_R < 0`, `x = BALL_R` y `vx = |vx|`. Si `x + BALL_R > CANVAS_W`, `x = CANVAS_W - BALL_R` y `vx = -|vx|`.
- **Techo:** si `y - BALL_R < HUD_H`, `y = HUD_H + BALL_R` y `vy = |vy|`.
- **Paleta:** solo si `vy > 0`, el centro de la pelota está por encima de la cara superior de la paleta (`y <= paddle.y`) y el cuadrado de la pelota solapa con la paleta. Entonces `y = paddle.y - BALL_R`, `offset = clamp((x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1)`, `ángulo = offset * MAX_BOUNCE_ANGLE`, `vx = BALL_SPEED * sin(ángulo)` y `vy = -BALL_SPEED * cos(ángulo)`. Si la pelota ya está por debajo de la cara superior (golpe lateral), no rebota y seguirá hasta caer.
- **Bloques:** entre los bloques vivos que solapan con el cuadrado de la pelota se elige el de mayor área de solape y solo ese se procesa en el frame. Si `solapeX < solapeY` el rebote es horizontal, y si no, vertical. En el rebote horizontal `vx` apunta alejándose del centro del bloque. En el vertical ocurre lo mismo con `vy`. La pelota se desplaza fuera del bloque en ese eje. El bloque pasa a `alive = false` y `score += block.points`.

**Pérdida de vida**

- La pelota se pierde cuando `y - BALL_R > CANVAS_H`. Entonces `lives -= 1`. Si `lives > 0`, el estado vuelve a `ready` con la pelota pegada a la paleta. Si `lives === 0`, el estado pasa a `lost` y se guarda `endedAt`.

**Victoria y derrota**

- Victoria (`won`): tras romper un bloque no queda ninguno con `alive === true`.
- Derrota (`lost`): `lives` llega a 0.
- Tras entrar en `won` o `lost` no se evalúan más colisiones ni pérdidas de pelota.

**Pantallas (todas con fuente monoespaciada, texto blanco)**

- HUD: `Puntos: N` alineado a la izquierda y `Vidas: N` alineado a la derecha, dentro de `HUD_H`.
- `ready`: texto centrado `Espacio o clic para lanzar` en `y = 400`.
- `won`/`lost`: el tablero sigue dibujado detrás, con un velo negro semitransparente encima, y el texto centrado `¡Ganaste!` o `Game over`, `Puntos: N` y `Pulsa Enter o haz clic para jugar de nuevo`.

## Plan de implementación

1. Crear `index.html` (canvas 640x600, carga `assets/spritesheet.js` y luego `game.js`), `style.css` (fondo oscuro, canvas centrado) y `game.js` con el arranque desde `loadSpritesheet`, `imageSmoothingEnabled = false` y la limpieza del canvas. Prueba: abrir el archivo y ver el canvas centrado sin errores en consola.
2. En `game.js`, añadir las constantes, el objeto `game`, `resetGame()`, el bucle `requestAnimationFrame` con `dt` limitado a `MAX_DT` y las funciones `update(dt)` y `render()`. Dibujar paleta y pelota pegada a ella en las posiciones iniciales. Prueba: paleta centrada abajo y pelota encima.
3. Añadir la entrada: `keys`, `preventDefault`, `blur` y `mousemove`. Mover la paleta con teclado o ratón, limitada a los bordes. Prueba: ambos controles mueven la paleta, la pelota la acompaña y la página no hace scroll.
4. Lanzar la pelota con `Espacio` o clic (`LAUNCH_ANGLE`), moverla con `dt` y añadir los rebotes en paredes y techo. Si cae por abajo, vuelve a `ready` por ahora. Prueba: sale hacia arriba inclinada a la derecha, rebota y vuelve a la paleta al caer.
5. Añadir el rebote en la paleta (solo con `vy > 0` y centro por encima, con ángulo por impacto). Prueba: golpear por izquierda, centro y derecha da ángulos distintos, y un golpe lateral no rebota.
6. Generar y dibujar la rejilla de 60 bloques. Prueba: se ven 6 filas × 10 columnas con los colores en el orden correcto.
7. Añadir la colisión pelota-bloque (bloque de mayor solape, rebote por eje de menor solape) y la eliminación del bloque. Prueba: cada bloque desaparece al primer golpe y la pelota rebota.
8. Añadir puntuación y vidas con el HUD, la pérdida de vida y el estado `lost` sin pantalla todavía. Prueba: los puntos suman según la fila, las vidas bajan al caer y con 0 vidas la pelota deja de relanzarse.
9. Añadir la condición de victoria (`won`). Prueba: tras romper el último bloque el juego pasa a `won` y la pelota se detiene.
10. Dibujar las pantallas de `won` y `lost` y el reinicio con `Enter` o clic tras `END_INPUT_LOCK`. Prueba: ambas pantallas se ven y se puede jugar otra partida completa sin recargar.
11. Añadir el texto de ayuda de `ready`. Prueba: aparece al inicio y tras perder una vida, y desaparece al lanzar.

## Criterios de aceptación

**Carga**

- [ ] Abrir `index.html` con `file://` en Chrome, Edge y Firefox carga el juego sin errores en la consola.
- [ ] Servido desde un servidor estático local el juego también funciona igual.
- [ ] Al cargar se ven la paleta centrada en `y = 560`, la pelota pegada encima y 60 bloques en 6 filas de 10, con red, yellow, cyan, magenta, hotpink y green de arriba abajo.
- [ ] Se ven `Puntos: 0` y `Vidas: 3` en la franja superior y el texto `Espacio o clic para lanzar`.

**Controles**

- [ ] `←` `→` y `A` `D` mueven la paleta, y esta nunca sale del canvas.
- [ ] Mover el ratón sobre el canvas coloca la paleta bajo el cursor y nunca sale del canvas.
- [ ] Pulsar `Espacio` o las flechas no hace scroll en la página.
- [ ] Soltar el foco de la ventana con una tecla pulsada y volver no deja la paleta moviéndose sola.
- [ ] En `ready`, la pelota acompaña a la paleta y no se mueve hasta pulsar `Espacio` o hacer clic.
- [ ] El lanzamiento sale hacia arriba con una inclinación de 15° hacia la derecha.

**Colisiones**

- [ ] La pelota rebota en las paredes izquierda y derecha y en el techo (borde inferior de la franja superior), sin entrar en el HUD.
- [ ] Golpear la paleta por la izquierda manda la pelota hacia la izquierda, por la derecha hacia la derecha y por el centro casi vertical. El ángulo nunca supera 60° respecto a la vertical.
- [ ] Si la pelota llega a la paleta por debajo de su cara superior (golpe lateral), no rebota y cae.
- [ ] `Math.hypot(game.ball.vx, game.ball.vy)` vale `BALL_SPEED` (con tolerancia de 0.001) tras cada tipo de rebote.
- [ ] Cada bloque desaparece al primer golpe y la pelota rebota. En un frame solo se rompe un bloque.

**Puntuación, vidas y final**

- [ ] Romper un bloque de la fila 1 (red) suma 60 puntos y uno de la fila 6 (green) suma 10.
- [ ] Si la pelota cae por el borde inferior, `Vidas` baja en 1 y la pelota vuelve pegada a la paleta en `ready`.
- [ ] Al perder la tercera vida aparece `Game over` con la puntuación final y el tablero detrás.
- [ ] Al romper los 60 bloques aparece `¡Ganaste!` con la puntuación final.
- [ ] En `won` y `lost` la paleta no responde a teclado ni ratón.
- [ ] En `won`/`lost`, `Enter` o clic reinician con 3 vidas, puntuación 0, 60 bloques y la paleta centrada, sin recargar la página, pero solo pasados 500 ms desde el final.
- [ ] Con la pestaña oculta durante varios segundos y al volver, la pelota no atraviesa paleta ni bloques (`dt` máximo de 1/30 s).

## Pruebas manuales

Para forzar situaciones se usa la consola del navegador: `game` es accesible porque es una constante global del script.

| ID  | Acción                                                                                                        | Resultado esperado                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| T1  | Abrir `index.html` con doble clic                                                                             | Canvas visible, sin errores en la consola, estado inicial correcto                                         |
| T2  | Pulsar `←`/`→` y `A`/`D`, y luego mover el ratón                                                              | La paleta responde a ambos, se detiene en los bordes y la página no hace scroll                           |
| T3  | Pulsar `Espacio` (y en otra partida hacer clic)                                                               | La pelota sale hacia arriba y a la derecha, y el texto de ayuda desaparece                                |
| T4  | Dejar rebotar la pelota contra paredes y techo                                                                | Rebota sin entrar en la franja superior ni salirse                                                        |
| T5  | Golpear la paleta en el extremo izquierdo, el centro y el extremo derecho                                     | Salida muy a la izquierda, casi vertical y muy a la derecha, respectivamente                              |
| T6  | Acercar la paleta de lado a una pelota que ya está bajando junto a ella                                       | La pelota no rebota y cae                                                                                 |
| T7  | Ejecutar `Math.hypot(game.ball.vx, game.ball.vy)` tras varios rebotes distintos                               | Siempre `360`                                                                                             |
| T8  | Romper un bloque de la fila de arriba y otro de la de abajo                                                   | Suman 60 y 10 puntos y los bloques desaparecen                                                            |
| T9  | Dejar caer la pelota                                                                                          | `Vidas` baja, la pelota vuelve a la paleta en `ready` y la paleta conserva su posición                    |
| T10 | Dejar caer la pelota tres veces                                                                               | Aparece `Game over`. Pulsar `Enter` antes de 0,5 s no hace nada y después reinicia la partida             |
| T11 | Ejecutar `game.blocks.forEach((b, i) => { if (i) b.alive = false })` y romper el bloque restante              | Aparece `¡Ganaste!` y un clic posterior reinicia con 60 bloques                                           |
| T12 | Ejecutar `game.lives = 1` y dejar caer la pelota sin romper nada                                              | Aparece `Game over` con 0 vidas, aunque queden bloques vivos                                              |
| T13 | Cambiar de pestaña 10 s con la pelota en juego y volver                                                       | La pelota continúa sin atravesar nada                                                                     |
| T14 | Repetir T1 a T3 en Chrome, Edge y Firefox                                                                     | Mismo comportamiento en los tres                                                                          |

## Decisiones

- **Sí:** canvas fijo de 640x600. Con bloques de 64x32 (sprite 32x16 al doble) caben exactamente 10 columnas y no hace falta escalar.
- **No:** canvas responsive. Añade complejidad de escalado que no aporta a un MVP. Aun así, la conversión del ratón usa `rect.width` por si el canvas se ve con zoom del navegador.
- **Sí:** scripts clásicos sin módulos, en `index.html` + `style.css` + `game.js`. Los módulos ES fallan con `file://` y el proyecto no tiene servidor ni build.
- **No:** dividir en varios scripts (`input.js`, `entities.js`). Es más ordenado, pero excesivo para el tamaño del MVP.
- **Sí:** teclado y ratón a la vez, con "gana la última entrada". Es lo más simple y no requiere modos ni ajustes.
- **Sí:** clic izquierdo también lanza y reinicia, para poder jugar solo con ratón. El reinicio tiene un bloqueo de 500 ms para no reiniciar por un clic accidental justo al terminar.
- **No:** control táctil. Queda para una spec propia.
- **Sí:** ángulo de rebote según el punto de impacto, con velocidad constante. Da control al jugador y mantiene la dificultad predecible.
- **No:** velocidad creciente. Se puede añadir después sin cambiar el modelo.
- **Sí:** el techo es el borde inferior del HUD (`HUD_H`) y los bloques empiezan en `y = 80`. Deja un pasillo de 20 px sobre los bloques, así la pelota nunca se cruza con el texto.
- **Sí:** lanzamiento fijo a 15° hacia la derecha. Es determinista y se puede probar, mientras que uno aleatorio dificulta verificar.
- **Sí:** el bloque con mayor solape decide la colisión, y solo se procesa un bloque por frame. Evita rebotes dobles en las esquinas.
- **Sí:** el rebote en la paleta solo cuenta si el centro está por encima de su cara superior y `vy > 0`. Así la pelota no se queda pegada ni "sube" por el lateral de la paleta.
- **Sí:** un único nivel, sin bloques `gray`. Mantiene el modelo de datos sin campo de golpes.
- **Sí:** puntos por fila, de 60 a 10, con las filas superiores más valiosas.
- **No:** pantalla de inicio ni pausa. No se eligieron para el MVP y pueden ser specs propias.
- **No:** sonido ni explosiones, aunque los assets existen. Se dejan para una spec de pulido.
- **Sí:** limitar `dt` a 1/30 s y vaciar `keys` en `blur`. Evita el efecto túnel y las teclas "pegadas" tras cambiar de pestaña.
- **Sí:** exponer `game` como constante global y verificar con la consola. Evita añadir un modo debug solo para probar.

## Riesgos

| Riesgo                                                           | Mitigación                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| La hoja de sprites no carga y el canvas queda vacío              | `loadSpritesheet` ya registra el error en consola. El juego arranca solo desde su callback.                   |
| Efecto túnel con frames largos                                   | `dt` limitado a 1/30 s: a 360 px/s la pelota avanza como máximo 12 px por frame, menos que la altura de la paleta (14 px) y de un bloque (32 px). |
| Colisión en esquinas de bloques con rebote en el eje equivocado  | Bloque de mayor solape, eje de menor solape y velocidad fijada con signo (no se invierte a ciegas).           |
| El navegador hace scroll con `Espacio` o las flechas             | `preventDefault()` en esas teclas.                                                                           |
| Coordenadas del ratón desfasadas si el canvas cambia de tamaño visual | Convertir con `CANVAS_W / rect.width` en cada `mousemove`.                                              |
| Teclas "pegadas" al perder el foco                               | Vaciar `keys` en `window.blur`.                                                                              |

## Lo que **no** está en esta spec

- Sonidos y animación de explosión.
- Varios niveles, bloques resistentes y power-ups.
- Pantalla de inicio, pausa, high score y persistencia.
- Control táctil.
- Canvas responsive y velocidad creciente.

Cada una de esas cosas, si llega, va en su propia spec.
