// Side-view vehicle silhouettes (viewBox 64x32) and small UI icons.

const W = (r) => `<circle cx="${r[0]}" cy="25" r="4.2" fill="#151A3B"/><circle cx="${r[0]}" cy="25" r="1.6" fill="#fff"/><circle cx="${r[1]}" cy="25" r="4.2" fill="#151A3B"/><circle cx="${r[1]}" cy="25" r="1.6" fill="#fff"/>`;

const VEHICLE = {
  colectivo: (c) => `<rect x="3" y="7" width="58" height="17" rx="4" fill="${c}"/><rect x="6" y="10" width="44" height="6" rx="1.5" fill="#fff" opacity=".9"/><rect x="53" y="10" width="6" height="9" rx="1.5" fill="#fff" opacity=".9"/>${W([15, 49])}`,
  taxi: (c) => `<path d="M6 17 L14 10 H40 L50 17 H58 Q60 17 60 20 V24 H4 V20 Q4 17 6 17Z" fill="#1b1c20"/><path d="M14 10 H40 L46 15 H11Z" fill="${c}"/><rect x="22" y="5" width="12" height="4" rx="1" fill="${c}"/>${W([16, 48])}`,
  auto: (c) => `<path d="M6 17 L15 9 H39 L49 17 H58 Q60 17 60 20 V24 H4 V20 Q4 17 6 17Z" fill="${c}"/><path d="M16 11 H38 L44 16 H12Z" fill="#fff" opacity=".85"/>${W([16, 48])}`,
  app: (c) => `<path d="M6 17 L14 10 H42 L50 17 H58 Q60 17 60 20 V24 H4 V20 Q4 17 6 17Z" fill="${c}"/><path d="M16 12 H40 L45 16 H12Z" fill="#fff" opacity=".85"/><path d="M30 1 a4 4 0 0 1 4 4 c0 3 -4 6 -4 6 s-4 -3 -4 -6 a4 4 0 0 1 4 -4z" fill="#151A3B"/>${W([16, 48])}`,
  moto: (c) => `<circle cx="14" cy="24" r="6" fill="none" stroke="#151A3B" stroke-width="3"/><circle cx="50" cy="24" r="6" fill="none" stroke="#151A3B" stroke-width="3"/><path d="M14 24 L26 15 H40 L50 24" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="24" y="12" width="16" height="6" rx="3" fill="${c}"/><circle cx="34" cy="5" r="4" fill="${c}"/><path d="M30 9 L28 15" stroke="#151A3B" stroke-width="3"/>`,
  remis: (c) => `<path d="M3 17 L13 9 H43 L53 17 H60 Q62 17 62 20 V24 H2 V20 Q2 17 3 17Z" fill="${c}"/><path d="M15 11 H41 L48 16 H11Z" fill="#fff" opacity=".85"/><rect x="4" y="19" width="56" height="1.5" fill="#fff" opacity=".7"/>${W([15, 50])}`,
};

export function vehicleSVG(id, color, cls = 'veh') {
  const draw = VEHICLE[id] || VEHICLE.auto;
  return `<svg class="${cls}" viewBox="0 0 64 32" aria-hidden="true">${draw(color)}</svg>`;
}

const P = {
  gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.3 4.6-1.9.4a6.7 6.7 0 0 1-.7 1.7l1.1 1.6-1.6 1.6-1.6-1.1c-.5.3-1.1.6-1.7.7l-.4 1.9h-2.2l-.4-1.9a6.7 6.7 0 0 1-1.7-.7l-1.6 1.1-1.6-1.6 1.1-1.6a6.7 6.7 0 0 1-.7-1.7l-1.9-.4v-2.2l1.9-.4c.2-.6.4-1.2.7-1.7L5.6 7.2l1.6-1.6 1.6 1.1c.5-.3 1.1-.6 1.7-.7l.4-1.9h2.2l.4 1.9c.6.2 1.2.4 1.7.7l1.6-1.1 1.6 1.6-1.1 1.6c.3.5.6 1.1.7 1.7l1.9.4v2.2Z"/>',
  soundOn: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  soundOff: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  full: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  board: '<rect x="3.5" y="5" width="17" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 15c2-5 8-5 10 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  undo: '<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" transform="translate(0 -3)"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  legend: '<path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

export function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${P[name]}</svg>`;
}
