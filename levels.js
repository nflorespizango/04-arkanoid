// Niveles — ver specs/04-niveles-y-pausa.md
// '.' = vacío; r/y/c/m/h/g = color del bloque. Cuadrícula de 10 columnas.

const LEVEL_COLORS = { r: 'red', y: 'yellow', c: 'cyan', m: 'magenta', h: 'hotpink', g: 'green' };
const LEVELS = [
  [
    'rrrrrrrrrr',
    'yyyyyyyyyy',
    'cccccccccc',
    'mmmmmmmmmm',
    'hhhhhhhhhh',
    'gggggggggg',
  ],
  [
    '....rr....',
    '...yyyy...',
    '..cccccc..',
    '.mmmmmmmm.',
    'hhhhhhhhhh',
    'gggggggggg',
  ],
  [
    'r.r.r.r.r.',
    '.y.y.y.y.y',
    'c.c.c.c.c.',
    '.m.m.m.m.m',
    'h.h.h.h.h.',
    '.g.g.g.g.g',
  ],
  [
    'r.y.cc.y.r',
    'r.y.cc.y.r',
    'r.y.cc.y.r',
    'r.y.cc.y.r',
    'r.y.cc.y.r',
    'r.y.cc.y.r',
  ],
  [
    'rrrrrrrrrr',
    'r...yy...r',
    'r..cccc..r',
    'r.mmmmmm.r',
    'r..hhhh..r',
    'rrrrrrrrrr',
  ],
];

const LEVEL_COUNT = LEVELS.length;
