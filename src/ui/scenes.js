import { AUTOS, BIFURCACION, CELULAR, CELULAR_FINAL, CLAUSULAS, GIROS_JUEGO, GIROS_VUELTA, LLEGADA, RUEDITA, TERMINOS } from '../content/guion.js';
import { FORK } from '../engine/flow.js';
import { el, esc } from './dom.js';
import { vehicleSVG } from './icons.js';

// Overlays that tell the story around the board: the ride app on a phone, the
// fork chooser with its two interruptions, and the finale.

function toggle(node, on) {
  node.classList.toggle('open', on);
}

// ---------------------------------------------------------------- phone

const MAP = `
<svg class="map-svg" viewBox="0 0 300 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="300" height="210" fill="#E9EEF2"/>
  <path d="M0 40H300M0 95H300M0 150H300M0 192H300M48 0V210M118 0V210M190 0V210M258 0V210" stroke="#fff" stroke-width="9"/>
  <path d="M0 120 C80 112 140 140 300 70" stroke="#BFD6EA" stroke-width="16" fill="none"/>
  <rect x="200" y="104" width="46" height="36" rx="4" fill="#CFE6C4"/>
  <rect x="62" y="48" width="44" height="38" rx="4" fill="#CFE6C4"/>
  <path class="route" d="M60 168 H118 V95 H190 V40 H232" stroke="#151A3B" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="60" cy="168" r="8" fill="#151A3B"/><circle cx="60" cy="168" r="3.2" fill="#fff"/>
  <path d="M232 20a11 11 0 0 1 11 11c0 8-11 18-11 18s-11-10-11-18a11 11 0 0 1 11-11Z" fill="#EF4230"/><circle cx="232" cy="31" r="4" fill="#fff"/>
</svg>`;

export class Phone {
  constructor(root, app) {
    this.app = app;
    this.node = el('<div class="phone-layer"><div class="phone-wrap"></div><aside class="phone-sign"></aside><div class="clauses"></div></div>');
    root.appendChild(this.node);
    this.variant = null;
    this.node.addEventListener('click', (e) => {
      if (e.target.closest('.accept') || (this.variant === 'final' && e.target.closest('.fine'))) {
        e.stopPropagation();
        this.app.next();
      }
    });
  }

  isOpen() {
    return this.node.classList.contains('open');
  }

  build(variant) {
    const final = variant === 'final';
    const bat = final ? CELULAR_FINAL.bateria : CELULAR.bateria;
    const price = final ? CELULAR_FINAL.precio : CELULAR.precio;
    const surge = final ? CELULAR_FINAL.tarifa : CELULAR.tarifa;
    this.variant = variant;
    this.node.classList.toggle('final', final);
    this.node.classList.remove('accepted', 'show-clauses');
    this.node.querySelector('.phone-wrap').innerHTML = `
      <div class="phone">
        <div class="phone-screen">
          <div class="status">
            <span>${esc(CELULAR.hora)}</span>
            <span class="island"></span>
            <span class="bat-wrap"><span class="bat-pct">${bat}%</span><span class="bat"><i style="width:${Math.max(6, bat * 2)}%"></i></span></span>
          </div>
          <div class="app-bar"><span class="app-logo">${esc(CELULAR.app)}</span><span class="app-menu"></span></div>
          <div class="map">${MAP}</div>
          <div class="sheet">
            <div class="stops">
              <div class="stop"><i class="dot from"></i><div><small>Origen</small><b>${esc(CELULAR.origen)}</b></div></div>
              <div class="stop"><i class="dot to"></i><div><small>Destino</small><b>${esc(CELULAR.destino)}</b></div></div>
            </div>
            <div class="ride">
              ${vehicleSVG('app', '#151A3B')}
              <div class="ride-name">${esc(CELULAR.servicio)}</div>
              <div class="ride-price"><b>${esc(price)}</b><small class="surge">${esc(surge)}</small></div>
            </div>
            <button class="accept">${esc(CELULAR.boton)}</button>
            <button class="fine">${esc(CELULAR.letraChica)}</button>
          </div>
          <div class="confirmed"><div class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><b>${esc(CELULAR.confirmado)}</b><small>${esc(CELULAR.servicio)}</small></div>
        </div>
      </div>`;
    this.node.querySelector('.phone-sign').innerHTML = final ? `<div class="sign-board">${esc(CELULAR_FINAL.cartel)}</div><div class="sign-hint">Clic en la letra chica</div>` : '';
    this.node.querySelector('.clauses').innerHTML = `
      <div class="doc">
        <div class="doc-title">${esc(CLAUSULAS.titulo)}</div>
        <ol>${CLAUSULAS.lista.map((c, i) => `<li style="--i:${i}">${esc(c)}</li>`).join('')}</ol>
      </div>`;
  }

  show(variant, { clauses = false } = {}) {
    if (this.variant !== variant || !this.isOpen()) this.build(variant);
    toggle(this.node, true);
    this.node.classList.toggle('show-clauses', clauses);
  }

  // The class taps ACEPTAR: button press, then the confirmation screen.
  async accept() {
    const s = this.app.stage;
    this.app.sound.press();
    this.node.querySelector('.accept').classList.add('pressed');
    await s.wait(0.35);
    this.node.classList.add('accepted');
    this.app.sound.chime();
    await s.wait(1.5);
    this.hide();
    await s.wait(0.45);
  }

  showClauses() {
    this.app.sound.card();
    this.node.classList.add('show-clauses');
  }

  hide() {
    toggle(this.node, false);
    this.variant = null;
  }
}

// ---------------------------------------------------------------- fork

function renumber(lines, from) {
  return lines.map((t, i) => `${from + i}. ${t.replace(/^\d+\.\s*/, '')}`);
}

export class Fork {
  constructor(root, app) {
    this.app = app;
    const c = BIFURCACION.caminos;
    this.node = el(`
      <div class="fork-ui">
        <div class="fork-who"></div>
        <div class="fork-title">${esc(BIFURCACION.cartel)}</div>
        <div class="fork-btns">
          ${FORK.map((k) => `<button class="fork-btn" data-k="${k}"><span class="fork-key">${c[k].tecla}</span><span class="fork-name">${esc(c[k].titulo)}</span></button>`).join('')}
        </div>
      </div>`);
    root.appendChild(this.node);
    this.node.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (b) app.choose(b.dataset.k);
    });

    this.adhesionNode = el(`
      <div class="adhesion">
        <div class="road-sign">
          <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="8" width="36" height="46" rx="3" fill="#fff" stroke="#151A3B" stroke-width="3"/><path d="M21 19h22M21 26h22M21 33h14" stroke="#151A3B" stroke-width="3" stroke-linecap="round"/><path d="M24 46l5 5 11-12" fill="none" stroke="#151A3B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <b>${esc(BIFURCACION.adhesion.titulo)}</b>
          <span>${esc(BIFURCACION.adhesion.texto)}</span>
        </div>
      </div>`);
    root.appendChild(this.adhesionNode);

    // A few lines in Spanish, then the English goes on and on.
    const n = TERMINOS.castellano.length;
    const m = TERMINOS.ingles.length;
    const es = renumber(TERMINOS.castellano, 1);
    const en = [0, 1, 2, 3].flatMap((r) => renumber(TERMINOS.ingles, 1 + n + r * m));
    this.termsNode = el(`
      <div class="terms">
        <div class="terms-doc">
          <div class="terms-head">${esc(TERMINOS.titulo)}</div>
          <div class="terms-view"><div class="terms-roll">
            ${[...es, ...en].map((t) => `<p>${esc(t)}</p>`).join('')}
          </div></div>
        </div>
      </div>`);
    root.appendChild(this.termsNode);
    this.skipper = null;
  }

  // state: a 'bifurcacion' state (whose car is choosing), or null to hide.
  show(state) {
    toggle(this.node, !!state);
    if (!state) return;
    const a = AUTOS[state.car];
    const who = this.node.querySelector('.fork-who');
    who.style.setProperty('--team', a.color);
    who.innerHTML = `${vehicleSVG(a.vehiculo, a.color)}<span><b>${esc(a.grupo)}</b><small>${esc(a.nombre)} · auto ${state.car + 1} de ${AUTOS.length}</small></span>`;
    for (const b of this.node.querySelectorAll('[data-k]')) b.classList.toggle('tried', state.tried.includes(b.dataset.k));
  }

  hide() {
    toggle(this.node, false);
  }

  // Cut the current sign or scroll short. False when there is nothing to cut.
  skip() {
    if (!this.skipper) return false;
    this.skipper();
    return true;
  }

  // Resolves after `seconds` of board time, or earlier on skip().
  hold(seconds) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.skipper = null;
        resolve();
      };
      this.skipper = finish;
      this.app.stage.wait(seconds).then(finish);
    });
  }

  async adhesion() {
    this.app.sound.thud();
    toggle(this.adhesionNode, true);
    await this.hold(3.4);
    toggle(this.adhesionNode, false);
    await this.app.stage.wait(0.35);
  }

  // The terms race by in small print until the text runs out. Nothing stops or
  // lights up on the way.
  async terms() {
    const roll = this.termsNode.querySelector('.terms-roll');
    const view = this.termsNode.querySelector('.terms-view');
    roll.style.transition = 'none';
    roll.style.transform = 'translateY(0)';
    toggle(this.termsNode, true);
    await this.app.stage.wait(0.4);
    const target = Math.max(0, roll.scrollHeight - view.clientHeight * 0.15);
    const seconds = TERMINOS.segundos / this.app.stage.speed;
    roll.style.transition = `transform ${seconds}s cubic-bezier(.3,.1,.8,1)`;
    roll.style.transform = `translateY(${-target}px)`;
    await this.hold(TERMINOS.segundos);
    roll.style.transition = 'none';
    toggle(this.termsNode, false);
    await this.app.stage.wait(0.4);
  }

  closeAll() {
    this.skip();
    toggle(this.adhesionNode, false);
    toggle(this.termsNode, false);
  }
}

// ---------------------------------------------------------------- finale

export class Finale {
  constructor(root, app) {
    this.app = app;
    this.arrivalNode = el(`<div class="arrival"><div class="arrival-sign"><small>${esc(LLEGADA.sub)}</small><b>${esc(LLEGADA.titulo)}</b></div></div>`);
    this.cardsNode = el(`
      <div class="verdicts">
        <div class="verdicts-title">Sentencias</div>
        <div class="verdict-grid">
          ${AUTOS.map(
            (a, i) => `
            <div class="verdict" style="--team:${a.color}" data-i="${i}">
              <div class="verdict-inner">
                <div class="v-face v-back"><span>SENTENCIA</span><small>${esc(a.grupo)}</small></div>
                <div class="v-face v-front">
                  <div class="v-head">SENTENCIA</div>
                  <div class="v-team">${vehicleSVG(a.vehiculo, a.color)}<span><b>${esc(a.grupo)}</b><small>${esc(a.nombre)}</small></span></div>
                  <p>${esc(a.sentencia)}</p>
                </div>
              </div>
            </div>`,
          ).join('')}
        </div>
      </div>`);
    const list = (title, nums) => `<div class="spins"><b>${esc(title)}</b><div>${nums.map((n, i) => `<span style="--i:${i}">${n}</span>`).join('')}</div></div>`;
    this.spinNode = el(`
      <div class="reveal">
        <div class="reveal-sign">${esc(RUEDITA.cartel)}</div>
        <div class="reveal-lists">${list(RUEDITA.vuelta, GIROS_VUELTA)}${list(RUEDITA.juego, GIROS_JUEGO)}</div>
      </div>`);
    root.append(this.arrivalNode, this.cardsNode, this.spinNode);
  }

  arrival(on, { fanfare = false } = {}) {
    toggle(this.arrivalNode, on);
    if (on && fanfare) {
      this.app.sound.fanfare();
      this.app.effects.confetti(5);
    }
  }

  // Cards 1..shown are on the table; the newest flips over when animated.
  sentencias(shown, { animate = false } = {}) {
    if (!animate && shown === this.shown) return;
    this.shown = shown;
    toggle(this.cardsNode, shown > 0);
    this.cardsNode.querySelectorAll('.verdict').forEach((v, i) => {
      const on = i < shown;
      const fresh = animate && i === shown - 1;
      v.classList.toggle('dealt', on);
      if (fresh) {
        v.classList.remove('flipped');
        requestAnimationFrame(() =>
          setTimeout(() => {
            v.classList.add('flipped');
            this.app.sound.flip();
          }, 520),
        );
        this.app.sound.card();
      } else v.classList.toggle('flipped', on);
    });
  }

  // state: a 'ruedita' state, or null to hide. With `lista` the numbers show.
  ruedita(state) {
    toggle(this.spinNode, !!state);
    this.spinNode.classList.toggle('listed', !!state?.lista);
  }

  closeAll() {
    this.arrival(false);
    this.sentencias(0);
    this.ruedita(null);
  }
}
