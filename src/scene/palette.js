// UBA institutional palette (Manual de marca .UBA) plus board-game pastels.
export const UBA = {
  navy: '#1D2554',
  sky: '#91BDE1',
  skyLight: '#BDD7ED',
  gold: '#F7A600',
  goldLight: '#FCCD8E',
  white: '#FFFFFF',
  teal: '#3BC3AD',
  green: '#6BBF3A',
  coral: '#EF4230',
  ink: '#151A3B',
  paper: '#FBF6EA',
};

export const SQUARE_STYLE = {
  salida: { color: '#F4EFE4', ink: UBA.navy, glyph: '', word: 'SALIDA' },
  libre: { color: '#F3E9D3', ink: '#B9A98A', glyph: '', word: '' },
  pregunta: { color: '#91BDE1', ink: UBA.navy, glyph: '?', word: 'PREGUNTA' },
  dilema: { color: '#3BC3AD', ink: '#0E3B36', glyph: 'A|B', word: 'DILEMA' },
  multa: { color: '#EF5A45', ink: '#FFFFFF', glyph: '$', word: 'MULTA' },
  bonus: { color: '#7CC64A', ink: '#173A0A', glyph: '+1', word: 'BONUS' },
  apelacion: { color: '#F7A600', ink: UBA.navy, glyph: '§', word: 'APELACIÓN' },
  control: { color: '#FCCD8E', ink: '#7A2E12', glyph: 'stop', word: 'CONTROL' },
  cruce: { color: '#3A3F4B', ink: '#FFFFFF', glyph: '', word: 'CRUCE' },
  meta: { color: '#F7A600', ink: UBA.navy, glyph: '', word: 'META' },
};

export const SPINNER_COLORS = ['#1D2554', '#91BDE1', '#F7A600', '#F4EFE4', '#3BC3AD', '#EF5A45', '#1D2554', '#BDD7ED', '#7CC64A', '#FCCD8E'];
