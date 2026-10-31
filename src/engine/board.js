// Logical board: 6 parallel lanes that share three intersections (cruces).
// Index 0 is the start, LANE_LENGTH is the finish (meta).

export const LANE_COUNT = 6;
export const LANE_LENGTH = 32;
export const CRUCES = [8, 18, 27];

export const SQUARE_TYPES = {
  salida: { label: 'Salida' },
  libre: { label: 'Libre' },
  pregunta: { label: 'Pregunta' },
  dilema: { label: 'Dilema' },
  multa: { label: 'Multa' },
  bonus: { label: 'Bonus' },
  apelacion: { label: 'Apelación' },
  control: { label: 'Control' },
  cruce: { label: 'Cruce' },
  meta: { label: 'Meta' },
};

// Segments between cruces. Each lane rotates every segment by its lane index,
// so all lanes have identical counts per type but different sequences.
const SEGMENTS = [
  { from: 1, types: ['libre', 'pregunta', 'libre', 'multa', 'dilema', 'libre', 'bonus'] },
  { from: 9, types: ['pregunta', 'control', 'libre', 'dilema', 'libre', 'apelacion', 'pregunta', 'multa', 'libre'] },
  { from: 19, types: ['dilema', 'bonus', 'pregunta', 'libre', 'control', 'apelacion', 'libre', 'pregunta'] },
  { from: 28, types: ['multa', 'dilema', 'libre', 'apelacion'] },
];

function buildLane(lane) {
  const squares = new Array(LANE_LENGTH + 1);
  squares[0] = 'salida';
  squares[LANE_LENGTH] = 'meta';
  for (const c of CRUCES) squares[c] = 'cruce';
  for (const seg of SEGMENTS) {
    const n = seg.types.length;
    for (let i = 0; i < n; i++) {
      squares[seg.from + i] = seg.types[(i + lane * 2) % n];
    }
  }
  return squares;
}

export const LANES = Array.from({ length: LANE_COUNT }, (_, i) => buildLane(i));

export function squareAt(lane, pos) {
  return LANES[lane][Math.max(0, Math.min(LANE_LENGTH, pos))];
}

export function isCruce(pos) {
  return CRUCES.includes(pos);
}
