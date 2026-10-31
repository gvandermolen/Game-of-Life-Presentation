// Placeholder mechanics. Every number here is meant to be retuned once the
// final rules are delivered; presenters can also change them live (Config > Reglas).

export const DEFAULT_RULES = {
  crucesObligatorios: true,
  spinnerMax: 10,
  colision: {
    penalidad: 'retroceder', // 'retroceder' | 'perderTurno' | 'ambas'
    casillas: 2,
  },
  efectos: {
    preguntaOk: 1,
    preguntaFail: 0,
    dilemaOk: 2,
    dilemaFail: -1,
    apelacionOk: 3,
    apelacionFail: 0,
    multa: -2,
    controlTurnos: 1,
  },
};

export function mergeRules(base, patch) {
  return {
    ...base,
    ...patch,
    colision: { ...base.colision, ...(patch?.colision || {}) },
    efectos: { ...base.efectos, ...(patch?.efectos || {}) },
  };
}

export const CARD_TYPES = ['pregunta', 'dilema', 'apelacion'];

export const CARD_OPTIONS = { pregunta: 4, dilema: 2, apelacion: 2 };
