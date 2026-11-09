// Line icons for the lap's topics (viewBox 24x24, drawn as strokes). The same
// paths are used in the slides (SVG) and on the board squares (canvas Path2D).

const circle = (cx, cy, r) => `M${cx + r} ${cy}a${r} ${r} 0 1 1-${2 * r} 0a${r} ${r} 0 1 1 ${2 * r} 0`;

export const TOPICS = {
  reloj: `${circle(12, 12, 9)}M12 7v5l3.5 2.2`,
  contrato: 'M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 14.5h7M9 18h4',
  persona: `${circle(12, 7, 3.2)}M5.5 21v-3.5a6.5 6.5 0 0 1 13 0V21`,
  caja: 'M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9',
  personaCaja: `${circle(7, 6.5, 2.4)}M2.5 20v-3a4.5 4.5 0 0 1 9 0v3M14 11h7v9h-7zM14 14.2h7M17.5 11v3.2`,
  firma: 'M3 19c2.5-4 4.5-4.5 5.5-1.6s2.8 2.6 4.5-.6M14.5 14l6.3-6.3-2.5-2.5L12 11.5l-.8 3.3z',
  etapas: `${circle(4, 12, 2.2)}${circle(12, 12, 2.2)}${circle(20, 12, 2.2)}M6.6 12h2.8M14.6 12h2.8`,
  bandera: 'M5 21V3M5 4h13l-3 4.5L18 13H5',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9.2C7.5 20 4 17 4 12V6zM8.5 12l2.5 2.5 4.5-5',
  rayo: 'M13.5 2.5 4.5 14h7l-1 7.5 9-11.5h-7z',
  boleto: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM4 20 20 4',
  cadena: 'M10 14a4 4 0 0 1 0-5.66l2.83-2.83a4 4 0 0 1 5.66 5.66l-1.4 1.4M14 10a4 4 0 0 1 0 5.66l-2.83 2.83a4 4 0 0 1-5.66-5.66l1.4-1.4',
  clic: 'M8.5 7.5l11 5.5-4.8 1.6 3.1 4.7-2 1.3-3.1-4.7-3.6 3.2zM5 4l1.6 1.6M2.5 9.5h2.3M9.5 2.5v2.3',
  juzgado: 'M3 9l9-5.5L21 9zM5.5 10.5v7.5M10 10.5v7.5M14 10.5v7.5M18.5 10.5v7.5M3 20.5h18',
  red: `${circle(12, 5, 2.3)}${circle(5, 18.5, 2.3)}${circle(19, 18.5, 2.3)}M10.9 7.1 6.1 16.4M13.1 7.1l4.8 9.3M7.3 18.5h9.4`,
  algoritmo: 'M7 7h10v10H7zM10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3M10 10h4v4h-4z',
};

export function topicSVG(name, cls = 'topic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TOPICS[name] || ''}"/></svg>`;
}

// Draw a topic icon centred at (x, y), `size` pixels wide.
export function drawTopic(ctx, name, x, y, size, color, width = 1.9) {
  if (!TOPICS[name] || typeof Path2D === 'undefined') return;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(TOPICS[name]));
  ctx.restore();
}
