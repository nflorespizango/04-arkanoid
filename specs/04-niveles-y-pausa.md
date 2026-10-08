# SPEC 04 — Niveles, pausa y selector de nivel

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-10-08
> **Objective:** Añadir 5 niveles con disposiciones de bloques distintas y pelota algo más rápida en cada uno, paso automático al siguiente nivel al romper todos los bloques, y una pausa desde la que se puede saltar a cualquier nivel. Confirmar que el sonido de rebote suena solo en paredes y paleta, y el de rotura solo al tocar un bloque.

> Borrador escrito a mano con valores por defecto razonables (no pasó por la entrevista de `/spec`). Los puntos marcados como **[a confirmar]** son supuestos que el humano debe validar antes de pasar a `Approved`.

## Por qué existe esta spec

Hoy el juego tiene un único tablero fijo de 6 filas x 10 columnas: al romperlo todo se gana y se acaba. Esta spec lo convierte en una progresión de 5 niveles y añade una pausa con selector de nivel, para jugar la progresión completa y para poder probar cualquier nivel sin pasar por los anteriores.

## Alcance

**Dentro:**

- 5 niveles, cada uno con una disposición de bloques propia (ver "Niveles").
- Velocidad de la pelota por nivel: `BALL_SPEED * (1 + LEVEL_SPEED_STEP * (nivel - 1))`, con `LEVEL_SPEED_STEP = 0.08` (**[a confirmar]**: +8 % por nivel, nivel 5 = 1.32x).
- Al romper el último bloque de un nivel que no es el último, se pasa al siguiente: nuevos bloques, pelota pegada a la paleta en `ready`, vidas y puntuación se conservan.
- Al romper el último bloque del nivel 5 se llega a `won` (`¡Ganaste!`), como hoy. **[a confirmar]**
- Pausa con `P` o `Esc` durante `playing` y `ready`. En pausa se muestra el nivel actual y un selector.
- Selector de nivel en pausa: teclas `1` a `5` saltan directamente al nivel elegido. **[a confirmar]** (alternativa: flechas + Enter).
- Saltar de nivel reinicia ese nivel: bloques nuevos, pelota pegada a la paleta en `ready`, vidas y puntuación se conservan (**[a confirmar]**: ¿o se reinicia la puntuación?).
- HUD: mostrar el nivel actual junto a puntuación y vidas.
- Sonido: sin cambios de archivos ni de volumen. Se verifica que `ball-bounce.mp3` suena al rebotar en paredes y paleta, y `break-sound.mp3` es lo único que suena al tocar un bloque.

**Fuera de alcance:**

- Control de volumen (se queda el volumen por defecto, `SOUND_VOLUME`).
- Sonidos nuevos (fin de nivel, game over, etc.) y cambios en la tecla `M`.
- Bloques resistentes, power-ups, más de 5 niveles, guardado de progreso.
- Menú principal o pantalla de título.
- Cambios en las partículas y explosiones.

## Niveles

Cuadrícula de 10 columnas (`BLOCK_COLS`) y filas desde `BLOCKS_TOP`. Cada nivel es un array de strings; `.` = vacío y una letra = color de la fila (`r` red, `y` yellow, `c` cyan, `m` magenta, `h` hotpink, `g` green). Los puntos dependen del color, como hoy (`ROW_POINTS`). Diseños propuestos (**[a confirmar]**, se pueden ajustar al implementar):

```
Nivel 1 — clásico (el actual)    Nivel 2 — pirámide
rrrrrrrrrr                        ....rr....
yyyyyyyyyy                        ...yyyy...
cccccccccc                        ..cccccc..
mmmmmmmmmm                        .mmmmmmmm.
hhhhhhhhhh                        hhhhhhhhhh
gggggggggg                        gggggggggg

Nivel 3 — damero                  Nivel 4 — columnas
r.r.r.r.r.                        r.y.c.m.h.
.y.y.y.y.y                        r.y.c.m.h.
c.c.c.c.c.                        r.y.c.m.h.
.m.m.m.m.m                        r.y.c.m.h.
h.h.h.h.h.                        r.y.c.m.h.
.g.g.g.g.g                        r.y.c.m.h.

Nivel 5 — marco y diamante
rrrrrrrrrr
r...yy...r
r..cccc..r
r.mmmmmm.r
r..hhhh..r
rrrrrrrrrr
```

(Nivel 4 usa columnas pares con huecos entre columnas de color; en implementación se completan las 10 columnas de forma simétrica.)

## Modelo de datos

Se amplía `game.js`, sin archivos nuevos.

```js
const LEVEL_COUNT = 5;
const LEVEL_SPEED_STEP = 0.08;
const LEVELS = [
  /* 5 arrays de 6 strings de 10 caracteres */
];
const LEVEL_COLORS = {
  r: "red",
  y: "yellow",
  c: "cyan",
  m: "magenta",
  h: "hotpink",
  g: "green",
};

// Estado nuevo
game.level = 1; // 1..LEVEL_COUNT
game.paused = false; // true mientras la pausa está abierta
```

Convenciones:

- `createBlocks(level)` construye los bloques desde `LEVELS[level - 1]`, usando `ROW_POINTS[fila]` para los puntos como ahora.
- `ballSpeed()` devuelve la velocidad del nivel actual y sustituye a `BALL_SPEED` en `launchBall` y `bouncePaddle`.
- `startLevel(level)`: asigna `game.level`, regenera bloques, limpia explosiones y partículas, llama a `attachBall()` y deja `status = 'ready'`.
- `resetGame()` vuelve al nivel 1, con vidas y puntuación iniciales.
- Pausa: `game.paused` congela `update(dt)` (bloques, pelota, explosiones, partículas) y el bucle sigue dibujando. Se dibuja un velo con el título `Pausa`, el nivel actual y la lista `1-5`. No se puede pausar en `won` / `lost`.
- El audio no se pausa de forma especial: los sonidos son cortos.
- Teclas de la pausa ignoradas fuera de ella; `1`-`5` solo actúan con `game.paused`.

## Plan de implementación

1. Añadir constantes, `LEVELS`, `LEVEL_COLORS`, `game.level`; refactorizar `createBlocks(level)` y que el nivel 1 dé el mismo tablero que hoy. Prueba: el nivel 1 se ve igual que antes.
2. Añadir `ballSpeed()` y usarla al lanzar y en el rebote de la paleta. Prueba: con `game.level = 3` la pelota va 16 % más rápida.
3. Añadir `startLevel(level)` y el paso automático al romper el último bloque (salvo en el nivel 5, que va a `won`). Prueba: `game.blocks.forEach((b, i) => { if (i) b.alive = false })` y romper el último pasa al nivel 2 con `ready`.
4. `resetGame()` vuelve al nivel 1. Prueba: tras `lost` o `won`, `Enter` empieza en nivel 1.
5. Pausa con `P` / `Esc` y congelación de `update`. Prueba: la pelota y las partículas se detienen y reanudan sin salto de `dt`.
6. Selector `1`-`5` en la pausa y dibujo del velo de pausa. Prueba: saltar al nivel 4 desde el nivel 1 carga su disposición.
7. HUD con el nivel actual. Prueba: se ve "Nivel N" y cambia al avanzar o saltar.
8. Verificar el audio (rebote en paredes y paleta; solo rotura en bloques) y corregir si no se cumple. Prueba: ver T8.

## Criterios de aceptación

**Niveles**

- [ ] Existen 5 niveles con disposiciones distintas; el nivel 1 es idéntico al tablero actual.
- [ ] Cada nivel nuevo lanza la pelota un 8 % más rápido que el anterior.
- [ ] Al romper todos los bloques de los niveles 1 a 4 se pasa al siguiente, con la pelota pegada a la paleta y vidas y puntuación intactas.
- [ ] Al romper todos los bloques del nivel 5 aparece `¡Ganaste!`.
- [ ] `Enter` o clic tras `won` / `lost` reinicia en el nivel 1.

**Pausa y selector**

- [ ] `P` o `Esc` pausa y reanuda; durante la pausa nada se mueve ni avanza.
- [ ] En pausa, `1`-`5` salta al nivel elegido y reinicia ese nivel.
- [ ] No se puede pausar en `won` / `lost`.
- [ ] Al despausar, el juego continúa sin saltos de tiempo.

**Sonido**

- [ ] Rebote en pared o paleta: suena solo `ball-bounce.mp3`.
- [ ] Choque con un bloque: suena solo `break-sound.mp3`.
- [ ] Sin control de volumen; la tecla `M` sigue funcionando igual.

**Regresión**

- [ ] Criterios de las specs 01, 02 y 03 siguen cumpliéndose.
- [ ] Sin errores en consola, tampoco con `file://`.

## Pruebas manuales

| ID  | Acción                                        | Resultado esperado                                         |
| --- | --------------------------------------------- | ---------------------------------------------------------- |
| T1  | Cargar el juego                               | Nivel 1 con el tablero clásico y "Nivel 1" en el HUD       |
| T2  | Dejar solo un bloque vivo y romperlo          | Pasa al nivel 2, pelota pegada, puntuación y vidas iguales |
| T3  | Llegar al nivel 5 y romper todo               | `¡Ganaste!`                                                |
| T4  | Pulsar `P` con la pelota en movimiento        | Todo se congela y aparece el velo de pausa                 |
| T5  | En pausa, pulsar `4`                          | Se carga el nivel 4, listo para lanzar                     |
| T6  | Pausar, esperar 10 s y reanudar               | La pelota continúa sin saltos                              |
| T7  | Comparar la velocidad en niveles 1 y 5        | Nivel 5 ≈ 32 % más rápido                                  |
| T8  | Rebotar en pared, paleta y bloque, escuchando | Rebote, rebote, y solo rotura al tocar el bloque           |
| T9  | Perder todas las vidas y pulsar `Enter`       | Reinicia en nivel 1                                        |

## Decisiones

- **Sí:** niveles como datos (`LEVELS`) y no como código, para poder añadir más sin tocar la lógica.
- **Sí:** vidas y puntuación se conservan entre niveles; solo el reinicio total las restaura.
- **Sí:** el selector de nivel es una herramienta de prueba en la pausa, no una pantalla de menú.
- **No:** volumen configurable. Se queda `SOUND_VOLUME`.
- **No:** sonidos nuevos. Los dos existentes cubren lo pedido.

## Riesgos

| Riesgo                                                       | Mitigación                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| La velocidad del nivel 5 hace el juego injugable             | `LEVEL_SPEED_STEP` es una constante fácil de ajustar tras probar. |
| `dt` acumulado durante la pausa produce un salto al reanudar | No avanzar `update` en pausa y mantener el límite `MAX_DT`.       |
| Teclas `1`-`5` interfieren con otros controles               | Solo se atienden con `game.paused`.                               |
| Bloques con tamaño distinto por huecos en el diseño          | Todos los niveles usan la misma cuadrícula de 10 columnas.        |

## Lo que **no** está en esta spec

- Volumen, sonidos nuevos o cambios en `M`.
- Bloques resistentes, power-ups, más niveles, guardado de progreso.
- Menú principal o pantalla de título.
