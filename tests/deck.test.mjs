import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { pickCard, validateDeck } from '../src/content/deck.js';

const example = JSON.parse(readFileSync(new URL('../docs/placeholders/contenido-ejemplo.json', import.meta.url), 'utf8'));

test('example content file is valid', () => {
  assert.equal(validateDeck(example), null);
});

test('invalid decks are rejected with a message', () => {
  assert.match(validateDeck({}), /cartas/);
  assert.match(validateDeck({ cartas: [{ tipo: 'pregunta', texto: 'x', opciones: ['a'] }] }), /opciones/);
  assert.match(validateDeck({ cartas: [{ tipo: 'otro', texto: 'x' }] }), /tipo/);
});

test('without content, cards are generic', () => {
  const c = pickCard(null, 'pregunta', 0, ['taxi']);
  assert.equal(c.generic, true);
  assert.equal(c.opciones.length, 4);
});

test('cards tagged for the team transport are preferred', () => {
  assert.equal(pickCard(example, 'pregunta', 0, ['colectivo']).id, 'p-01');
  assert.equal(pickCard(example, 'dilema', 5, ['taxi']).id, 'd-01');
  // No tagged match falls back to all cards of the type
  assert.equal(pickCard(example, 'pregunta', 0, ['moto']).id, 'p-01');
});
