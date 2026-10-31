// Logical board: one winding road per team. Roads physically cross each other
// at intersections (cruces) on squares 8, 17 and 25. Each crossing is shared by
// 2 or 3 specific teams; only teams sharing a crossing can collide there.
// Index 0 is the start, LANE_LENGTH is the finish (meta).

export const LANE_COUNT = 6;
export const LANE_LENGTH = 32;
export const CRUCES = [8, 17, 25];

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

// The roads form a braid. Roads sit side by side in 6 "positions" (left to right);
// at each crossing level, the roads in a group cross and swap order.
// Level 2 uses three-way crossings (roundabouts) so every road crosses at every level.
const LEVEL_GROUPS = [
  [[0, 1], [2, 3], [4, 5]],
  [[0, 1, 2], [3, 4, 5]],
  [[0, 1], [2, 3], [4, 5]],
];

function buildCrossings() {
  const crossings = [];
  const lanePositions = Array.from({ length: LANE_COUNT }, (_, lane) => [lane]);
  const crossingOf = Array.from({ length: LANE_COUNT }, () => []);
  let order = Array.from({ length: LANE_COUNT }, (_, p) => p); // position -> lane
  LEVEL_GROUPS.forEach((groups, level) => {
    const next = [...order];
    for (const group of groups) {
      const id = crossings.length + 1;
      const lanes = group.map((p) => order[p]);
      crossings.push({ id, level, index: CRUCES[level], positions: group, lanes });
      for (const lane of lanes) crossingOf[lane][level] = id;
      group.forEach((p, i) => {
        next[p] = order[group[group.length - 1 - i]];
      });
    }
    order = next;
    order.forEach((lane, p) => lanePositions[lane].push(p));
  });
  return { crossings, lanePositions, crossingOf };
}

const built = buildCrossings();

export const CROSSINGS = built.crossings;
// LANE_POSITIONS[lane] = position (0..5) before level 1, after level 1, 2 and 3.
export const LANE_POSITIONS = built.lanePositions;

export function crossingAt(lane, pos) {
  const level = CRUCES.indexOf(pos);
  return level < 0 ? null : built.crossingOf[lane][level];
}

export function crossingById(id) {
  return CROSSINGS.find((c) => c.id === id) || null;
}

// Segments between cruces. Each lane rotates every segment by its lane index,
// so all lanes have identical counts per type but different sequences.
const SEGMENTS = [
  { from: 1, types: ['libre', 'pregunta', 'libre', 'multa', 'dilema', 'libre', 'bonus'] },
  { from: 9, types: ['pregunta', 'control', 'libre', 'dilema', 'libre', 'apelacion', 'pregunta', 'multa'] },
  { from: 18, types: ['dilema', 'bonus', 'pregunta', 'libre', 'control', 'apelacion', 'pregunta'] },
  { from: 26, types: ['libre', 'multa', 'dilema', 'libre', 'apelacion', 'libre'] },
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
