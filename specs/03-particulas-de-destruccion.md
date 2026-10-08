# SPEC 03 — Partículas de destrucción de bloques

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-08
> **Objective:** Al romper un bloque, lanzar 8 partículas del color del bloque que salen despedidas, caen y se desvanecen en 400 ms, en paralelo a la explosión de 4 frames existente y sin tocar las reglas de juego ni el audio.

## Por qué existe esta spec

La spec 02 ya dibuja la explosión de 4 frames (150 ms) en el sitio del bloque roto. Esa animación es corta y plana. Esta spec añade un efecto de partículas por encima, solo visual, para que la destrucción se sienta más contundente. No cambia colisiones, puntuación, vidas ni sonido.

## Alcance

**Dentro:**

- 8 partículas por bloque roto, cuadradas de 4x4 px y del color del bloque, creadas en el centro del bloque.
- Cada partícula sale con una dirección y velocidad aleatorias, cae por gravedad y se desvanece (opacidad) hasta desaparecer.
- Duración de cada partícula: 400 ms. Una partícula se elimina en cuanto cumple su duración.
- Las partículas de bloques distintos conviven y se animan en paralelo, sin límite fijo de bloques simultáneos.
- La explosión de 4 frames de la spec 02 se mantiene tal cual y se anima a la vez que las partículas.
- Las partículas en curso terminan de animarse en `won` y `lost`. `resetGame()` las vacía.
- Las partículas avanzan con el `dt` limitado a `MAX_DT`, igual que las explosiones.

**Fuera de alcance (para specs futuras):**

- Cualquier cambio de audio (sin sonidos nuevos ni cambios en `ball-bounce.mp3`, `break-sound.mp3` o la tecla `M`).
- Sacudida de pantalla, texto flotante de puntos o encogimiento del bloque.
- Partículas en otros eventos (rebote en paleta, pérdida de vida, lanzamiento).
- Bloques resistentes, power-ups y otros niveles.
- Cambios en la explosión de 4 frames (duración, tamaño o sprites).
- Configuración del efecto por el usuario (activar o desactivar partículas).
- Cualquier cambio en colisiones, puntuación o vidas.

## Modelo de datos

Se amplía `game.js` (no se crean archivos nuevos, igual que en las specs 01 y 02).

```js
// Constantes nuevas
const PARTICLES_PER_BLOCK = 8;
const PARTICLE_SIZE = 4; // px, cuadrado
const PARTICLE_DURATION = 400; // ms
const PARTICLE_SPEED_MIN = 80; // px/s
const PARTICLE_SPEED_MAX = 220; // px/s
const PARTICLE_GRAVITY = 600; // px/s², hacia abajo
const PARTICLE_COLORS = {
  red: "#e03c3c",
  yellow: "#f0d030",
  cyan: "#30d0e0",
  magenta: "#d030d0",
  hotpink: "#ff69b4",
  green: "#40c040",
};

// Estado nuevo
game.particles = [
  /* { x, y, vx, vy, color, elapsed } */
]; // x,y = centro; elapsed en ms
```

Convenciones:

- Los valores de `PARTICLE_COLORS` son una primera aproximación y se ajustan a ojo contra los sprites al implementar. Los bloques `gray` no existen aún y no tienen entrada.
- Al romper un bloque se crean `PARTICLES_PER_BLOCK` partículas en `x = block.x + block.w / 2`, `y = block.y + block.h / 2`. Cada una con `ángulo` aleatorio en `[0, 2π)` y `velocidad` aleatoria en `[PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX]`, de modo que `vx = velocidad * cos(ángulo)` y `vy = velocidad * sin(ángulo)`.
- En `update(dt)`, para cada partícula: `elapsed += dt * 1000`, `vy += PARTICLE_GRAVITY * dt`, `x += vx * dt`, `y += vy * dt`. Se elimina cuando `elapsed >= PARTICLE_DURATION`.
- Opacidad: `globalAlpha = 1 - elapsed / PARTICLE_DURATION`. Tras dibujar las partículas se restaura `globalAlpha = 1`.
- Dibujo: `ctx.fillRect(x - PARTICLE_SIZE / 2, y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE)`. Las coordenadas se redondean para conservar el aspecto pixel art.
- Orden de dibujo: bloques vivos, explosiones, **partículas**, paleta, pelota y velo de `won`/`lost`. Las partículas no tapan la pelota ni el velo.
- `update(dt)` avanza las partículas en **todos** los estados, como las explosiones, antes del `return` de `won`/`lost`.
- Las partículas pueden salir del canvas (por abajo o por los lados) sin ningún tratamiento. Se eliminan por tiempo, no por posición.
- Las partículas no colisionan con nada.

## Plan de implementación

1. Añadir las constantes, `PARTICLE_COLORS` y `game.particles = []`. Vaciarlo en `resetGame()`. Prueba: `game.particles` existe y es `[]` al cargar y tras reiniciar.
2. Añadir `spawnParticles(block)` y llamarla al romper un bloque, junto a la creación de la explosión. Prueba en consola: tras romper un bloque, `game.particles.length` vale 8.
3. Añadir `updateParticles(dt)` (movimiento, gravedad, avance de `elapsed` y eliminación) y llamarla desde `update(dt)` en todos los estados. Prueba: `game.particles.length` pasa de 8 a 0 unos 400 ms después.
4. Dibujar las partículas en `render()` entre las explosiones y la paleta, con opacidad decreciente. Prueba: se ven 8 cuadritos del color del bloque saliendo, cayendo y desvaneciéndose, a la vez que el sprite de la explosión.
5. Ajustar `PARTICLE_COLORS` contra los sprites reales de los 6 colores. Prueba: el color de las partículas coincide visualmente con el bloque roto en cada fila.

## Criterios de aceptación

**Efecto**

- [ ] Al romper un bloque aparecen exactamente 8 partículas de 4x4 px en el centro del bloque.
- [ ] Las partículas tienen el color del bloque roto en las 6 filas.
- [ ] Las partículas salen en direcciones distintas, caen y se desvanecen hasta ser invisibles.
- [ ] Cada partícula desaparece de `game.particles` a los 400 ms (±1 frame) de haber sido creada.
- [ ] La explosión de 4 frames sigue dibujándose y dura 150 ms, a la vez que las partículas.
- [ ] Dos bloques rotos en frames seguidos tienen sus partículas animándose en paralelo, cada una con su propio `elapsed`.

**Integración**

- [ ] Las partículas no afectan a la pelota, a los bloques ni a la puntuación (no colisionan).
- [ ] Las partículas no tapan la pelota, la paleta ni el velo de `won`/`lost`.
- [ ] Al romper el último bloque, las partículas terminan de animarse antes de que desaparezcan, con `¡Ganaste!` ya visible.
- [ ] Tras reiniciar con `Enter` o clic, `game.particles.length === 0`.
- [ ] Con la pestaña oculta varios segundos, las partículas no saltan ni se acumulan al volver.
- [ ] No cambia ningún comportamiento de audio (sonidos y tecla `M` iguales que en la spec 02).
- [ ] No aparece ningún error en la consola, tampoco con `file://`.

**Regresión**

- [ ] Los criterios de aceptación de las specs 01 y 02 siguen cumpliéndose.

## Pruebas manuales

| ID  | Acción                                                                                           | Resultado esperado                                                                            |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| T1  | Romper un bloque de la fila de arriba (red)                                                      | Se ven 8 cuadritos rojos y la explosión de 4 frames a la vez                                  |
| T2  | Ejecutar `game.particles.length` justo tras romper un bloque y 500 ms después                    | `8` y luego `0`                                                                               |
| T3  | Romper un bloque de cada color                                                                   | Las partículas coinciden con el color de cada bloque                                          |
| T4  | Romper dos bloques seguidos en menos de 100 ms                                                   | Hasta 16 partículas a la vez, cada grupo se desvanece en su momento                           |
| T5  | Ejecutar `game.blocks.forEach((b, i) => { if (i) b.alive = false })` y romper el bloque restante | Las partículas se animan completas bajo el velo de `¡Ganaste!`; tras reiniciar no hay ninguna |
| T6  | Cambiar de pestaña 10 s con partículas en curso y volver                                         | Continúan sin saltos ni acumulación                                                           |
| T7  | Activar el silencio con `M` y romper bloques                                                     | Las partículas se ven igual y el audio se comporta como en la spec 02                         |
| T8  | Repetir T1 a T3 en Chrome, Edge y Firefox                                                        | Mismo comportamiento en los tres                                                              |

## Decisiones

- **Sí:** las partículas se suman a la explosión de 4 frames. Es el cambio mínimo y no reabre lo aprobado en la spec 02.
- **No:** reemplazar el sprite por partículas. Se perdería el uso de `EXPLOSION_FRAMES` y los assets existentes.
- **Sí:** partículas dibujadas con `fillRect`, sin assets nuevos. Mantiene el proyecto sin dependencias ni build.
- **Sí:** 8 cuadritos de 4x4 px del color del bloque. Es legible sobre el pixel art de 32x16 escalado x2 y pocas partículas por bloque dan un coste de dibujo despreciable.
- **Sí:** duración de 400 ms, mayor que los 150 ms del sprite. Las partículas se ven después de que el sprite desaparece.
- **Sí:** cada partícula se elimina en cuanto termina su animación, sin esperar al resto. Cumple "al terminar la animación, deja de existir".
- **Sí:** partículas y explosiones en paralelo, cada una con su `elapsed`. No hay cola ni límite.
- **Sí:** avance con `dt` limitado y no con `performance.now()`, igual que las explosiones. Se congela con la pestaña oculta.
- **Sí:** las partículas terminan de animarse en `won`/`lost` y se vacían en `resetGame()`, igual que las explosiones.
- **Sí:** una tabla `PARTICLE_COLORS` propia. Los sprites no exponen un color y leer píxeles con `getImageData` falla con `file://`.
- **No:** audio. El pedido es solo de animación, y el sonido de rotura ya existe desde la spec 02.
- **No:** sacudida de pantalla, texto flotante ni encogimiento del bloque. Se descartaron para este alcance.
- **No:** colisión de las partículas con paleta, paredes o bloques. Son decorativas y no deben influir en el juego.
- **No:** aleatoriedad inyectable o semilla fija. Las pruebas comprueban cantidad, tiempo y color, no trayectorias.

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Colores de `PARTICLE_COLORS` que no coinciden con los sprites          | Paso 5 del plan: ajustarlos a ojo contra los 6 colores reales.                                            |
| `globalAlpha` olvidado en un valor distinto de 1 y que afecte al resto | Restaurar `globalAlpha = 1` tras dibujar las partículas, antes de dibujar paleta, pelota y texto.         |
| Muchas partículas vivas si se rompen bloques muy seguidos              | Máximo 8 por bloque y solo un bloque por frame; a 400 ms de vida hay como mucho unas pocas decenas vivas. |
| Las partículas se dibujan encima del HUD al salir hacia arriba         | Aceptado: duran 400 ms y son decorativas. Si molesta, se recortan con el HUD en una spec posterior.       |

## Lo que **no** está en esta spec

- Cambios de audio de cualquier tipo.
- Sacudida de pantalla, texto flotante de puntos o encogimiento del bloque.
- Partículas en otros eventos distintos de romper un bloque.
- Bloques resistentes, power-ups y varios niveles.
- Opciones de usuario para el efecto.

Cada una de esas cosas, si llega, va en su propia spec.
