// Card content. Until the real legal material is delivered, the projected cards
// are presenter-led: the type, the team and the answer buttons are shown, and the
// presenters read the question aloud. No invented cases are ever shown on screen.
//
// Real content is loaded from a JSON file (Config > Contenido). Format: docs/MANTENIMIENTO.md

export const DECK_STORAGE_KEY = 'jurisprudencia-en-ruta.deck.v1';

export const GENERIC = {
  pregunta: {
    titulo: 'Pregunta',
    texto: 'Los expositores leen la pregunta. El equipo elige una de las cuatro opciones.',
    opciones: ['A', 'B', 'C', 'D'],
  },
  dilema: {
    titulo: 'Dilema',
    texto: 'Los expositores plantean el dilema. El equipo elige una de las dos posturas.',
    opciones: ['Postura A', 'Postura B'],
  },
  apelacion: {
    titulo: 'Apelación',
    texto: 'El equipo apela una decisión. ¿Prospera el recurso?',
    opciones: ['Confirma', 'Revoca'],
  },
  colision: {
    titulo: 'Accidente de tránsito',
    texto: 'Choque en el cruce. Cada equipo argumenta su responsabilidad; los expositores deciden quién prevalece.',
  },
};

export function validateDeck(data) {
  if (!data || !Array.isArray(data.cartas)) return 'Falta la lista "cartas".';
  const tipos = ['pregunta', 'dilema', 'apelacion', 'colision'];
  for (const [i, c] of data.cartas.entries()) {
    if (!tipos.includes(c.tipo)) return `Carta ${i + 1}: tipo inválido "${c.tipo}".`;
    if (!c.texto) return `Carta ${i + 1}: falta "texto".`;
    if (c.tipo !== 'colision' && (!Array.isArray(c.opciones) || c.opciones.length < 2)) {
      return `Carta ${i + 1}: necesita al menos 2 "opciones".`;
    }
  }
  return null;
}

// Pick the n-th card of a type, preferring cards tagged for the team's transport.
export function pickCard(deck, tipo, seq, transportes = []) {
  const all = (deck?.cartas || []).filter((c) => c.tipo === tipo);
  if (!all.length) return { ...GENERIC[tipo], generic: true };
  const tagged = all.filter((c) => !c.transportes?.length || c.transportes.some((t) => transportes.includes(t)));
  const pool = tagged.length ? tagged : all;
  const c = pool[seq % pool.length];
  return { titulo: c.titulo || GENERIC[tipo].titulo, ...c, generic: false };
}
