import { LANE_LENGTH } from '../engine/board.js';
import { describeHistory } from '../engine/describe.js';
import { VEHICLES } from '../engine/roster.js';
import { DEFAULT_RULES } from '../engine/rules.js';
import { $, $$, el, esc } from './dom.js';
import { icon, vehicleSVG } from './icons.js';

const TABS = [
  ['partida', 'Partida'],
  ['equipos', 'Equipos'],
  ['reglas', 'Reglas'],
  ['presentacion', 'Presentación'],
  ['datos', 'Datos'],
  ['atajos', 'Atajos'],
];

export class ConfigDrawer {
  constructor(root, app) {
    this.app = app;
    this.tab = 'partida';
    this.node = el(`
      <aside class="drawer" aria-label="Configuración">
        <div class="drawer-head">
          <div class="drawer-title">
            <div><small>Panel de expositores</small><h2>Configuración</h2></div>
            <button class="tool" data-close title="Cerrar (Esc)">${icon('close')}</button>
          </div>
          <nav class="tabs">${TABS.map(([id, label]) => `<button class="tab" data-tab="${id}">${label}</button>`).join('')}</nav>
        </div>
        <div class="drawer-body"></div>
      </aside>`);
    root.appendChild(this.node);
    this.body = $('.drawer-body', this.node);
    this.node.addEventListener('click', (e) => this.onClick(e));
    this.node.addEventListener('change', (e) => this.onChange(e));
    this.node.addEventListener('input', (e) => this.onInput(e));
  }

  isOpen() {
    return this.node.classList.contains('open');
  }

  open(tab) {
    if (tab) this.tab = tab;
    this.node.classList.add('open');
    this.render();
  }

  close() {
    this.node.classList.remove('open');
  }

  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  refresh() {
    if (this.isOpen()) this.render();
  }

  render() {
    $$('.tab', this.node).forEach((t) => t.classList.toggle('on', t.dataset.tab === this.tab));
    const scroll = this.body.scrollTop;
    this.body.innerHTML = this[`render_${this.tab}`]();
    this.body.scrollTop = scroll;
    const hist = $('.hist', this.body);
    const cur = $('.hist-row.current', this.body);
    if (hist && cur) hist.scrollTop = cur.offsetTop - hist.clientHeight / 2;
  }

  roster() {
    return this.app.session.data.roster;
  }

  name(id) {
    return this.roster().find((t) => t.id === id)?.nombre || id;
  }

  render_partida() {
    const s = this.app.session;
    const st = s.state;
    const all = [...s.data.history, ...[...s.data.redo].reverse()];
    const labels = describeHistory(s.data.roster, s.data.rules, all);
    const cur = s.data.history.length;
    const turnTeam = st.teams[st.turn];
    const status =
      st.phase === 'finished'
        ? `Partida terminada. Ganó <b>${esc(this.name(st.winner))}</b>.`
        : turnTeam
          ? `Jugada <b>${st.moves}</b> · turno de <b>${esc(this.name(turnTeam.id))}</b>`
          : 'Sin equipos activos.';

    const rows = labels
      .map(
        (l) => `<div class="hist-row ${l.index > cur ? 'future' : ''} ${l.index === cur ? 'current' : ''}">
          <span class="hist-n">#${l.index}</span><span>${esc(l.label)}</span>
          <button class="btn ghost" data-jump="${l.index}">${l.index === cur ? 'Actual' : 'Ir aquí'}</button>
        </div>`,
      )
      .join('');

    const manual = st.teams
      .map(
        (t) => `<div class="manual">
          <span><b>${esc(this.name(t.id))}</b></span>
          <input class="field num" type="number" min="0" max="${LANE_LENGTH}" value="${t.pos}" data-pos="${t.id}">
          <button class="btn" data-setpos="${t.id}">Mover</button>
          <button class="btn" data-setturn="${t.id}" ${t.finished ? 'disabled' : ''}>Dar turno</button>
        </div>`,
      )
      .join('');

    return `
      <div class="sec"><div class="note">${status}</div></div>
      <div class="sec">
        <h3>Corregir</h3>
        <p class="help">Todo queda registrado. Deshacer y volver atrás no borra nada: podés rehacer hasta que se juegue una acción nueva.</p>
        <div class="row">
          <button class="btn primary" data-cmd="undo" ${s.canUndo() ? '' : 'disabled'}>Deshacer <small>Z</small></button>
          <button class="btn" data-cmd="redo" ${s.canRedo() ? '' : 'disabled'}>Rehacer <small>Shift+Z</small></button>
          <button class="btn" data-cmd="pass" ${st.phase === 'finished' ? 'disabled' : ''}>Pasar turno</button>
        </div>
        <div class="row">
          <label>Ir a la jugada número</label>
          <input class="field num" type="number" min="0" max="${labels.length ? labels[labels.length - 1].move : 0}" value="${st.moves}" data-k="jumpMove">
          <button class="btn" data-cmd="jumpMove">Ir</button>
        </div>
      </div>
      <div class="sec">
        <h3>Historial</h3>
        <p class="help">Elegí un punto para volver ahí. #0 es el inicio de la partida.</p>
        <div class="hist">
          <div class="hist-row ${cur === 0 ? 'current' : ''}"><span class="hist-n">#0</span><span>Inicio de la partida</span><button class="btn ghost" data-jump="0">${cur === 0 ? 'Actual' : 'Ir aquí'}</button></div>
          ${rows}
        </div>
      </div>
      <div class="sec">
        <h3>Ajuste manual</h3>
        <p class="help">Para cuando algo pasó fuera del juego. Mover no activa la casilla de destino.</p>
        ${manual}
      </div>
      <div class="sec">
        <h3>Reiniciar</h3>
        <p class="help">Vuelve a la casilla de salida con los mismos equipos y reglas. Se puede deshacer exportando antes (pestaña Datos).</p>
        <button class="btn danger" data-arm="restart">Reiniciar partida a 0</button>
      </div>`;
  }

  // Enabled teams for the next game; the live roster only changes on "Nueva partida".
  draft() {
    if (!this.draftEnabled) this.draftEnabled = new Set(this.roster().filter((t) => t.enabled).map((t) => t.id));
    return this.draftEnabled;
  }

  render_equipos() {
    const roster = this.roster();
    const draft = this.draft();
    const rows = VEHICLES.map((v) => {
      const t = roster.find((r) => r.id === v.id) || v;
      return `<div class="team-edit">
        <input type="checkbox" data-enable="${v.id}" ${draft.has(v.id) ? 'checked' : ''} title="Participa">
        ${vehicleSVG(v.id, t.color)}
        <input class="field" value="${esc(t.nombre)}" data-tname="${v.id}">
        <input type="color" value="${t.color}" data-tcolor="${v.id}">
      </div>`;
    }).join('');
    const live = roster.filter((t) => t.enabled).map((t) => t.id);
    const changed = live.length !== draft.size || live.some((id) => !draft.has(id));
    return `
      <div class="sec">
        <h3>Equipos</h3>
        <p class="help">Nombre y color se aplican al instante. Agregar o quitar equipos requiere empezar una partida nueva (entre 2 y 6 equipos).</p>
        ${rows}
      </div>
      <div class="sec">
        ${changed ? '<div class="note">Hay cambios de equipos sin aplicar.</div>' : ''}
        <div class="row">
          <button class="btn danger" data-arm="newgame" ${draft.size >= 2 ? '' : 'disabled'}>Nueva partida con estos equipos</button>
        </div>
      </div>`;
  }

  render_reglas() {
    const r = this.app.session.state.rules;
    const fx = r.efectos;
    const num = (k, v, min = -10, max = 10) => `<input class="field num" type="number" min="${min}" max="${max}" value="${v}" data-rule="${k}">`;
    return `
      <div class="sec">
        <h3>Reglas provisorias</h3>
        <p class="help">Valores de prueba hasta que lleguen las mecánicas finales. Aplicar queda registrado en el historial (se puede deshacer).</p>
        <div class="row"><label class="toggle"><input type="checkbox" data-rule="crucesObligatorios" ${r.crucesObligatorios ? 'checked' : ''}> Cruces con parada obligatoria</label></div>
        <div class="row"><label>Valor máximo de la ruleta</label>${num('spinnerMax', r.spinnerMax, 1, 10)}</div>
      </div>
      <div class="sec">
        <h3>Choques en cruces</h3>
        <div class="row"><label>Penalidad para quien no prevalece</label>
          <select class="field" data-rule="colision.penalidad">
            ${[['retroceder', 'Retrocede casillas'], ['perderTurno', 'Pierde un turno'], ['ambas', 'Ambas']].map(([v, l]) => `<option value="${v}" ${r.colision.penalidad === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div class="row"><label>Casillas que retrocede</label>${num('colision.casillas', r.colision.casillas, 0, 10)}</div>
      </div>
      <div class="sec">
        <h3>Efectos de casillas</h3>
        <div class="row"><label>Pregunta correcta / incorrecta</label>${num('efectos.preguntaOk', fx.preguntaOk)}${num('efectos.preguntaFail', fx.preguntaFail)}</div>
        <div class="row"><label>Dilema correcto / incorrecto</label>${num('efectos.dilemaOk', fx.dilemaOk)}${num('efectos.dilemaFail', fx.dilemaFail)}</div>
        <div class="row"><label>Apelación prospera / no</label>${num('efectos.apelacionOk', fx.apelacionOk)}${num('efectos.apelacionFail', fx.apelacionFail)}</div>
        <div class="row"><label>Multa (casillas)</label>${num('efectos.multa', fx.multa)}</div>
        <div class="row"><label>Control: turnos perdidos</label>${num('efectos.controlTurnos', fx.controlTurnos, 0, 3)}</div>
      </div>
      <div class="row">
        <button class="btn primary" data-cmd="applyRules">Aplicar reglas</button>
        <button class="btn ghost" data-cmd="defaultRules">Valores por defecto</button>
      </div>`;
  }

  render_presentacion() {
    const s = this.app.session.data.settings;
    return `
      <div class="sec">
        <h3>Textos</h3>
        <div class="row"><input class="field wide" value="${esc(s.titulo)}" data-set="titulo"></div>
        <div class="row"><input class="field wide" value="${esc(s.subtitulo)}" data-set="subtitulo"></div>
      </div>
      <div class="sec">
        <h3>Imagen y sonido</h3>
        <div class="row"><label>Calidad gráfica</label>
          <select class="field" data-set="calidad">
            ${[['alto', 'Alta'], ['medio', 'Media'], ['bajo', 'Baja (equipos lentos)']].map(([v, l]) => `<option value="${v}" ${s.calidad === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <p class="help">Cambiar la calidad recarga la página. La partida se conserva.</p>
        <div class="row"><label>Velocidad de animaciones</label>
          <select class="field" data-set="velocidad">
            ${[0.75, 1, 1.5, 2].map((v) => `<option value="${v}" ${s.velocidad === v ? 'selected' : ''}>${v}×</option>`).join('')}
          </select></div>
        <div class="row"><label class="toggle"><input type="checkbox" data-set="sonido" ${s.sonido ? 'checked' : ''}> Sonido</label></div>
        <div class="row"><label>Volumen</label><input type="range" min="0" max="1" step="0.05" value="${s.volumen}" data-set="volumen"></div>
        <div class="row"><label class="toggle"><input type="checkbox" data-set="leyenda" ${s.leyenda ? 'checked' : ''}> Mostrar leyenda de casillas</label></div>
        <div class="row"><button class="btn" data-cmd="full">Pantalla completa</button></div>
      </div>`;
  }

  render_datos() {
    const deck = this.app.deck;
    const n = deck?.cartas?.length || 0;
    return `
      <div class="sec">
        <h3>Guardado automático</h3>
        <p class="help">Cada jugada se guarda en este navegador y sobrevive a recargar o cerrar la ventana. Para cambiar de computadora, exportá la partida.</p>
        <div class="row">
          <button class="btn primary" data-cmd="export">Exportar partida</button>
          <button class="btn" data-cmd="import">Importar partida</button>
        </div>
      </div>
      <div class="sec">
        <h3>Contenido jurídico</h3>
        <p class="help">Archivo JSON con las cartas reales (formato en docs/MANTENIMIENTO.md). Sin contenido, las cartas muestran una consigna genérica y los expositores leen la pregunta.</p>
        <div class="note">${n ? `${n} cartas cargadas${deck.nombre ? ` · ${esc(deck.nombre)}` : ''}` : 'Sin contenido cargado.'}</div>
        <div class="row">
          <button class="btn primary" data-cmd="loadDeck">Cargar contenido</button>
          <button class="btn" data-cmd="clearDeck" ${n ? '' : 'disabled'}>Quitar contenido</button>
        </div>
      </div>
      <div class="sec">
        <h3>Borrar todo</h3>
        <p class="help">Vuelve a la configuración de fábrica: equipos, reglas, textos e historial.</p>
        <button class="btn danger" data-arm="factory">Borrar todo</button>
      </div>`;
  }

  render_atajos() {
    const rows = [
      ['Espacio · → · AvPág', 'Girar la ruleta / acelerar animación / continuar'],
      ['A B C D  ó  1 2 3 4', 'Marcar opción en una carta'],
      ['S / N / X', 'Correcta / Incorrecta / Anular'],
      ['1 … 6  ·  0', 'En un choque: quién prevalece · sin responsable'],
      ['Z  ·  Shift+Z', 'Deshacer · Rehacer'],
      ['V', 'Ver tablero completo'],
      ['1 … 6', 'Fuera de cartas: seguir a un equipo con la cámara'],
      ['L', 'Mostrar / ocultar leyenda'],
      ['M', 'Silenciar'],
      ['F', 'Pantalla completa'],
      ['C  ·  Esc', 'Abrir / cerrar configuración'],
    ];
    return `<div class="sec"><h3>Teclado y control remoto</h3><p class="help">Los presentadores de diapositivas (clickers) envían → y AvPág: avanzan el juego.</p>
      <div class="kbd-list">${rows.map(([k, d]) => `<kbd>${esc(k)}</kbd><span>${esc(d)}</span>`).join('')}</div></div>`;
  }

  readRules() {
    const r = structuredClone(this.app.session.state.rules);
    $$('[data-rule]', this.body).forEach((input) => {
      const path = input.dataset.rule.split('.');
      let v = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value);
      if (typeof v === 'number' && Number.isNaN(v)) return;
      let o = r;
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
      o[path[path.length - 1]] = v;
    });
    return r;
  }

  // Two-step confirmation for destructive buttons.
  arm(btn) {
    if (btn.classList.contains('armed')) return true;
    btn.classList.add('armed');
    btn.dataset.label = btn.textContent;
    btn.textContent = '¿Seguro? Tocá de nuevo para confirmar';
    setTimeout(() => {
      if (!btn.isConnected) return;
      btn.classList.remove('armed');
      btn.textContent = btn.dataset.label;
    }, 3500);
    return false;
  }

  onClick(e) {
    const app = this.app;
    const s = app.session;
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-close')) return this.close();
    if (t.dataset.tab) {
      this.tab = t.dataset.tab;
      return this.render();
    }
    if (t.dataset.jump != null) return app.rewind(() => s.jumpTo(Number(t.dataset.jump)));
    if (t.dataset.setpos) {
      const v = Number($(`[data-pos="${t.dataset.setpos}"]`, this.body).value);
      return app.act({ type: 'SET_POS', team: t.dataset.setpos, pos: v });
    }
    if (t.dataset.setturn) return app.act({ type: 'SET_TURN', team: t.dataset.setturn });
    if (t.dataset.arm) {
      if (!this.arm(t)) return;
      if (t.dataset.arm === 'restart') return app.rewind(() => s.restart());
      if (t.dataset.arm === 'newgame') {
        const draft = this.draft();
        if (draft.size < 2) return;
        const roster = this.roster().map((r) => ({ ...r, enabled: draft.has(r.id) }));
        this.draftEnabled = null;
        return app.newGame(roster);
      }
      if (t.dataset.arm === 'factory') return app.factoryReset();
    }
    switch (t.dataset.cmd) {
      case 'undo':
        return app.command('undo');
      case 'redo':
        return app.command('redo');
      case 'pass':
        return app.act({ type: 'PASS' });
      case 'jumpMove':
        return app.rewind(() => s.jumpToMove(Number($('[data-k="jumpMove"]', this.body).value)));
      case 'applyRules':
        app.act({ type: 'RULES', rules: this.readRules() });
        return app.hud.toast('Reglas actualizadas');
      case 'defaultRules':
        return app.act({ type: 'RULES', rules: structuredClone(DEFAULT_RULES) });
      case 'full':
        return app.command('full');
      case 'export':
        return app.exportSession();
      case 'import':
        return app.importSession();
      case 'loadDeck':
        return app.loadDeck();
      case 'clearDeck':
        return app.clearDeck();
      default:
    }
  }

  onChange(e) {
    const app = this.app;
    const t = e.target;
    if (t.dataset.enable) {
      const d = this.draft();
      t.checked ? d.add(t.dataset.enable) : d.delete(t.dataset.enable);
      return this.render();
    }
    if (t.dataset.set) {
      const k = t.dataset.set;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (k === 'velocidad' || k === 'volumen') v = Number(v);
      app.updateSettings({ [k]: v });
    }
  }

  onInput(e) {
    const t = e.target;
    if (t.dataset.tname) this.app.updateTeam(t.dataset.tname, { nombre: t.value });
    if (t.dataset.tcolor) this.app.updateTeam(t.dataset.tcolor, { color: t.value });
    if (t.dataset.set === 'titulo' || t.dataset.set === 'subtitulo' || t.dataset.set === 'volumen') {
      this.app.updateSettings({ [t.dataset.set]: t.dataset.set === 'volumen' ? Number(t.value) : t.value }, { quiet: true });
    }
  }
}
