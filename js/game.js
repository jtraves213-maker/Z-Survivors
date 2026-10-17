'use strict';
(() => {
  const { TECHS, PASSIVES, CHARS, GRUNT_TYPES, SAGAS, FUSIONS, CAPSULES, ITEMS, RIFT_BOSSES, GACHA, ART_DENSITY, ULTS, LR_PANELS } = window.ZS_DATA;
  const TAU = Math.PI * 2;
  const SAGA_TIME = 90;          // seconds before a saga's boss shows up
  const MAX_ENEMIES = 260;
  const FUSE_WINDOW = 5, FUSE_TIME = 30, FUSE_COOLDOWN = 120, REVIVE_TIME = 3;
  const FINE = 2;                // canvas pixels per world unit; 16px art draws 2x, hd/ art draws 1:1
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const d2 = (ax, ay, bx, by) => { const x = ax - bx, y = ay - by; return x * x + y * y; };
  const fmt = n => Math.floor(n).toLocaleString('en-US');
  const short = n => n < 1000 ? String(Math.round(n)) : n < 1e6 ? (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + 'k' : (n / 1e6).toFixed(1) + 'M';
  const mmss = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------ canvas
  const cv = $('game'), sctx = cv.getContext('2d');
  const low = document.createElement('canvas'), ctx = low.getContext('2d');
  let W = 0, H = 0, Z = 4, VW = 0, VH = 0;
  function resize() {
    W = innerWidth; H = innerHeight; cv.width = W; cv.height = H;
    Z = 2 * clamp(Math.round(Math.sqrt(W * H) / 680), 1, 3);   // screen px per world unit (always even)
    VW = Math.ceil(W / Z); VH = Math.ceil(H / Z);
    low.width = VW * FINE; low.height = VH * FINE;
    sctx.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize); resize();

  // ------------------------------------------------------------ art
  const ART = {};
  function artNames() {
    const s = new Set(['orb_blue', 'orb_green', 'orb_red', 'orb_gold', 'dragonball', 'senzu', 'icon_skull', 's_nhouse', 's_crystal']);
    for (const c of Object.values(CHARS)) for (const f of c.forms) s.add(f.sprite);
    for (const fu of Object.values(FUSIONS)) for (const f of fu.forms) s.add(f.sprite);
    for (const g of SAGAS) {
      s.add(g.boss.s);
      for (const [n] of g.grunts) s.add(n);
      for (const n of biomeArt(g.biome)) s.add(n);
    }
    for (const c of Object.values(CAPSULES)) s.add(c.sprite);
    s.add('ticket'); s.add('shenron'); s.add('loot_capsule'); for (const n of FX_NAMES) s.add(n);
    for (const it of Object.values(ITEMS)) s.add(it.sprite);
    for (const b of RIFT_BOSSES) { s.add(b.s); if (b.rage) s.add(b.rage); }
    return [...s];
  }
  function biomeArt(b) {
    const out = ['g_' + b];
    for (const k of ['boulder0', 'boulder1', 'block0', 'block1', 'mesa', 'column', 'ruin', 'house', 'tree', 'bush']) out.push('s_' + k + '_' + b);
    for (const k of ['crater', 'grass', 'flowers', 'crack', 'rubble']) out.push('d_' + k + '_' + b);
    return out;
  }
  function loadImg(name) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        const hd = name.startsWith('hd/');
        // hd/ sheets are horizontal strips of square frames
        const strip = hd || (name.startsWith('fx/') && !/beam_|drill_/.test(name));   // fx/ strips are square frames too
        ART[name] = { img: im, white: c, hd, density: hd ? (ART_DENSITY[name] || 2) : 1, fw: strip ? im.height : im.width, fh: im.height, frames: strip ? Math.round(im.width / im.height) : 1 };
        res();
      };
      im.onerror = () => { ART[name] = null; res(); };
      im.src = 'art/' + name + '.png';
    });
  }
  // Draws a sprite centred on (x, y) in world units. `frame` picks a cell of an hd/ strip.
  function sprite(name, x, y, s = 1, flash = 0, alpha = 1, frame = 0, flip = false) {
    const a = ART[name];
    const dens = a ? a.density : 1, fw = a ? a.fw : 16, fh = a ? a.fh : 16;
    const w = fw / dens * s, h = fh / dens * s;
    const snap = v => Math.round(v * dens) / dens;
    const dx = snap(x - w / 2), dy = snap(y - h / 2);
    ctx.globalAlpha = alpha;
    if (!a) { ctx.fillStyle = '#f0f'; ctx.fillRect(dx, dy, w, h); ctx.globalAlpha = 1; return; }
    const sx = (frame % a.frames) * fw;
    if (flip) { ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1); }
    const ox = flip ? 0 : dx, oy = flip ? 0 : dy;
    ctx.drawImage(a.img, sx, 0, fw, fh, ox, oy, w, h);
    if (flash > 0) { ctx.globalAlpha = alpha * Math.min(1, flash * 12); ctx.drawImage(a.white, sx, 0, fw, fh, ox, oy, w, h); }
    if (flip) ctx.restore();
    ctx.globalAlpha = 1;
  }
  function spriteHeight(name, s = 1) { const a = ART[name]; return a ? a.fh / a.density * s : 16 * s; }
  function circ(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, r), 0, TAU); ctx.fill(); }
  function kiBall(x, y, r, col, core) {
    ctx.globalAlpha = 0.35; circ(x, y, r * 1.6, col); ctx.globalAlpha = 1;
    circ(x, y, r, col); circ(x, y, r * 0.55, core || '#fff');
  }

  // ------------------------------------------------------------ audio
  let AC = null, muted = false, noiseBuf = null; const lastS = {};
  function audioInit() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  function tone(f, dur, type, vol, slide) {
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(AC.destination); s.start(t); s.stop(t + dur + 0.02);
  }
  function sfx(n) {
    if (n !== 'hit' && n !== 'xp' && n !== 'shot' && typeof NET !== 'undefined') netEvent(['s', n]);
    if (!AC || muted) return;
    const now = performance.now(), gap = { shot: 70, hit: 45, xp: 40, beam: 150, boom: 90 }[n] || 0;
    if (lastS[n] && now - lastS[n] < gap) return; lastS[n] = now;
    switch (n) {
      case 'shot': tone(880, 0.05, 'square', 0.012, 0.5); break;
      case 'beam': tone(180, 0.4, 'sawtooth', 0.025, 2.5); noise(0.4, 0.02, 2000); break;
      case 'hit': noise(0.03, 0.025, 3000); break;
      case 'boom': noise(0.35, 0.1, 700); break;
      case 'xp': tone(1100 + Math.random() * 400, 0.04, 'sine', 0.018); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => AC && tone(f, 0.12, 'square', 0.035), i * 70)); break;
      case 'transform': tone(90, 1.6, 'sawtooth', 0.05, 9); noise(1.4, 0.05, 900); break;
      case 'fuse': [392, 494, 587, 784, 988].forEach((f, i) => setTimeout(() => AC && tone(f, 0.25, 'triangle', 0.05), i * 110)); break;
      case 'hurt': tone(170, 0.15, 'square', 0.045, 0.5); break;
      case 'boss': tone(70, 0.9, 'sawtooth', 0.06, 0.6); break;
      case 'pick': tone(660, 0.12, 'triangle', 0.05, 2); break;
    }
  }

  // ------------------------------------------------------------ input
  // Solo: WASD or arrows. Co-op: P1 = WASD + E, P2 = arrows + Enter. Gamepad n drives player n.
  const keys = new Set();
  const FUSE_KEYS = [['KeyE', 'Space'], ['Enter', 'NumpadEnter', 'ShiftRight', 'Numpad0'], ['KeyY']];
  addEventListener('keydown', e => {
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) onKey(e);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); mouse.on = false; if (state === 'play' && !NET.role) pause(); });
  const joy = { on: false, ox: 0, oy: 0, x: 0, y: 0, id: null };
  // Mouse: hold the left button to move toward the cursor. Touch: drag anywhere for a virtual stick.
  const mouse = { on: false, x: 0, y: 0, id: null };
  cv.addEventListener('pointerdown', e => {
    audioInit();
    if (e.pointerType === 'mouse') {
      if (e.button === 2) { ultPressed(); return; }
      if (e.button !== 0) return;
      mouse.on = true; mouse.id = e.pointerId; mouse.x = e.clientX; mouse.y = e.clientY; cv.setPointerCapture(e.pointerId); return;
    }
    joy.on = true; joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (mouse.on && e.pointerId === mouse.id) { mouse.x = e.clientX; mouse.y = e.clientY; }
    if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; }
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const joyEnd = e => { if (e.pointerId === joy.id) joy.on = false; if (e.pointerId === mouse.id) mouse.on = false; };
  function mouseMove(p) {
    if (!mouse.on || !p || !G) return null;
    if (p.absorbed && G.fusion) p = G.fusion.ctrl;
    const sx = (p.x - G.cx) * Z + W / 2, sy = (p.y - 4 - G.cy) * Z + H / 2;
    const dx = mouse.x - sx, dy = mouse.y - sy, d = Math.hypot(dx, dy);
    return d < 12 ? [0, 0] : [dx / d, dy / d];
  }
  cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);

  const pads = [{}, {}, {}, {}];   // previous button states per pad, for edge detection
  // With N pads, they drive the last N players (keyboard covers P1 and P2 first).
  function padOwner(i, nPads, nPl) { return Math.max(0, nPl - nPads) + i; }
  function padFor(p) {
    const list = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const n = Math.min(4, list.length), i = p.idx - Math.max(0, G.players.length - n);
    return i >= 0 && i < n ? pads[i] : null;
  }
  function readPads() {
    const list = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const nPads = Math.min(4, list.length), nPl = G ? G.players.length : 1;
    for (let i = 0; i < 4; i++) {
      const gp = list[i], prev = pads[i] || {};
      if (!gp) { pads[i] = {}; continue; }
      const b = n => !!(gp.buttons[n] && gp.buttons[n].pressed);
      const now = { a: b(0), xb: b(2), y: b(3), lb: b(4), rb: b(5), start: b(9), up: b(12), down: b(13), x: gp.axes[0] || 0, ay: gp.axes[1] || 0, l: b(14), r: b(15) };
      now.pressA = now.a && !prev.a; now.pressStart = now.start && !prev.start;
      const pl = G && (isClient() ? (i === 0 ? G.players[NET.me] : null) : G.players[padOwner(i, nPads, nPl)]);
      if (pl && state === 'play') {
        if (now.lb && !prev.lb) selectSlot(pl, (pl.active - 1 + pl.slots.length) % pl.slots.length);
        if (now.rb && !prev.rb) selectSlot(pl, (pl.active + 1) % pl.slots.length);
        if (now.y && !prev.y) openBond(pl);
        if (now.xb && !prev.xb) { if (isClient()) sendHost({ t: 'ult' }); else castUltimate(pl); }
      }
      if (state === 'wish' && now.pressA) (isClient() ? remoteWish : chooseWish)(wishFocus);
      if (state === 'wish' && ((now.up && !prev.up) || (now.down && !prev.down))) moveWishFocus(now.up ? -1 : 1);
      now.pressUp = now.up && !prev.up; now.pressDown = now.down && !prev.down;
      pads[i] = now;
      if (now.pressStart) { if (isClient()) sendHost({ t: state === 'paused' ? 'resume' : 'pause' }); else if (state === 'play') pause(); else if (state === 'paused') resume(); }
      if (state === 'levelup') {
        if (now.pressUp || now.pressDown) moveCardFocus(now.pressUp ? -1 : 1);
        if (now.pressA) (isClient() ? remoteChoose : choose)(cardFocus);
      } else if (now.pressA && pl) { if (isClient()) sendHost({ t: 'fuse' }); else fusePressed(pl); }
    }
  }
  // A fusion splits the controls: the shooter (Goku in Gogeta, Vegeta in Vegito) aims, the partner steers.
  function moveInput(p) {
    const F = p.fusion;
    if (F && G.fusion && !isBot(F.other) && !F.other.left && !(window.ZS && window.ZS.bot)) { F.aim = rawInput(p); return rawInput(F.other); }
    return rawInput(p);
  }
  function rawInput(p) {
    if (p.remote) { const r = NET.inputs[p.idx] || { x: 0, y: 0 }; return [r.x, r.y]; }
    if (isHost() && p.idx === 0) return localInput(p);
    let x = 0, y = 0;
    const solo = G.players.length === 1;
    const wasd = p.idx === 0, arrows = solo || (G.test ? p.idx === 0 : p.idx === 1);
    if (p.idx === 2) { if (keys.has('KeyJ')) x--; if (keys.has('KeyL')) x++; if (keys.has('KeyI')) y--; if (keys.has('KeyK')) y++; }
    if ((wasd && keys.has('KeyA')) || (arrows && keys.has('ArrowLeft'))) x--;
    if ((wasd && keys.has('KeyD')) || (arrows && keys.has('ArrowRight'))) x++;
    if ((wasd && keys.has('KeyW')) || (arrows && keys.has('ArrowUp'))) y--;
    if ((wasd && keys.has('KeyS')) || (arrows && keys.has('ArrowDown'))) y++;
    const pad = padFor(p);
    if (pad && pad.x !== undefined) {
      if (Math.hypot(pad.x, pad.ay) > 0.25) { x = pad.x; y = pad.ay; }
      if (pad.l) x = -1; if (pad.r) x = 1; if (pad.up) y = -1; if (pad.down) y = 1;
    }
    if (p.idx === 0 && joy.on) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d > 8) { x = dx / Math.max(d, 40); y = dy / Math.max(d, 40); }
    }
    if (p.idx === 0) { const mv = mouseMove(p); if (mv) [x, y] = mv; }
    if (isBot(p)) [x, y] = followBot(p);
    else if (window.ZS && window.ZS.bot) [x, y] = botInput(p);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return [x, y];
  }
  const isBot = p => !!(G && G.test && G.test.bots.includes(p.idx));
  function followBot(p) {   // #fusiontest partner: stay near player 1, dodge crowds
    const lead = G.players[0];
    let x = 0, y = 0;
    const dx = lead.x - p.x, dy = lead.y - p.y, d = Math.hypot(dx, dy);
    if (d > 26) { x += dx / d; y += dy / d; }
    for (const e of G.enemies) { const ex = p.x - e.x, ey = p.y - e.y, dd = ex * ex + ey * ey + 1; if (dd < 30 * 30) { x += ex / dd * 15; y += ey / dd * 15; } }
    return [x, y];
  }
  function botInput(p) {   // debug autopilot: flee crowds, sweep orb clusters, revive partners
    let x = 0, y = 0;
    for (const e of G.enemies) { const dx = p.x - e.x, dy = p.y - e.y, dd = dx * dx + dy * dy + 1, R = 30 + e.r * 3; if (dd < R * R) { x += dx / dd * 25; y += dy / dd * 25; } }
    for (const s of G.eshots) { const dx = p.x - s.x, dy = p.y - s.y, dd = dx * dx + dy * dy + 1; if (dd < 50 * 50) { x += dx / dd * 60; y += dy / dd * 60; } }
    let ax = 0, ay = 0;
    for (const q of G.orbs) { const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 400) { ax += dx / d / (d + 30); ay += dy / d / (d + 30); } }
    for (const o of G.players) if (o.down) { const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1; ax += dx / d * 0.05; ay += dy / d * 0.05; }
    const am = Math.hypot(ax, ay); if (am > 0) { x += ax / am * 0.9; y += ay / am * 0.9; }
    x += Math.cos(G.t * 0.3 + p.idx * 3) * 0.15; y += Math.sin(G.t * 0.3 + p.idx * 3) * 0.15;
    return [x, y];
  }

  // ------------------------------------------------------------ state
  let state = 'loading';   // loading | title | play | intro | levelup | transform | fusing | paused | over
  let G = null;
  let best = {}; try { best = JSON.parse(localStorage.getItem('zs-best') || '{}'); } catch (e) { best = {}; }
  const xpFor = l => Math.floor(5 + l * 4 + l * l * 0.6);
  const P_COLORS = ['#ff8a1f', '#46c4ff', '#8aff4a', '#ff5ab4'];

  function makePlayer(idx, charId, x) {
    const C = CHARS[charId];
    const p = { idx, charId, C, x, y: 0, kvx: 0, kvy: 0, hp: C.hp, form: 0, techs: {}, passives: {}, iframe: 0, revive: !!C.revive,
      anim: 0, moving: false, hurtT: 0, face: 1, down: false, reviveT: 0, absorbed: false, fusion: null, announced: new Set(),
      buffs: { speed: 0, dex: 0, power: 0 }, item: null, itemCD: 0, poleT: 2,
      slots: [], active: 0, bonds: 0, wish: { might: 1, hp: 1, speed: 1 }, energy: 0, ultLock: 0 };
    for (const [id, lv] of C.techs) if (lv <= 1) p.announced.add(id);
    return p;
  }
  function newRun(charIds) {
    G = {
      charIds, t: 0, sagaIdx: 0, sagaT: 0, bossSpawned: false, boss: null, interSaga: 0, endless: false,
      enemies: [], shots: [], eshots: [], beams: [], bombs: [], hz: [], fx: [], parts: [], texts: [], orbs: [], pickups: [],
      kills: 0, dmgDealt: 0, spawnAcc: 0, encircled: false, dragonBalls: 0, shenron: 0,
      level: 1, xp: 0, xpNext: xpFor(1), picks: [],
      shake: 0, flash: 0, flashCol: '#fff', over9000: false, tf: null, cx: 0, cy: 0,
      fusion: null, fuseReq: null, fuseCD: 0, fusing: null,
      rift: null, riftT: 120, riftCount: 0, riftOrder: shuffle(RIFT_BOSSES.map((_, i) => i)), arena: null,
      capsTaken: new Set(), capsSpawned: new Set(), ults: [], lootT: 45,
    };
    chunks = new Map();
    G.players = charIds.map((id, i) => makePlayer(i, id, (i - (charIds.length - 1) / 2) * 20));
    for (const p of G.players) { addTech(p, p.C.start); recalc(p); p.hp = p.ps.maxHp; p.remote = isHost() && p.idx > 0; }
    hudKey = ''; techKey = ''; buildPlayerCards(); preloadCinematics();
    $('title').hidden = true; $('over').hidden = true; $('hud').hidden = false;
    state = 'play';
    sagaBanner();
  }
  const coop = () => G.players.length > 1;
  const teamMul = k => 1 + k * (G.players.length - 1);
  const bodies = () => G.players.filter(p => !p.down && !p.absorbed);
  const saga = () => SAGAS[G.sagaIdx % SAGAS.length];
  const loopN = () => Math.floor(G.sagaIdx / SAGAS.length);
  const sagaName = () => saga().name + (loopN() ? ' +' + loopN() : '');
  const pName = p => (coop() ? 'P' + (p.idx + 1) + ' ' : '') + p.C.name;

  // Each technique gets its own number slot; bonding merges slots so they fire together.
  function addTech(p, id) {
    p.techs[id] = { lv: 1, t: 0.4, ang: 0, ct: [], queue: 0, qt: 0 };
    if (!p.slots.some(sl => sl.includes(id))) p.slots.push([id]);
  }
  function slotOf(p) { return p.slots[p.active] || []; }
  function techActive(p, id) {
    return !!((p.techs[id] && slotOf(p).includes(id)) || (p.fusion && p.fusion.other.techs[id] && slotOf(p.fusion.other).includes(id)));
  }
  function selectSlot(p, i) {
    if (isClient()) {
      if (p && p.idx === NET.me && i >= 0 && i < p.slots.length) { p.active = i; techKey = ''; sendHost({ t: 'slot', i }); }
      return;
    }
    if (!p || i < 0 || i >= p.slots.length || p.active === i) return;
    p.active = i; techKey = '';
    const body = p.absorbed && G.fusion ? G.fusion.ctrl : p;
    text(body.x, body.y - 18, p.slots[i].map(id => TECHS[id].name).join(' + '), TECHS[p.slots[i][0]].color);
  }

  function baseStats(p) {
    const C = p.C, f = C.forms[p.form], pv = id => p.passives[id] || 0;
    const s = {};
    s.might = (1 + 0.1 * pv('gravity')) * f.power * (C.might || 1) * p.wish.might;
    if (p.techs.kaioken) s.might *= 1 + TECHS.kaioken.stats(p.techs.kaioken.lv).might;
    s.cd = Math.max(0.4, 1 - 0.07 * pv('kicontrol')) * (C.cdMul || 1);
    s.area = (1 + 0.1 * pv('divine')) * (C.area || 1);
    s.speed = C.speed * 1.15 * (1 + 0.08 * pv('weights')) * (1 + 0.025 * p.form) * p.wish.speed;
    s.magnet = 36 * (1 + 0.35 * pv('scouter')) * (p.item === 'radar' ? 1.6 : 1);
    s.armor = pv('armor') + p.form * 0.5;
    s.maxHp = (C.hp + 20 * pv('zenkai') + 15 * p.form) * (p.item === 'potara' ? 1.15 : 1) * p.wish.hp;
    s.dodge = 0.05 * pv('afterimage') + (f.dodge || 0);
    s.xp = (1 + 0.12 * pv('turtle')) * (C.xpMul || 1);
    return s;
  }
  function recalc(p) {
    p.base = baseStats(p);
    const F = p.fusion;
    if (F) {   // the fused body pools both fighters
      const o = F.other; o.base = baseStats(o);
      const a = p.base, b = o.base, ff = fusionForm();
      p.ps = {
        might: (a.might + b.might) / 2 * ff.mult, cd: Math.min(a.cd, b.cd), area: Math.max(a.area, b.area) + 0.1,
        speed: Math.max(a.speed, b.speed) * 1.1, magnet: Math.max(a.magnet, b.magnet), armor: Math.max(a.armor, b.armor) + 2,
        maxHp: a.maxHp + b.maxHp, dodge: Math.max(a.dodge, b.dodge), xp: Math.max(a.xp, b.xp),
      };
    } else p.ps = p.base;
    p.hp = Math.min(p.hp, p.ps.maxHp);
  }
  function recalcAll() { for (const p of G.players) if (!p.absorbed) recalc(p); }
  function might(p) {
    let m = p.ps.might;
    if (p.charId === 'gohan' && !p.fusion) m *= 1 + 0.4 * (1 - p.hp / p.ps.maxHp);
    if (p.buffs && p.buffs.power > 0) m *= 1.4;
    if (hasItem(p, 'potara')) m *= 1.2;
    return m;
  }
  // Items and timed capsule buffs layer on top of the fighter's stats.
  function hasItem(p, id) { return p.item === id || !!(p.fusion && p.fusion.other.item === id); }
  function moveSpeed(p) { return p.ps.speed * (p.buffs.speed > 0 ? 1.45 : 1) * (hasItem(p, 'nimbus') ? 1.3 : 1); }
  function cdMul(p) { return p.ps.cd * (p.buffs.dex > 0 ? 0.65 : 1); }
  function dodgeOf(p) { return p.ps.dodge + (p.buffs.dex > 0 ? 0.15 : 0); }
  function powerLevel(p) { return 8 * Math.pow(G.level, 2.3) * might(p) + 4; }
  function curForm(p) { return p.fusion ? fusionForm() : p.C.forms[p.form]; }
  function fusionForm() { return FUSIONS[G.fusion.kind].forms[G.fusion.form]; }

  // ------------------------------------------------------------ helpers
  function onScreen(e, pad = 0) { return Math.abs(e.x - G.cx) < VW / 2 + pad && Math.abs(e.y - G.cy) < VH / 2 + pad; }
  function nearest(x, y, range) {
    let best = null, bd = range * range;
    for (const e of G.enemies) { if (e.dead) continue; const d = d2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function nearestBody(x, y) {
    let best = null, bd = Infinity;
    for (const p of bodies()) { const d = d2(x, y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function visibleEnemies(p) {   // enemies on the firing fighter's own screen
    const c = p || { x: G.cx, y: G.cy };
    return G.enemies.filter(e => !e.dead && Math.abs(e.x - c.x) < VW / 2 - 4 && Math.abs(e.y - c.y) < VH / 2 - 4);
  }
  const OWNED = () => [G.shots, G.beams, G.bombs, G.hz, G.fx, G.texts];
  function marks() { return OWNED().map(a => a.length); }
  function tagSince(m, own) { OWNED().forEach((a, k) => { for (let i = m[k]; i < a.length; i++) if (a[i].own === undefined) a[i].own = own; }); }
  const online = () => !!(NET.role && NET.started);
  function viewIdx() {
    const me = G.players[NET.role === 'client' ? NET.me : 0];
    if (!me) return -1;
    return me.absorbed && G.fusion ? G.fusion.ctrl.idx : me.idx;
  }
  const seen = o => !online() || o.own === undefined || o.own === viewIdx();
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // spatial grid for enemy queries
  const CELL = 24; let grid = new Map();
  const gkey = (cx, cy) => (cx + 2048) * 4096 + (cy + 2048);
  function buildGrid() {
    grid = new Map();
    for (const e of G.enemies) {
      if (e.dead) continue;
      const k = gkey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(e);
    }
  }
  function query(x, y, r, fn) {
    const x0 = Math.floor((x - r - 12) / CELL), x1 = Math.floor((x + r + 12) / CELL);
    const y0 = Math.floor((y - r - 12) / CELL), y1 = Math.floor((y + r + 12) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const b = grid.get(gkey(cx, cy)); if (!b) continue;
      for (const e of b) if (!e.dead) { const rr = r + e.r; if (d2(x, y, e.x, e.y) < rr * rr) { if (fn(e) === false) return; } }
    }
  }

  function text(x, y, s, col = '#fff', big = false) {
    if (G.texts.length > 110 && !big) return;
    G.texts.push({ x: x + rand(-3, 3), y, s, col, life: big ? 1.4 : 0.7, max: big ? 1.4 : 0.7, big });
  }
  function burst(x, y, col, n = 6, spd = 50, life = 0.4) {
    if (n >= 10) netEvent(['p', Math.round(x), Math.round(y), col, n, spd, life]);
    for (let i = 0; i < n && G.parts.length < 700; i++) {
      const a = rand(0, TAU), v = rand(spd * 0.3, spd);
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(life * 0.5, life), max: life, col, sz: Math.random() < 0.3 ? 2 : 1, g: 0 });
    }
  }
  function pushEnemiesFrom(x, y, R, force, dmg = 0, col = '#fff') {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y) || 1;
      if (d > R) continue;
      if (dmg) hurt(e, dmg, (e.x - x) / d * force, (e.y - y) / d * force, col);
      else { e.kvx += (e.x - x) / d * force; e.kvy += (e.y - y) / d * force; }
    }
  }

  // ------------------------------------------------------------ damage
  function hurt(e, dmg, kx = 0, ky = 0, col = '#fff') {
    if (e.dead) return;
    dmg *= rand(0.9, 1.1);
    e.hp -= dmg; e.flash = 0.1; G.dmgDealt += dmg;
    const kb = e.boss ? 0.08 : 1;
    e.kvx += kx * kb; e.kvy += ky * kb;
    text(e.x, e.y - 8 * (e.scale || 1), short(dmg), dmg > 200 ? '#ffd83a' : col);
    sfx('hit');
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    if (e.dead) return;
    e.dead = true; G.kills++;
    creditKill(e);
    burst(e.x, e.y, '#fff', 5, 60);
    burst(e.x, e.y, e.boss ? e.color : '#ffd86a', e.boss ? 40 : 3, e.boss ? 140 : 40, e.boss ? 1 : 0.4);
    dropOrb(e.x, e.y, e.xp);
    if (!e.boss) {
      const r = Math.random();
      if (Math.random() < 0.0008) G.pickups.push({ x: e.x, y: e.y, kind: 'ticket', t: 0 });
      if (r < 0.004) G.pickups.push({ x: e.x, y: e.y, kind: 'senzu', t: 0 });
      else if (r < 0.013) dropCapsule(e.x, e.y);
    } else if (e.rift) riftBossDefeated(e);
    else bossDefeated(e);
  }
  function explode(x, y, radius, dmg, col, core = '#fff') {
    query(x, y, radius, e => {
      const d = Math.hypot(e.x - x, e.y - y) || 1;
      hurt(e, dmg, (e.x - x) / d * 120, (e.y - y) / d * 120, col);
    });
    G.fx.push({ type: 'boom', x, y, r: radius, life: 0.4, max: 0.4, col, core });
    burst(x, y, col, 14, radius * 2.2, 0.5);
    G.shake = Math.max(G.shake, Math.min(6, radius / 14));
    sfx('boom');
  }

  function damagePlayer(p, dmg) {
    if (!p || p.down || p.absorbed || p.iframe > 0 || state !== 'play' || isBot(p)) return;
    if (Math.random() < dodgeOf(p)) { text(p.x, p.y - 12, 'DODGE', '#9adcff'); p.iframe = 0.3; burst(p.x, p.y, '#cfe8ff', 6, 40); return; }
    dmg = Math.max(1, dmg - p.ps.armor);
    p.hp -= dmg; p.iframe = 0.5; p.hurtT = 0.2; G.shake = Math.max(G.shake, 3);
    text(p.x, p.y - 12, short(dmg), '#ff5050');
    sfx('hurt');
    if (hasItem(p, 'senzu') && p.itemCD <= 0 && p.hp > 0 && p.hp < p.ps.maxHp * 0.25) {
      p.hp = Math.min(p.ps.maxHp, p.hp + p.ps.maxHp * 0.6); p.itemCD = 90;
      text(p.x, p.y - 16, 'SENZU!', '#8ae87a', true); burst(p.x, p.y, '#8ae87a', 16, 50);
    }
    if (p.hp > 0) return;
    if (p.fusion) { endFusion(true); return; }
    if (p.revive) {
      p.revive = false; p.hp = p.ps.maxHp * 0.5; p.iframe = 2.5;
      showBanner('ZENKAI!', pName(p) + ' is back from the brink', '#ffd83a');
      G.flash = 0.8; G.flashCol = '#ffd83a';
      pushEnemiesFrom(p.x, p.y, Math.max(VW, VH), 300);
      return;
    }
    p.hp = 0; p.down = true; p.reviveT = 0;
    if (!bodies().length) { gameOver(false); return; }
    cancelFuseRequest();
    showBanner(pName(p).toUpperCase() + ' IS DOWN', 'Stand next to them for 3 seconds to revive', '#ff5050');
  }

  // ------------------------------------------------------------ techniques
  // `p` is the body that fires (its position and stats); the tech instance may belong to a fused partner.
  const FIRE = {
    beam(T, st, inst, p) {
      const len = st.len * p.ps.area, tg = nearest(p.x, p.y, len * 0.9);
      if (!tg) return false;
      G.beams.push({ src: p, ang: aimAng(p, tg), len, width: st.width * Math.sqrt(p.ps.area), life: st.dur, max: st.dur,
        dmg: st.dmg * might(p), tick: T.tick || 0.12, tt: 0, col: T.color, core: T.core, style: T.style, spiral: T.spiral, grow: 0 });
      sfx('beam'); return true;
    },
    shot(T, st, inst, p) {
      const tg = nearest(p.x, p.y, 230);
      if (!tg) return false;
      const base = aimAng(p, tg);
      if (st.burst) { inst.queue = st.count; inst.qt = 0; inst.qint = st.burst / st.count; return true; }
      for (let i = 0; i < st.count; i++) spawnShot(p, T, st, base + (i - (st.count - 1) / 2) * st.spread, p.x, p.y - 3);
      return true;
    },
    nova(T, st, inst, p) {
      const r = st.radius * p.ps.area, dmg = st.dmg * might(p);
      if (!nearest(p.x, p.y, r)) return false;
      query(p.x, p.y, r, e => {
        const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
        hurt(e, dmg, (e.x - p.x) / d * 160, (e.y - p.y) / d * 160, T.color);
        if (st.stun) e.stunT = Math.max(e.stunT || 0, e.boss ? st.stun * 0.3 : st.stun);
      });
      G.fx.push({ type: 'ring', x: p.x, y: p.y, r, life: 0.4, max: 0.4, col: T.color });
      if (T.flash) { G.flash = 0.6; G.flashCol = T.color; G.shake = 8; }
      sfx('boom'); return true;
    },
    strike(T, st, inst, p) {
      const vis = shuffle(visibleEnemies(p)); if (!vis.length) return false;
      const dmg = st.dmg * might(p);
      for (let i = 0; i < Math.min(st.count, vis.length); i++) {
        const e = vis[i];
        G.fx.push({ type: 'dash', x: p.x, y: p.y, x2: e.x, y2: e.y, life: 0.18, max: 0.18, col: T.color });
        G.fx.push({ type: 'impact', x: e.x, y: e.y, life: 0.25, max: 0.25, col: T.color });
        hurt(e, dmg, 0, 0, T.color);
      }
      sfx('hit'); return true;
    },
    bomb(T, st, inst, p) {
      const vis = visibleEnemies(p); if (!vis.length) return false;
      const r = st.radius * p.ps.area;
      let bestE = null, bestN = -1;
      for (const e of shuffle(vis).slice(0, 16)) { let n = 0; query(e.x, e.y, r, () => { n++; }); if (n > bestN) { bestN = n; bestE = e; } }
      G.bombs.push({ src: p, x: p.x, y: p.y - 14, tx: bestE.x, ty: bestE.y, target: bestE, charge: st.charge, chargeMax: st.charge, speed: st.speed,
        size: st.size * Math.sqrt(p.ps.area), radius: r, dmg: st.dmg * might(p), col: T.color, core: T.core, life: 4 });
      sfx(st.charge > 0.5 ? 'transform' : 'shot'); return true;
    },
    dragon(T, st, inst, p) {
      const tg = nearest(p.x, p.y, 260); if (!tg) return false;
      const a = aimAng(p, tg);
      G.shots.push({ x: p.x + Math.cos(a) * HAND, y: p.y + Math.sin(a) * HAND, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, r: st.size * Math.sqrt(p.ps.area), dmg: st.dmg * might(p),
        pierce: 999, life: st.life, col: T.color, core: T.core, style: 'dragon', hit: new Set(), trail: [] });
      G.shake = Math.max(G.shake, 3); sfx('beam'); return true;
    },
    hellzone(T, st, inst, p) {
      const tg = nearest(p.x, p.y, 200) || shuffle(visibleEnemies(p))[0]; if (!tg) return false;
      const n = st.count, dmg = st.dmg * might(p);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + rand(-0.2, 0.2), R = rand(42, 62);
        G.hz.push({ x: tg.x + Math.cos(a) * R, y: tg.y + Math.sin(a) * R, cx: tg.x, cy: tg.y, wait: 0.55 + i * 0.03, dmg, r: st.radius * p.ps.area, col: T.color, core: T.core, ghost: T === TECHS.ghost_kamikaze });
      }
      sfx('shot'); return true;
    },
    erase(T, st, inst, p) {
      const vis = shuffle(visibleEnemies(p)); if (!vis.length) return false;
      let n = st.count;
      for (const e of vis) {
        if (n <= 0) break;
        G.fx.push({ type: 'erase', x: e.x, y: e.y, life: 0.5, max: 0.5, col: T.color });
        if (e.boss) hurt(e, st.dmg * might(p) * 3, 0, 0, T.color);
        else { burst(e.x, e.y, T.color, 10, 50, 0.6); text(e.x, e.y - 8, 'HAKAI', T.color); kill(e); }
        n--;
      }
      return true;
    },
  };
  const HAND = 10;   // how far in front of the fighter attacks start
  function spawnShot(p, T, st, ang, x, y) {
    x += Math.cos(ang) * HAND; y += Math.sin(ang) * HAND;
    G.shots.push({ x, y, vx: Math.cos(ang) * st.speed, vy: Math.sin(ang) * st.speed, r: st.size * Math.sqrt(p.ps.area), dmg: st.dmg * might(p),
      pierce: st.pierce || 1, life: 1.4, col: T.color, core: T.core, style: T.style, hit: new Set() });
    sfx('shot');
  }

  // Runs `owner`'s techniques, fired from body `p`.
  function updateTechs(p, owner, dt) {
    const live = slotOf(owner);
    for (const id in owner.techs) {
      const T = TECHS[id], inst = owner.techs[id], st = T.stats(inst.lv);
      if (!live.includes(id)) { if (inst.t > 0) inst.t -= dt; continue; }   // benched: keeps recharging
      if (T.type === 'aura') {
        inst.t -= dt;
        if (inst.t <= 0) {
          inst.t = 0.25;
          const r = st.radius * p.ps.area, dmg = st.dmg * might(p);
          query(p.x, p.y, r, e => hurt(e, dmg, 0, 0, T.color));
        }
        continue;
      }
      if (T.type === 'clones') {
        inst.ang += dt * 1.6;
        while (inst.ct.length < st.count) inst.ct.push(rand(0, st.cd));
        for (let i = 0; i < st.count; i++) {
          inst.ct[i] -= dt;
          if (inst.ct[i] > 0) continue;
          const [cx, cy] = clonePos(p, inst, i, st.count), tg = nearest(cx, cy, 200);
          if (!tg) { inst.ct[i] = 0.3; continue; }
          inst.ct[i] = st.cd * cdMul(p);
          spawnShot(p, TECHS.eye_laser, { dmg: st.dmg, speed: 280, size: 2, pierce: 2 }, Math.atan2(tg.y - cy, tg.x - cx), cx, cy - 3);
        }
        continue;
      }
      if (inst.queue > 0) {
        inst.qt -= dt;
        while (inst.qt <= 0 && inst.queue > 0) {
          const tg = nearest(p.x, p.y, 240);
          const base = aimAng(p, tg);
          spawnShot(p, T, st, base + rand(-st.spread / 2, st.spread / 2), p.x, p.y - 3);
          inst.queue--; inst.qt += inst.qint;
        }
      }
      inst.t -= dt;
      if (inst.t > 0) continue;
      inst.t = FIRE[T.type](T, st, inst, p) ? st.cd * cdMul(p) : 0.25;
    }
  }
  function clonePos(p, inst, i, n) { const a = inst.ang + i / n * TAU; return [p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 18]; }
  function hasTech(p, id) { return techActive(p, id); }
  function techOf(p, id) { return p.techs[id] || p.fusion.other.techs[id]; }

  // ------------------------------------------------------------ aiming inside a fusion
  // The shooter (Goku in Gogeta, Vegeta in Vegito) steers the aim with their movement input; with no input, attacks auto-target.
  function aimOn(p) { const a = p.fusion && p.fusion.aim; return !!a && Math.hypot(a[0], a[1]) > 0.3; }
  function aimAng(p, tg) {
    if (aimOn(p)) return Math.atan2(p.fusion.aim[1], p.fusion.aim[0]);
    return tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : rand(0, TAU);
  }

  // ------------------------------------------------------------ energy & ultimate moves
  // Energy fills from defeated enemies (the fighter whose attack landed the kill gets it).
  // At 100, Q / right-click / gamepad X fires the fighter's signature ultimate.
  const ENERGY_MAX = 100;
  function creditKill(e) {
    let p = (G.killer !== undefined && G.players[G.killer]) || nearestBody(e.x, e.y);
    if (!p) return;
    if (p.absorbed && G.fusion) p = G.fusion.ctrl;
    if (p.ultLock > 0) return;   // an ultimate's own kills don't refill it
    const before = p.energy || 0;
    p.energy = Math.min(ENERGY_MAX, before + (e.boss ? 40 : 1));
    if (before < ENERGY_MAX && p.energy >= ENERGY_MAX) {
      const m = marks();
      text(p.x, p.y - 22, 'ULTIMATE READY', '#ffe24a', true); sfx('pick');
      tagSince(m, p.idx);
    }
  }
  const ultKeyName = p => !online() && coop() ? ['Q', 'Num .', 'N', 'pad X'][p.idx] || 'pad X' : 'Q';
  function ultOf(body) { return ULTS[body.fusion ? G.fusion.kind : body.charId] || ULTS.goku; }
  function ultPressed() {   // right-click or Q at this computer
    if (!G || state !== 'play') return;
    if (isClient()) sendHost({ t: 'ult' }); else castUltimate(G.players[0]);
  }
  function castUltimate(p) {
    if (!G || state !== 'play' || !p || p.down) return;
    if (p.absorbed) { toast('In a fusion, ' + pName(G.fusion.ctrl) + ' fires the ultimate'); return; }
    const body = p;
    if ((body.energy || 0) < ENERGY_MAX) { toast(pName(body) + ': ultimate at ' + Math.floor(body.energy || 0) + '% energy'); return; }
    body.energy = 0;
    const U = ultOf(body);
    body.ultLock = (U.dur || 0) + 3;
    const m = might(body) * (1 + 0.08 * G.level);
    ultCutin(body, U);
    G.flash = 0.7; G.flashCol = U.color; G.shake = 10; sfx('transform'); sfx('beam');
    const mk = marks();
    const tg = nearest(body.x, body.y, 600);
    const ang = aimOn(body) || tg ? aimAng(body, tg) : (body.face < 0 ? Math.PI : 0);
    if (U.kind === 'beam') {
      G.beams.push({ src: body, ang, len: U.len, width: U.width, life: U.dur, max: U.dur, dmg: U.dmg * m, tick: U.tick || 0.1, tt: 0,
        col: U.color, core: U.core, style: U.style, spiral: U.spiral, grow: 0 });
    } else if (U.kind === 'bomb') {
      const vis = visibleEnemies(body);
      let tgt = null, bestN = -1;
      for (const e of shuffle(vis).slice(0, 20)) { let n = 0; query(e.x, e.y, U.radius * 0.6, () => { n++; }); if (n > bestN) { bestN = n; tgt = e; } }
      const tx = tgt ? tgt.x : body.x + Math.cos(ang) * 140, ty = tgt ? tgt.y : body.y + Math.sin(ang) * 140;
      G.bombs.push({ src: body, x: body.x, y: body.y - 24, tx, ty, target: tgt, charge: U.charge, chargeMax: U.charge, speed: U.speed,
        size: U.size, radius: U.radius, dmg: U.dmg * m, col: U.color, core: U.core, life: 6 });
    } else if (U.kind === 'discs') {
      for (let i = 0; i < U.count; i++) {
        const a = ang + i / U.count * TAU;
        G.shots.push({ x: body.x + Math.cos(a) * HAND, y: body.y - 3 + Math.sin(a) * HAND, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9,
          dmg: U.dmg * m, pierce: 999, life: 2.6, col: U.color, core: U.core, style: 'disc', hit: new Set() });
      }
    } else {
      G.ults.push({ U, body, m, t: 0, next: 0, done: 0, ang });
    }
    tagSince(mk, body.idx);
  }
  // multi-step ultimates: repeated strikes, pulses, a barrage, a ghost swarm
  function updateUlts(dt) {
    for (const u of G.ults) {
      const { U, body, m } = u;
      if (body.down || body.absorbed) { u.over = true; continue; }
      u.t += dt; u.next -= dt;
      const mk = marks(); G.killer = body.idx;
      if (U.kind === 'strikes' && u.next <= 0) {
        u.next = U.every;
        for (const e of visibleEnemies(body)) {
          G.fx.push({ type: 'dash', x: body.x, y: body.y, x2: e.x, y2: e.y, life: 0.15, max: 0.15, col: U.color });
          G.fx.push({ type: 'impact', x: e.x, y: e.y, life: 0.25, max: 0.25, col: U.color });
          hurt(e, U.dmg * m, 0, 0, U.color);
        }
        sfx('hit');
        if (++u.done >= U.hits) u.over = true;
      } else if (U.kind === 'pulses' && u.next <= 0) {
        u.next = U.every;
        query(body.x, body.y, U.radius, e => {
          const d = Math.hypot(e.x - body.x, e.y - body.y) || 1;
          hurt(e, U.dmg * m, (e.x - body.x) / d * 220, (e.y - body.y) / d * 220, U.color);
          if (U.stun) e.stunT = Math.max(e.stunT || 0, e.boss ? U.stun * 0.3 : U.stun);
        });
        G.fx.push({ type: 'ring', x: body.x, y: body.y, r: U.radius, life: 0.45, max: 0.45, col: U.color });
        if (U.flash) { G.flash = 0.8; G.flashCol = U.color; }
        G.shake = Math.max(G.shake, 6); sfx('boom');
        if (++u.done >= U.n) u.over = true;
      } else if (U.kind === 'barrage') {
        const per = U.dur / U.count;
        while (u.next <= 0 && u.done < U.count) {
          u.next += per; u.done++;
          const tg = shuffle(visibleEnemies(body))[0];
          const a = tg ? Math.atan2(tg.y - body.y, tg.x - body.x) + rand(-0.15, 0.15) : rand(0, TAU);
          G.shots.push({ x: body.x + Math.cos(a) * HAND, y: body.y - 3 + Math.sin(a) * HAND, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 4,
            dmg: U.dmg * m, pierce: 2, life: 1.4, col: U.color, core: U.core, hit: new Set() });
        }
        if (u.done >= U.count) u.over = true;
        sfx('shot');
      } else if (U.kind === 'ghosts' && !u.done) {
        u.done = 1;
        const vis = shuffle(visibleEnemies(body));
        for (let i = 0; i < U.count; i++) {
          const e = vis[i % Math.max(1, vis.length)], a = rand(0, TAU);
          const cx = e ? e.x : body.x + Math.cos(a) * 80, cy = e ? e.y : body.y + Math.sin(a) * 80;
          G.hz.push({ x: body.x + rand(-12, 12), y: body.y - 10 + rand(-8, 8), cx, cy, wait: 0.2 + i * 0.06, dmg: U.dmg * m, r: 30, col: U.color, core: U.core, ghost: true });
        }
        u.over = true;
      }
      tagSince(mk, body.idx); G.killer = undefined;
    }
    G.ults = G.ults.filter(u => !u.over);
  }

  // ------------------------------------------------------------ loot capsules
  // Capsule Corp capsules sit around the map, and more drop in as supplies (bosses leave one too).
  // Stand next to one for 3 seconds to open it: random capsules, maybe a ticket or senzu, and a good chance at a Dragon Ball.
  const LOOT_OPEN = 3, LOOT_R = 22;
  function spawnSupplyDrop() {
    const c = randomBody();
    for (let i = 0; i < 20; i++) {
      const a = rand(0, TAU), R = rand(120, 220), x = c.x + Math.cos(a) * R, y = c.y + Math.sin(a) * R;
      if (solidsNear(x, y).some(s => Math.hypot(s.x - x, s.y - y) < s.cr + 14)) continue;
      G.pickups.push({ x, y, kind: 'loot', t: 0, prog: 0 });
      toast('A Capsule Corp capsule landed nearby');
      return;
    }
  }
  function openLoot(k) {
    k.got = true;
    burst(k.x, k.y, '#f2c43a', 22, 70); burst(k.x, k.y, '#ffffff', 10, 50);
    G.fx.push({ type: 'ring', x: k.x, y: k.y, r: 40, life: 0.4, max: 0.4, col: '#f2c43a' });
    sfx('boom'); sfx('pick');
    const drops = [];
    const n = 1 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) { const t = Math.random() < 0.15 ? 'item' : pickCap(); dropCapsule(k.x + rand(-16, 16), k.y + rand(-10, 10), t); drops.push(CAPSULES[t].name); }
    if (Math.random() < 0.12) { G.pickups.push({ x: k.x + rand(-12, 12), y: k.y + 8, kind: 'senzu', t: 0 }); drops.push('Senzu Bean'); }
    if (Math.random() < 0.1) { dropTickets(k.x, k.y, 1); drops.push('Summon ticket'); }
    const dbOut = G.dragonBalls + G.pickups.filter(q => q.kind === 'dragonball' && !q.got).length;
    if (dbOut < 7 && Math.random() < (k.boss ? 0.85 : 0.4)) { G.pickups.push({ x: k.x, y: k.y - 12, kind: 'dragonball', t: 0 }); drops.push('a Dragon Ball!'); }
    text(k.x, k.y - 16, 'CAPSULE OPENED', '#f2c43a', true);
    toast('Capsule: ' + drops.join(', '));
  }
  function drawLoot(k) {   // big capsule with a soft beacon; shakes and fills a ring while someone stands next to it
    ctx.globalAlpha = 0.16 + 0.08 * Math.sin(k.t * 3); circ(k.x, k.y, 15, '#f2c43a'); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(k.x - 10), Math.round(k.y + 7), 20, 2);
    const shake = k.prog > 0 ? Math.sin(k.t * 40) * Math.min(1.5, k.prog * 0.6) : 0;
    sprite('loot_capsule', k.x + shake, k.y);
    if (k.prog > 0) {
      const f = Math.min(1, k.prog / LOOT_OPEN);
      ctx.strokeStyle = 'rgba(10,12,28,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(k.x, k.y, 17, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd83a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(k.x, k.y, 17, -Math.PI / 2, -Math.PI / 2 + f * TAU); ctx.stroke();
    } else {
      ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(255,240,200,' + (0.55 + 0.3 * Math.sin(k.t * 4)).toFixed(2) + ')'; ctx.fillText('CAPSULE', k.x, k.y - 12);
    }
  }

  // ------------------------------------------------------------ cinematics: boss intros, ultimate cut-ins, the SSJ clip
  // Boss intro: the game holds for a moment on a title card (art/full/<art>.webp, or the boss's sprite blown up).
  const INTRO_TIME = 2.8;
  function bossIntro(def, name, sub) {
    const info = { name, title: def.title || '', quote: def.quote || '', sub: sub || '', color: def.color, art: def.art || '', s: def.s };
    showIntro(info); netEvent(['bi', info]);
    G.introT = INTRO_TIME; state = 'intro';
    sfx('boss');
  }
  function showIntro(I) {
    const el = $('intro');
    el.style.setProperty('--c', I.color);
    $('in-art').innerHTML = I.art ? `<img src="art/full/${I.art}.webp" alt="">` : portrait(I.s, 'in-spr');
    $('in-name').textContent = I.name;
    $('in-title').textContent = I.title + (I.sub ? ' · ' + I.sub : '');
    $('in-quote').textContent = I.quote ? '“' + I.quote + '”' : '';
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }
  function hideIntro() { $('intro').hidden = true; }
  function endIntro() { hideIntro(); if (state === 'intro') state = 'play'; G.introT = 0; }

  // Ultimate cut-in: a band slides in from the fighter's side of the screen with their portrait and battle cry.
  function cutKey(body) { if (body.fusion) return ''; const f = curForm(body); return f.cut || body.C.cut || ''; }
  let cutinTimer = 0;
  function showCutin(I) {
    const el = $('cutin'), band = el.firstElementChild;
    const sx = G ? (I.x - G.cx) * Z + W / 2 : W / 2, sy = G ? (I.y - G.cy) * Z + H / 2 : H / 2;
    const bh = Math.min(200, H * 0.3);
    el.style.setProperty('--c', I.color);
    el.style.setProperty('--top', clamp(sy - bh / 2, 70, H - bh - 90) + 'px');
    el.style.setProperty('--bh', bh + 'px');
    el.className = sx < W / 2 ? 'from-left' : 'from-right';
    $('ci-art').innerHTML = I.key ? `<div class="ci-anim" style="background-image:url('art/cutin/${I.key}.webp')"></div>` : portrait(I.sprite, 'ci-spr');
    $('ci-quote').textContent = I.quote;
    $('ci-name').textContent = I.who + ' · ' + I.name;
    el.hidden = false; band.classList.remove('go'); void band.offsetWidth; band.classList.add('go');
    clearTimeout(cutinTimer); cutinTimer = setTimeout(() => { el.hidden = true; }, 1700);
  }
  function ultCutin(body, U) {
    const I = { key: cutKey(body), sprite: curForm(body).sprite, quote: U.quote || U.name + '!', name: U.name, color: U.color, x: body.x, y: body.y,
      who: body.fusion ? FUSIONS[G.fusion.kind].name : pName(body) };
    showCutin(I); netEvent(['ci', I]);
  }

  // Goku's first Super Saiyan: the anime clip plays over the transformation (click or any key skips it).
  const CLIP_TIME = 6.9, CLIP_FLIP = 4.9;
  let clipBlob = null, clipUrl = '';
  function preloadClip() {
    if (clipBlob || !G || !G.players.some(p => p.charId === 'goku')) return;
    clipBlob = 'loading';
    fetch('art/fx/goku_ssj.webp').then(r => r.blob()).then(b => { clipBlob = b; }, () => { clipBlob = null; });
  }
  function playClip() {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    clipUrl = clipBlob instanceof Blob ? URL.createObjectURL(clipBlob) : '';
    const img = document.createElement('img');   // a fresh element restarts the animation
    img.src = clipUrl || 'art/fx/goku_ssj.webp?' + Date.now(); img.alt = '';
    $('clip-box').replaceChildren(img);
    $('clip').hidden = false;
  }
  function hideClip() { $('clip').hidden = true; $('clip-box').replaceChildren(); }
  function skipCinematic() {   // host / offline only; returns true when it swallowed the input
    if (!G || isClient()) return false;
    if (state === 'intro') { G.introT = Math.min(G.introT, 0.2); return true; }
    if (state === 'transform' && G.tf && G.tf.clip && !G.tf.skipped) {
      G.tf.skipped = true; G.tf.t = Math.max(G.tf.t, G.tf.at - 0.05); G.tf.dur = G.tf.at + 0.8; hideClip(); netEvent(['clipx']);
      return true;
    }
    return false;
  }
  $('intro').addEventListener('click', skipCinematic);
  $('clip').addEventListener('click', skipCinematic);
  function preloadCinematics() {
    const keys = new Set();
    for (const p of G.players) { if (p.C.cut) keys.add('cutin/' + p.C.cut); for (const f of p.C.forms) if (f.cut) keys.add('cutin/' + f.cut); }
    for (const sg of SAGAS) if (sg.boss.art) keys.add('full/' + sg.boss.art);
    for (const b of RIFT_BOSSES) if (b.art) keys.add('full/' + b.art);
    for (const k of keys) { const im = new Image(); im.src = 'art/' + k + '.webp'; }
    preloadClip();
  }

  // ------------------------------------------------------------ fusion
  function blueUnlocked(p) { const i = p.C.forms.findIndex(f => f.short === 'Blue'); return i >= 0 && p.form >= i; }
  function fusePair() {
    if (!coop()) return null;
    const goku = G.players.find(p => p.charId === 'goku'), vegeta = G.players.find(p => p.charId === 'vegeta');
    return goku && vegeta ? { goku, vegeta } : null;
  }
  function fuseStatus() {   // why fusion can't start yet, or 'ready'
    const pair = fusePair();
    if (!pair) return null;
    if (G.fusion) return 'fused';
    if (G.fuseCD > 0) return 'cooldown';
    if (pair.goku.form < 3 || pair.vegeta.form < 3) return 'locked';
    if (pair.goku.down || pair.vegeta.down) return 'down';
    return 'ready';
  }
  const fuseKeyName = p => ['E', 'Enter', 'Y', 'pad A'][p.idx];
  function fusePartner(p) { const pr = fusePair(); return pr && (p === pr.goku ? pr.vegeta : pr.goku); }
  function fusePressed(p) {
    if (state !== 'play') return;
    if (G.fusion) {   // the leader powers the fusion up
      if (G.fusion.ctrl !== p) return;
      if (G.fusion.form >= G.fusion.maxForm) { toast(G.fusion.maxForm < 2 ? 'Both fighters need Super Saiyan Blue to go further' : 'Already at full power'); return; }
      G.fusion.form++; recalc(p);
      const ff = fusionForm();
      G.flash = 0.8; G.flashCol = ff.aura; G.shake = 8; sfx('transform');
      pushEnemiesFrom(p.x, p.y, Math.max(VW, VH) * 0.6, 260, 30 * might(p), ff.aura);
      showBanner(ff.name.toUpperCase(), 'Power ×' + ff.mult, ff.aura);
      return;
    }
    const st = fuseStatus();
    if (st !== 'ready') {
      if (st === 'locked') toast('Fusion unlocks once Goku reaches SSJ3 and Vegeta reaches Majin Vegeta');
      else if (st === 'cooldown') toast('Fusion recharging: ' + mmss(G.fuseCD));
      return;
    }
    const pr = fusePair();
    if (p !== pr.goku && p !== pr.vegeta) return;
    const req = G.fuseReq;
    if (req && req.by !== p.idx) { G.fuseReq = null; startFusion(); return; }
    if (!req) {
      G.fuseReq = { by: p.idx, t: FUSE_WINDOW };
      const other = fusePartner(p);
      showBanner('FUSION!', pName(p) + ' is ready. ' + pName(other) + ': press ' + fuseKeyName(other) + ' within 5 seconds', '#ffd83a');
      sfx('pick');
    }
  }
  function cancelFuseRequest() { if (G.fuseReq) { G.fuseReq = null; } }
  function startFusion() {
    const { goku, vegeta } = fusePair();
    state = 'fusing';
    G.fusing = { t: 0, goku, vegeta, mx: (goku.x + vegeta.x) / 2, my: (goku.y + vegeta.y) / 2, done: false };
    sfx('fuse');
  }
  function updateFusing(dt) {
    const f = G.fusing; f.t += dt;
    const k = Math.min(1, f.t / 1.1);
    for (const p of [f.goku, f.vegeta]) {
      p.x += (f.mx + (p === f.goku ? -10 : 10) * (1 - k) - p.x) * Math.min(1, dt * 6);
      p.y += (f.my - p.y) * Math.min(1, dt * 6);
      if (Math.random() < 0.8) burst(p.x, p.y, p === f.goku ? '#ff8a1f' : '#46c4ff', 1, 30, 0.4);
    }
    G.cx = f.mx; G.cy = f.my;
    if (!f.done && f.t > 1.2) {
      f.done = true;
      const kind = (G.test && G.test.force) || (Math.random() < 0.5 ? 'gogeta' : 'vegito');
      const ctrl = kind === 'gogeta' ? f.goku : f.vegeta, other = ctrl === f.goku ? f.vegeta : f.goku;
      const hp = ctrl.hp + other.hp;
      G.fusion = { kind, ctrl, other, t: FUSE_TIME, form: 0, maxForm: blueUnlocked(f.goku) && blueUnlocked(f.vegeta) ? 2 : 1 };
      ctrl.fusion = G.fusion; other.absorbed = true;
      ctrl.x = f.mx; ctrl.y = f.my; ctrl.kvx = ctrl.kvy = 0;
      recalc(ctrl); ctrl.hp = Math.min(ctrl.ps.maxHp, hp); ctrl.iframe = 1.5;
      G.flash = 1; G.flashCol = '#fff'; G.shake = 12;
      pushEnemiesFrom(f.mx, f.my, Math.max(VW, VH), 320, 40 * might(ctrl), '#ffd83a');
      const F = FUSIONS[kind];
      showBanner(F.name.toUpperCase() + '!', other.left || isBot(other) ? pName(ctrl) + ' leads. ' + fuseKeyName(ctrl) + ': power up' : pName(ctrl) + ' aims and fires, ' + pName(other) + ' steers. ' + fuseKeyName(ctrl) + ': power up' + (G.fusion.maxForm < 2 ? ' (up to Super Saiyan)' : ' (up to Blue)'), '#ffd83a');
    }
    if (f.t >= 2) { state = 'play'; G.fusing = null; }
  }
  function endFusion(forced) {
    const F = G.fusion; if (!F) return;
    const { ctrl, other } = F;
    const total = Math.max(0, ctrl.hp);
    ctrl.fusion = null; other.absorbed = false; G.fusion = null;
    recalc(ctrl); recalc(other);
    if (forced) { ctrl.hp = ctrl.ps.maxHp * 0.2; other.hp = other.ps.maxHp * 0.2; }
    else {
      const share = ctrl.ps.maxHp / (ctrl.ps.maxHp + other.ps.maxHp);
      ctrl.hp = Math.max(1, total * share); other.hp = Math.max(1, total * (1 - share));
    }
    // separate with a push between and around them
    const a = rand(0, TAU), c = Math.cos(a), s = Math.sin(a);
    other.x = ctrl.x + c * 6; other.y = ctrl.y + s * 6; ctrl.x -= c * 6; ctrl.y -= s * 6;
    other.kvx = c * 240; other.kvy = s * 240; ctrl.kvx = -c * 240; ctrl.kvy = -s * 240;
    ctrl.iframe = other.iframe = 1.5;
    pushEnemiesFrom((ctrl.x + other.x) / 2, (ctrl.y + other.y) / 2, 140, 380);
    G.fx.push({ type: 'ring', x: ctrl.x, y: ctrl.y, r: 120, life: 0.5, max: 0.5, col: '#fff' });
    G.flash = 0.6; G.flashCol = '#fff'; G.shake = 8;
    G.fuseCD = FUSE_COOLDOWN;
    showBanner(forced ? 'FUSION BROKEN' : 'FUSION ENDED', 'Fusion recharges in ' + mmss(FUSE_COOLDOWN), forced ? '#ff5050' : '#c8c4e0');
  }

  // ------------------------------------------------------------ terrain
  // The world is cut into chunks. Each chunk is generated from its coordinates and the saga's biome:
  // ground decals, one set piece (houses, mesas, block walls, ruins, craters) and scattered props.
  const CHUNK = 256;
  let chunks = new Map(), chunkBiome = '';
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const biomeSeed = b => [...b].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const PROPS = {
    tree: { s: b => 's_tree_' + b, cr: 5 }, bush: { s: b => 's_bush_' + b, cr: 0 },
    boulder0: { s: b => 's_boulder0_' + b, cr: 11 }, boulder1: { s: b => 's_boulder1_' + b, cr: 7 },
    crystal: { s: () => 's_crystal', cr: 9 }, ruin: { s: b => 's_ruin_' + b, cr: 6 }, column: { s: b => 's_column_' + b, cr: 6 },
  };
  const SETS = {
    plains: { piece: ['house', 'grove', 'grove', 'wall', 'crater'], props: ['tree', 'bush', 'bush', 'boulder1'], decals: ['grass', 'grass', 'flowers', 'flowers', 'crack'] },
    waste: { piece: ['mesa', 'mesa', 'crater', 'wall'], props: ['boulder0', 'boulder1', 'bush'], decals: ['crack', 'rubble', 'grass', 'crack'] },
    rocky: { piece: ['mesa', 'crater', 'crater', 'ruins'], props: ['boulder0', 'boulder1'], decals: ['crack', 'rubble', 'rubble'] },
    namek: { piece: ['house', 'grove', 'crater', 'mesa'], props: ['tree', 'bush', 'boulder1'], decals: ['grass', 'flowers', 'grass'] },
    cell: { piece: ['wall', 'ruins', 'crater', 'crater'], props: ['boulder1', 'ruin'], decals: ['crack', 'rubble', 'crack'] },
    buu: { piece: ['mesa', 'crater', 'wall', 'ruins'], props: ['boulder0', 'boulder1'], decals: ['crack', 'rubble'] },
    grass2: { piece: ['house', 'grove', 'grove', 'wall', 'ruins'], props: ['tree', 'bush', 'bush'], decals: ['grass', 'flowers', 'grass'] },
    top: { piece: ['ruins', 'ruins', 'wall'], props: ['ruin', 'column', 'boulder1'], decals: ['crack', 'rubble'] },
    ice: { piece: ['crystals', 'mesa', 'crater', 'ruins'], props: ['crystal', 'boulder1', 'boulder0'], decals: ['crack', 'rubble'] },
  };
  const PIECES = {
    mesa(c, b, x, y, R, add) { const n = 1 + (R() * 3 | 0); for (let i = 0; i < n; i++) add('s_mesa_' + b, x + (R() - 0.5) * 100, y + (R() - 0.5) * 60, 13); },
    house(c, b, x, y, R, add) {
      if (add(b === 'namek' ? 's_nhouse' : 's_house_' + b, x, y, b === 'namek' ? 15 : 20)) {
        add('s_bush_' + b, x - 36, y + 4, 0); add('s_bush_' + b, x + 36, y + 2, 0);
        c.decals.push({ s: 'd_flowers_' + b, x: x - 12, y: y + 14 }, { s: 'd_flowers_' + b, x: x + 14, y: y + 12 });
      }
    },
    grove(c, b, x, y, R, add) { const n = 3 + (R() * 4 | 0); for (let i = 0; i < n; i++) add('s_tree_' + b, x + (R() - 0.5) * 120, y + (R() - 0.5) * 80, 5); },
    wall(c, b, x, y, R, add) {
      const n = 4 + (R() * 6 | 0), vert = R() < 0.35;
      for (let i = 0; i < n; i++) {
        const bx = x + (vert ? 0 : i * 16), by = y + (vert ? i * 12 : 0);
        if (R() < 0.14) { c.decals.push({ s: 'd_rubble_' + b, x: bx, y: by }); continue; }
        add('s_block' + (R() < 0.3 ? 1 : 0) + '_' + b, bx, by, 8, true);
      }
    },
    ruins(c, b, x, y, R, add) {
      const n = 3 + (R() * 4 | 0), rad = 30 + R() * 20;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; add((R() < 0.5 ? 's_ruin_' : 's_column_') + b, x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.7, 6); }
      c.decals.push({ s: 'd_rubble_' + b, x, y });
    },
    crater(c, b, x, y, R, add) {
      c.decals.push({ s: 'd_crater_' + b, x, y });
      const n = 2 + (R() * 2 | 0);
      for (let i = 0; i < n; i++) { const a = R() * TAU; add('s_boulder' + (R() < 0.5 ? 0 : 1) + '_' + b, x + Math.cos(a) * 34, y + Math.sin(a) * 18, 9); }
    },
    crystals(c, b, x, y, R, add) { const n = 2 + (R() * 3 | 0); for (let i = 0; i < n; i++) add('s_crystal', x + (R() - 0.5) * 70, y + (R() - 0.5) * 50, 9); },
  };
  const CAP_WEIGHTS = [['heal', 3], ['speed', 2], ['dex', 2], ['power', 2], ['magnet', 1.2], ['item', 0.6]];
  function pickCap(R = Math.random) {
    let r = R() * CAP_WEIGHTS.reduce((a, w) => a + w[1], 0);
    for (const [k, w] of CAP_WEIGHTS) { r -= w; if (r <= 0) return k; }
    return 'heal';
  }
  function genChunk(cx, cy, b) {
    const R = rng(hash(cx, cy) ^ biomeSeed(b)), set = SETS[b] || SETS.plains;
    const ox = cx * CHUNK, oy = cy * CHUNK, c = { structs: [], decals: [], solids: [] };
    const pick = arr => arr[(R() * arr.length) | 0];
    const free = (x, y, r) => Math.hypot(x, y) > 90 + r && c.structs.every(s => Math.hypot(s.x - x, s.y - y) > (s.cr || 6) + r + 3);
    const add = (s, x, y, cr, packed) => {
      if (!(packed ? Math.hypot(x, y) > 90 + cr : free(x, y, cr))) return false;
      const st = { struct: true, s, x: Math.round(x), y: Math.round(y), cr };
      c.structs.push(st); if (cr) c.solids.push(st);
      return true;
    };
    for (let i = 0; i < 9; i++) c.decals.push({ s: 'd_' + pick(set.decals) + '_' + b, x: ox + R() * CHUNK, y: oy + R() * CHUNK });
    if (R() < 0.85) PIECES[pick(set.piece)](c, b, ox + 50 + R() * (CHUNK - 100), oy + 50 + R() * (CHUNK - 100), R, add);
    const np = 2 + (R() * 4 | 0);
    for (let i = 0; i < np; i++) { const k = PROPS[pick(set.props)]; add(k.s(b), ox + R() * CHUNK, oy + R() * CHUNK, k.cr); }
    if (R() < 0.16) {
      const x = ox + 20 + R() * (CHUNK - 40), y = oy + 20 + R() * (CHUNK - 40);
      if (free(x, y, 6)) c.cap = { x, y, cap: pickCap(R), id: b + ':' + cx + ',' + cy };
    }
    return c;
  }
  function getChunk(cx, cy, b) {
    if (b !== chunkBiome) { chunks = new Map(); chunkBiome = b; }
    const key = cx + ',' + cy;
    let c = chunks.get(key);
    if (!c) { c = genChunk(cx, cy, b); chunks.set(key, c); }
    if (G && !G.client && c.cap && !G.capsSpawned.has(c.cap.id)) {
      G.capsSpawned.add(c.cap.id);
      G.pickups.push({ x: c.cap.x, y: c.cap.y, kind: 'loot', t: 0, prog: 0 });
    }
    return c;
  }
  function solidsNear(x, y) {
    if (!G || G.arena) return [];
    const b = saga().biome, cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK), out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const c = chunks.get((cx + i) + ',' + (cy + j));
      if (c && chunkBiome === b) for (const s of c.solids) out.push(s);
    }
    return out;
  }
  function pushOutSolids(o, r) {
    for (const s of solidsNear(o.x, o.y)) {
      const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), min = s.cr + r;
      if (d < min && d > 0.01) { o.x = s.x + dx / d * min; o.y = s.y + dy / d * min; }
      else if (d <= 0.01) o.y = s.y + min;
    }
  }
  function drawGround(x0, y0, b) {
    const tile = ART['g_' + b];
    if (tile) {
      const S = tile.fw;
      for (let tx = Math.floor(x0 / S) * S; tx < x0 + VW + S; tx += S)
        for (let ty = Math.floor(y0 / S) * S; ty < y0 + VH + S; ty += S) ctx.drawImage(tile.img, tx, ty);
    }
    const out = [];
    const c0x = Math.floor((x0 - 60) / CHUNK), c1x = Math.floor((x0 + VW + 60) / CHUNK);
    const c0y = Math.floor((y0 - 60) / CHUNK), c1y = Math.floor((y0 + VH + 80) / CHUNK);
    for (let cx = c0x; cx <= c1x; cx++) for (let cy = c0y; cy <= c1y; cy++) {
      const c = getChunk(cx, cy, b);
      for (const d of c.decals) if (d.x > x0 - 40 && d.x < x0 + VW + 40 && d.y > y0 - 30 && d.y < y0 + VH + 30) sprite(d.s, d.x, d.y);
      for (const s of c.structs) if (s.x > x0 - 40 && s.x < x0 + VW + 40 && s.y > y0 - 10 && s.y < y0 + VH + 80) out.push(s);
    }
    return out;
  }
  function drawStruct(s) {
    const h = spriteHeight(s.s), a = ART[s.s], w = a ? a.fw : 16;
    if (s.cr >= 9) { ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 1, w * 0.42, 4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    sprite(s.s, s.x, s.y - h / 2);
  }

  // ------------------------------------------------------------ capsules & items
  function dropCapsule(x, y, type) { G.pickups.push({ x, y, kind: 'cap', cap: type || pickCap(), t: 0 }); }
  function openCapsule(k, p) {
    const type = k.cap, C = CAPSULES[type];
    if (type === 'heal') { p.hp = Math.min(p.ps.maxHp, p.hp + p.ps.maxHp * 0.35); text(p.x, p.y - 14, '+HP', '#ff8a8a', true); }
    else if (C.buff) { p.buffs[C.buff] = C.time; text(p.x, p.y - 14, C.name.split(' ')[0].toUpperCase() + '!', C.color, true); }
    else if (type === 'magnet') { for (const o of G.orbs) o.mag = true; toast('Magnet Capsule: every ki orb pulled in'); }
    else if (type === 'item') { giveItem(p); return; }
    burst(p.x, p.y, C.color, 12, 50);
    if (C.buff) toast(pName(p) + ': ' + C.name + ' · ' + C.info);
  }
  function giveItem(p) {
    const ids = Object.keys(ITEMS).filter(id => id !== p.item);
    const id = ids[(Math.random() * ids.length) | 0];
    const was = p.item;
    p.item = id; p.itemCD = 0; p.poleT = 1;
    recalc(p);
    const it = ITEMS[id];
    showBanner(it.name.toUpperCase(), (coop() ? pName(p) + ' · ' : '') + it.info + (was ? ' Replaces the ' + ITEMS[was].name + '.' : ''), '#f2c43a');
    burst(p.x, p.y, '#f2c43a', 20, 60); sfx('pick');
  }
  function updateItem(p, dt) {
    if (!hasItem(p, 'pole')) return;
    p.poleT -= dt;
    if (p.poleT > 0) return;
    const tg = nearest(p.x, p.y, 120);
    if (!tg) { p.poleT = 0.3; return; }
    p.poleT = 2.5;
    G.beams.push({ src: p, ang: Math.atan2(tg.y - p.y, tg.x - p.x), len: 120, width: 6, life: 0.3, max: 0.3, dmg: 24 * might(p), tick: 0.3, tt: 0,
      col: '#d83a2a', core: '#f2c43a', style: 'pole', grow: 0 });
    sfx('hit');
  }

  // ------------------------------------------------------------ rifts & the boss arena
  function updateRift(dt) {
    if (G.arena) { updateArena(dt); return; }
    if (G.rift) {
      const r = G.rift; r.t -= dt; r.ph += dt;
      if (Math.random() < 0.7) { const a = rand(0, TAU), R = rand(16, 30); G.parts.push({ x: r.x + Math.cos(a) * R, y: r.y - 10 + Math.sin(a) * R, vx: -Math.cos(a) * R * 2.5, vy: -Math.sin(a) * R * 2.5, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#b05aff' : '#f0d8ff', sz: 1, g: 0 }); }
      for (const p of bodies()) if (d2(p.x, p.y, r.x, r.y - 6) < 14 * 14) { enterArena(); return; }
      if (r.t <= 0) { G.rift = null; G.riftT = rand(90, 140); toast('The rift closed'); }
      return;
    }
    if (G.boss || G.interSaga > 0) return;
    G.riftT -= dt;
    if (G.riftT <= 0) spawnRift();
  }
  function spawnRift() {
    const def = RIFT_BOSSES[G.riftOrder[G.riftCount % RIFT_BOSSES.length]];
    for (let i = 0; i < 24; i++) {
      const c = online() ? randomBody() : { x: G.cx, y: G.cy };
      const a = rand(0, TAU), R = rand(150, 230), x = c.x + Math.cos(a) * R, y = c.y + Math.sin(a) * R;
      if (solidsNear(x, y).some(s => Math.hypot(s.x - x, s.y - y) < s.cr + 16)) continue;
      G.rift = { x, y, t: 45, ph: 0, def };
      showBanner('A RIFT HAS OPENED', def.name + ' waits on the other side. Step in within 45 seconds.', '#b05aff');
      sfx('boss');
      return;
    }
    G.riftT = 10;
  }
  function enterArena() {
    const def = G.rift.def;
    G.rift = null;
    const A = { cx: 40000 + G.riftCount * 3000, cy: 40000, R: 150, t: 75, def, phase: 'fight', exit: null, endT: 0,
      saved: { enemies: G.enemies, eshots: G.eshots, shots: G.shots, beams: G.beams, bombs: G.bombs, hz: G.hz, orbs: G.orbs, pickups: G.pickups, pos: G.players.map(p => [p.x, p.y]) } };
    G.riftCount++;
    G.enemies = []; G.eshots = []; G.shots = []; G.beams = []; G.bombs = []; G.hz = []; G.orbs = []; G.pickups = [];
    G.arena = A;
    G.players.forEach((p, i) => { p.x = A.cx + (i - (G.players.length - 1) / 2) * 20; p.y = A.cy + 80; p.kvx = p.kvy = 0; p.iframe = 1.5; });
    const sc = sagaScale(), i = G.sagaIdx, hd = def.s.startsWith('hd/');
    const hp = 350 * Math.pow(2, i) * def.hp * teamMul(0.6);
    const b = { x: A.cx, y: A.cy - 60, s: def.s, boss: true, rift: true, def, name: def.name, color: def.color, moves: def.moves, hp, maxHp: hp,
      spd: 40 + 2 * Math.min(i, 10), dmg: 14 * sc.dmg * 1.25, r: def.r || (hd ? 7 * def.scale : 6 * def.scale), scale: def.scale, xp: 0, kvx: 0, kvy: 0, flash: 0, atkT: 2, act: null, ph: 0, face: 1 };
    G.enemies.push(b); A.boss = b;
    updateCamera();
    G.flash = 1; G.flashCol = '#b05aff'; G.shake = 10; sfx('transform');
    bossIntro(def, def.name, 'Rift battle: win within 1:15');
  }
  function arenaClamp() {
    const A = G.arena;
    for (const o of [...bodies(), ...G.enemies]) {
      const dx = o.x - A.cx, dy = o.y - A.cy, d = Math.hypot(dx, dy) || 1, lim = A.R - (o.r || 6);
      if (d > lim) { o.x = A.cx + dx / d * lim; o.y = A.cy + dy / d * lim; }
    }
  }
  function updateArena(dt) {
    const A = G.arena, b = A.boss;
    if (A.phase === 'fight') {
      A.t -= dt;
      if (b.def.rage && !b.raged && b.hp < b.maxHp / 2) {
        b.raged = true; b.s = b.def.rage; b.dmg *= 1.2;
        showBanner((b.def.rageName || 'Enraged').toUpperCase(), b.name + ' powers up', b.color);
        G.flash = 0.7; G.flashCol = b.color; G.shake = 8;
      }
      if (A.t <= 0) {
        A.phase = 'lost'; A.endT = 2.5; b.dead = true;
        showBanner('THE RIFT COLLAPSES', 'Out of time. No reward this round.', '#b05aff');
      }
      return;
    }
    if (A.exit) for (const p of bodies()) if (d2(p.x, p.y, A.exit.x, A.exit.y - 6) < 16 * 16) { exitArena(); return; }
    A.endT -= dt;
    if (A.endT <= 0) exitArena();
  }
  function riftBossDefeated(b) {
    grantBond();
    dropTickets(b.x, b.y, 2);
    const A = G.arena;
    A.phase = 'won'; A.endT = 25; A.exit = { x: A.cx, y: A.cy + 20 };
    let xp = 0;
    for (let l = G.level; l < G.level + 3; l++) xp += xpFor(l);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; dropOrb(b.x + Math.cos(a) * 26, b.y + Math.sin(a) * 16, xp / 12); }
    G.pickups.push({ x: b.x, y: b.y + 12, kind: 'cap', cap: 'item', t: 0 });
    dropCapsule(b.x - 22, b.y + 8, 'heal'); dropCapsule(b.x + 22, b.y + 8, ['speed', 'dex', 'power'][(Math.random() * 3) | 0]);
    for (const p of bodies()) p.hp = p.ps.maxHp;
    G.flash = 0.8; G.flashCol = '#ffd83a'; G.shake = 10;
    showBanner('RIFT CLEARED', 'Three levels of XP, a treasure capsule and supplies. Step into the portal to go back.', '#ffd83a');
  }
  function exitArena() {
    const A = G.arena, S = A.saved;
    const leftXp = G.orbs.reduce((a, o) => a + o.v, 0), leftPk = G.pickups;
    G.enemies = S.enemies; G.eshots = S.eshots; G.shots = S.shots; G.beams = S.beams; G.bombs = S.bombs; G.hz = S.hz; G.orbs = S.orbs; G.pickups = S.pickups;
    G.players.forEach((p, i) => { p.x = S.pos[i][0]; p.y = S.pos[i][1]; p.iframe = 2; p.kvx = p.kvy = 0; });
    G.arena = null;
    const first = bodies()[0];
    if (first) for (const k of leftPk) collect(k, first);
    if (leftXp) gainXp(leftXp);
    G.riftT = rand(150, 210);
    G.flash = 0.8; G.flashCol = '#b05aff';
    updateCamera();
    toast('Back to ' + sagaName());
  }
  function drawArena(x0, y0) {
    const A = G.arena;
    ctx.fillStyle = '#07060f'; ctx.fillRect(x0 - 2, y0 - 2, VW + 4, VH + 4);
    for (let i = 0; i < 70; i++) {   // star field
      const h = hash(i, 911), sx = x0 + (h % 1000) / 1000 * VW, sy = y0 + ((h >>> 10) % 1000) / 1000 * VH;
      ctx.fillStyle = i % 3 ? '#5a4a8a' : '#c8b8ff'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(A.cx, A.cy, A.R, 0, TAU); ctx.clip();
    const tile = ART.g_top;
    if (tile) for (let tx = Math.floor((A.cx - A.R) / 64) * 64; tx < A.cx + A.R; tx += 64) for (let ty = Math.floor((A.cy - A.R) / 64) * 64; ty < A.cy + A.R; ty += 64) ctx.drawImage(tile.img, tx, ty);
    ctx.fillStyle = 'rgba(40,10,70,0.55)'; ctx.fillRect(A.cx - A.R, A.cy - A.R, A.R * 2, A.R * 2);
    ctx.strokeStyle = 'rgba(176,90,255,0.35)'; ctx.lineWidth = 1;
    for (const r of [40, 80, 120]) { ctx.beginPath(); ctx.arc(A.cx, A.cy, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(G.t * 3);
    ctx.strokeStyle = A.def.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(A.cx, A.cy, A.R, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; if (Math.sin(a) > 0.05) continue; sprite(i % 2 ? 's_ruin_top' : 's_column_top', A.cx + Math.cos(a) * (A.R + 8), A.cy + Math.sin(a) * (A.R + 8) - 24); }
  }
  function drawPortal(x, y, ph, col, dark, secs) {
    for (let i = 4; i >= 0; i--) {
      ctx.globalAlpha = 0.25 + (4 - i) * 0.15; ctx.fillStyle = i % 2 ? col : dark;
      ctx.beginPath(); ctx.ellipse(x, y - 12, 8 + i * 2 + Math.sin(ph * 4 + i) * 0.8, 14 + i * 2.5, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#f0e8ff'; ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x, y - 12, 6 + j * 3, 11 + j * 3, 0, ph * 3 + j * 2, ph * 3 + j * 2 + 1.6); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (secs) { ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace'; ctx.fillStyle = '#f0d8ff'; ctx.fillText('RIFT ' + secs, x, y - 30); }
  }

  // ------------------------------------------------------------ edge indicators
  // Icons on the screen edge pointing at bosses, partners, rifts, Dragon Balls and treasure capsules.
  function drawIndicators() {
    const marks = [];
    const boss = G.arena ? (G.arena.phase === 'fight' ? G.arena.boss : null) : G.boss;
    if (boss && !boss.dead) marks.push({ t: boss, col: boss.color, icon: 'icon_skull' });
    if (G.rift) marks.push({ t: { x: G.rift.x, y: G.rift.y - 12 }, col: '#b05aff', icon: 'rift' });
    if (G.arena && G.arena.exit) marks.push({ t: G.arena.exit, col: '#8af0ff', icon: 'rift' });
    if (coop()) for (const p of G.players) if (!p.absorbed) marks.push({ t: p, col: P_COLORS[p.idx], icon: 'P' + (p.idx + 1) + (p.down ? '!' : '') });
    const radar = bodies().some(p => hasItem(p, 'radar'));
    for (const k of G.pickups) {
      if (k.kind === 'dragonball') marks.push({ t: k, col: '#ff9a1a', icon: 'dragonball' });
      else if (k.kind === 'loot' && d2(k.x, k.y, G.cx, G.cy) < 420 * 420) marks.push({ t: k, col: '#f2c43a', icon: 'loot_capsule' });
      else if (k.kind === 'cap' && (k.cap === 'item' || radar)) marks.push({ t: k, col: CAPSULES[k.cap].color, icon: CAPSULES[k.cap].sprite });
    }
    const mx = VW / 2 - 12, my = VH / 2 - 12;
    for (const m of marks) {
      const dx = m.t.x - G.cx, dy = m.t.y - G.cy;
      if (Math.abs(dx) < mx + 4 && Math.abs(dy) < my + 4) continue;
      const k = Math.min(mx / Math.abs(dx || 1e-6), my / Math.abs(dy || 1e-6));
      const ex = G.cx + dx * k, ey = G.cy + dy * k, a = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(ex, ey);
      ctx.rotate(a); ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(7, -3.5); ctx.lineTo(7, 3.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(13,16,36,0.85)'; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = m.col; ctx.lineWidth = 1.2; ctx.stroke();
      if (m.icon === 'rift') { ctx.strokeStyle = '#f0d8ff'; ctx.beginPath(); ctx.arc(ex, ey, 3.5, G.t * 4, G.t * 4 + 4.5); ctx.stroke(); }
      else if (m.icon[0] === 'P') { ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace'; ctx.fillStyle = m.col; ctx.fillText(m.icon, ex + 0.3, ey + 2); }
      else { const ar = ART[m.icon]; const s = ar ? Math.min(1, 10 / Math.max(ar.fw, ar.fh)) : 1; sprite(m.icon, ex, ey, s); }
      ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace'; ctx.fillStyle = '#f3eee2';
      ctx.fillText(Math.round(Math.hypot(dx, dy) / 10) + 'm', ex, ey + 12);
    }
  }

  // ------------------------------------------------------------ enemies
  function sagaScale() { const i = G.sagaIdx; return { hp: Math.pow(2, i), dmg: Math.pow(1.33, i), spd: 1 + 0.035 * Math.min(i, 12), xp: 1 + 0.75 * i }; }
  function spawnGrunt(x, y) {
    const sg = saga(), tot = sg.grunts.reduce((a, g) => a + g[2], 0);
    let r = Math.random() * tot, pick = sg.grunts[0];
    for (const g of sg.grunts) { r -= g[2]; if (r <= 0) { pick = g; break; } }
    const [s, type] = pick, T = GRUNT_TYPES[type], sc = sagaScale();
    const ramp = (1 + G.sagaT / SAGA_TIME * 0.5) * teamMul(0.4);
    const hp = 9 * T.hp * sc.hp * ramp;
    G.enemies.push({ x, y, s, hp, maxHp: hp, spd: 30 * T.spd * sc.spd * rand(0.9, 1.1), dmg: 4.5 * T.dmg * sc.dmg, r: T.r, scale: T.scale || 1,
      xp: T.xp * sc.xp, shoots: T.shoots, explodes: T.explodes, st: rand(1, 3), kvx: 0, kvy: 0, flash: 0, ph: rand(0, TAU) });
  }
  function randomBody() { const bs = bodies(); return bs.length ? bs[(Math.random() * bs.length) | 0] : { x: G.cx, y: G.cy }; }
  function spawnRingPos() {   // just off-screen around one of the fighters
    const a = rand(0, TAU), R = Math.hypot(VW, VH) / 2 + 16, c = online() ? randomBody() : { x: G.cx, y: G.cy };
    return [c.x + Math.cos(a) * R, c.y + Math.sin(a) * R];
  }
  function spawning(dt) {
    if (G.peaceT > 0) { G.peaceT -= dt; return; }
    if (G.interSaga > 0 || G.arena) return;
    const target = Math.min(MAX_ENEMIES, ((G.sagaIdx ? 14 : 8) + G.sagaT * (0.45 + 0.05 * G.sagaIdx) + G.sagaIdx * 12) * teamMul(0.3)) * (G.boss ? 0.6 : 1);
    if (G.enemies.length < target) {
      G.spawnAcc += dt * (3 + G.sagaT * 0.08 + G.sagaIdx * 2) * teamMul(0.3);
      while (G.spawnAcc >= 1 && G.enemies.length < MAX_ENEMIES) { G.spawnAcc--; spawnGrunt(...spawnRingPos()); }
    }
    if (!G.encircled && G.sagaT > 50) {
      G.encircled = true;
      const n = 22 + G.sagaIdx * 3, R = Math.min(VW, VH) / 2 + 10;
      const c = online() ? randomBody() : { x: G.cx, y: G.cy };
      for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnGrunt(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R); }
      toast('Surrounded!');
    }
    if (!G.bossSpawned && G.sagaT >= SAGA_TIME) spawnBoss();
  }
  function spawnBoss() {
    G.bossSpawned = true;
    const B = saga().boss, sc = sagaScale(), i = G.sagaIdx;
    const [x, y] = spawnRingPos();
    const hp = 350 * Math.pow(2, i) * teamMul(0.6);
    const b = { x, y, s: B.s, boss: true, name: B.name + (loopN() ? ' +' + loopN() : ''), color: B.color, moves: B.moves, hp, maxHp: hp,
      spd: (34 + 2 * Math.min(i, 10)), dmg: 14 * sc.dmg, r: B.r || 6 * B.scale, scale: B.scale, xp: 40 * sc.xp, kvx: 0, kvy: 0, flash: 0, atkT: 2.5, act: null, ph: 0 };
    G.enemies.push(b); G.boss = b;
    bossIntro(B, b.name);
  }
  function bossDefeated(b) {
    grantBond();
    dropTickets(b.x, b.y, 1);
    G.boss = null;
    G.pickups.push({ x: b.x, y: b.y, kind: 'loot', t: 0, prog: 0, boss: true });
    for (let i = 0; i < 10; i++) dropOrb(b.x + rand(-20, 20), b.y + rand(-20, 20), b.xp / 10);
    G.flash = 0.7; G.flashCol = '#fff'; G.shake = 10;
    showBanner(b.name.toUpperCase() + ' DEFEATED', saga().name + ' complete', '#ffd83a');
    G.interSaga = 3;
    G.victoryPending = (G.sagaIdx === SAGAS.length - 1 && !G.endless);
  }
  function nextSaga() {
    G.sagaIdx++; G.sagaT = 0; G.bossSpawned = false; G.encircled = false;
    for (const p of G.players) if (p.down) revivePlayer(p, 0.5);
    sagaBanner();
  }
  function sagaBanner() { showBanner(sagaName(), saga().era + ' · Saga ' + (G.sagaIdx + 1), '#ff8a1f'); }
  function revivePlayer(p, frac) {
    p.down = false; p.hp = p.ps.maxHp * frac; p.iframe = 2; p.reviveT = 0;
    burst(p.x, p.y, '#8ae87a', 16, 60); text(p.x, p.y - 14, 'REVIVED', '#8ae87a', true);
  }

  function bossMove(b, dt, tgt) {
    const B = b.moves;
    const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (b.act) {
      const a = b.act; a.t += dt;
      if (a.type === 'aimed') {
        if (a.t >= a.next) {
          a.next += 0.15; a.n--;
          eshot(b.x, b.y, Math.atan2(dy, dx) + rand(-0.12, 0.12), 125, 3, b.dmg * 0.8, b.color);
          if (a.n <= 0) b.act = null;
        }
      } else if (a.type === 'dash') {
        if (a.t >= 0.6 && a.t < 1.05) { b.x += Math.cos(a.ang) * 290 * dt; b.y += Math.sin(a.ang) * 290 * dt; if (Math.random() < 0.6) burst(b.x, b.y, b.color, 1, 20, 0.3); }
        else if (a.t >= 1.05) b.act = null;
      } else if (a.type === 'beam') {
        if (a.t >= 0.85 && a.t < 1.5) {
          if (!a.fired) { a.fired = true; G.shake = 5; sfx('beam'); }
          const ca = Math.cos(a.ang), sa = Math.sin(a.ang);
          for (const p of bodies()) {
            const t = (p.x - b.x) * ca + (p.y - b.y) * sa, perp = Math.abs(-(p.x - b.x) * sa + (p.y - b.y) * ca);
            if (t > 0 && t < 420 && perp < 12) damagePlayer(p, b.dmg * 1.5);
          }
        } else if (a.t >= 1.5) b.act = null;
      }
      else if (a.type === 'teleport') {
        if (!a.moved && a.t >= 0.3) {
          a.moved = true;
          const ang = rand(0, TAU); b.x = tgt.x + Math.cos(ang) * 22; b.y = tgt.y + Math.sin(ang) * 22;
          burst(b.x, b.y, b.color, 12, 60);
        }
        if (a.t >= 0.75 && !a.hit) {
          a.hit = true;
          for (const p of bodies()) if (d2(p.x, p.y, b.x, b.y) < 30 * 30) damagePlayer(p, b.dmg * 1.6);
          G.fx.push({ type: 'ring', x: b.x, y: b.y, r: 30, life: 0.3, max: 0.3, col: b.color }); G.shake = Math.max(G.shake, 4);
        }
        if (a.t >= 0.95) b.act = null;
      }
      if (a.type !== 'dash' && a.type !== 'teleport') { b.x += dx / d * b.spd * 0.25 * dt; b.y += dy / d * b.spd * 0.25 * dt; }
      return;
    }
    b.x += dx / d * b.spd * dt; b.y += dy / d * b.spd * dt;
    b.atkT -= dt;
    if (b.atkT > 0 || d > 260) return;
    b.atkT = (b.hp < b.maxHp * 0.5 ? 1.9 : 2.7) * rand(0.85, 1.15) * (coop() ? Math.max(0.65, 0.95 - 0.1 * (G.players.length - 1)) : 1);
    const kinds = Object.keys(B), k = kinds[(Math.random() * kinds.length) | 0];
    text(b.x, b.y - 10 * b.scale - 4, B[k], b.color, true);
    const ang = Math.atan2(dy, dx);
    if (k === 'ring') {
      const n = 14 + Math.min(G.sagaIdx, 12) * 2, off = rand(0, TAU);
      for (let i = 0; i < n; i++) eshot(b.x, b.y, off + i / n * TAU, 70 + 5 * Math.min(G.sagaIdx, 10), 3, b.dmg * 0.8, b.color);
      G.fx.push({ type: 'ring', x: b.x, y: b.y, r: 30, life: 0.3, max: 0.3, col: b.color });
    } else if (k === 'aimed') b.act = { type: 'aimed', t: 0, next: 0.2, n: 5 + Math.min(G.sagaIdx, 6) };
    else if (k === 'dash') b.act = { type: 'dash', t: 0, ang };
    else if (k === 'beam') b.act = { type: 'beam', t: 0, ang };
    else if (k === 'teleport') b.act = { type: 'teleport', t: 0 };
    else if (k === 'summon') {
      const n = 5 + Math.min(G.sagaIdx, 6);
      for (let i = 0; i < n; i++) { const a2 = i / n * TAU; spawnGrunt(b.x + Math.cos(a2) * 32, b.y + Math.sin(a2) * 32); }
      G.fx.push({ type: 'ring', x: b.x, y: b.y, r: 40, life: 0.4, max: 0.4, col: b.color });
    }
    else if (k === 'deathball') G.eshots.push({ x: b.x, y: b.y - 10, vx: Math.cos(ang) * 50, vy: Math.sin(ang) * 50, r: 9, dmg: b.dmg * 2.2, life: 7, col: b.color, big: true, homing: 1.3 });
  }
  function eshot(x, y, ang, spd, r, dmg, col) {
    G.eshots.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, dmg, life: 5, col });
  }

  function updateEnemies(dt) {
    const far = Math.hypot(VW, VH) * 0.85, bs = bodies();
    if (!bs.length) return;
    const ringers = bs.filter(p => hasItem(p, 'ring'));
    for (const e of G.enemies) {
      if (e.dead) continue;
      e.flash -= dt; e.ph += dt;
      const tgt = nearestBody(e.x, e.y);
      if (!tgt) break;   // everyone went down mid-loop
      if (e.stunT > 0) {   // stunned: drifts with knockback only, no attacks
        e.stunT -= dt; e.x += e.kvx * dt; e.y += e.kvy * dt; e.kvx *= 0.85; e.kvy *= 0.85;
        continue;
      }
      if (e.boss) bossMove(e, dt, tgt);
      else {
        const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
        const slow = ringers.some(p => d2(p.x, p.y, e.x, e.y) < 60 * 60) ? 0.65 : 1;
        e.x += dx / d * e.spd * slow * dt; e.y += dy / d * e.spd * slow * dt;
        if (e.shoots) { e.st -= dt; if (e.st <= 0 && d < 170) { e.st = rand(2.8, 4.2); eshot(e.x, e.y, Math.atan2(dy, dx), 80, 2, e.dmg * 0.9, '#ff6a5a'); } }
        const cdx = tgt.x - e.x, cdy = tgt.y - e.y;   // stragglers wrap around to the nearest fighter
        if (Math.hypot(cdx, cdy) > far) { e.x = tgt.x + cdx * 0.9; e.y = tgt.y + cdy * 0.9; }
      }
      e.x += e.kvx * dt; e.y += e.kvy * dt;
      const decay = Math.max(0, 1 - dt * 7); e.kvx *= decay; e.kvy *= decay;
      e.face = tgt.x >= e.x ? 1 : -1;
      if (!e.boss) pushOutSolids(e, e.r * 0.8);
      for (const p of bs) {
        const sz = p.fusion ? 8 : 5;
        if (d2(p.x, p.y, e.x, e.y) >= (e.r + sz) * (e.r + sz)) continue;
        if (e.explodes) { e.hp = 0; G.kills--; kill(e); G.fx.push({ type: 'boom', x: e.x, y: e.y, r: 18, life: 0.35, max: 0.35, col: '#ffe24a', core: '#fff' }); sfx('boom'); }
        damagePlayer(p, e.dmg);
        break;
      }
    }
    // separation
    for (const b of grid.values()) {
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
        const a = b[i], c = b[j], dx = c.x - a.x, dy = c.y - a.y, rr = (a.r + c.r) * 0.8, dd = dx * dx + dy * dy;
        if (dd < rr * rr && dd > 0.01) {
          const d = Math.sqrt(dd), push = (rr - d) * 0.5 / d;
          const wa = a.boss ? 0.05 : 1, wc = c.boss ? 0.05 : 1;
          a.x -= dx * push * wa; a.y -= dy * push * wa; c.x += dx * push * wc; c.y += dy * push * wc;
        }
      }
    }
  }

  // ------------------------------------------------------------ projectiles & pickups
  function updateShots(dt) {
    for (const s of G.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.trail) { s.trail.unshift([s.x, s.y]); if (s.trail.length > 16) s.trail.pop(); }
      const ms = marks(); G.killer = s.own;
      query(s.x, s.y, s.r, e => {
        if (s.hit.has(e)) return;
        s.hit.add(e);
        const d = Math.hypot(s.vx, s.vy) || 1;
        hurt(e, s.dmg, s.vx / d * 70, s.vy / d * 70, s.col);
        if (G.fx.length < 140) G.fx.push({ type: 'spark', x: e.x + rand(-3, 3), y: e.y - 4 + rand(-3, 3), life: 0.2, max: 0.2, col: s.col });
        if (--s.pierce <= 0) { s.life = 0; return false; }
      });
      tagSince(ms, s.own);
      if (s.style !== 'laser' && s.style !== 'dragon' && s.life <= 0) burst(s.x, s.y, s.col, 3, 30, 0.25);
    }
    G.shots = G.shots.filter(s => s.life > 0);

    for (const b of G.beams) {
      const p = b.src;
      if (p.absorbed) { b.life = 0; continue; }
      b.life -= dt; b.grow = Math.min(1, b.grow + dt * 7); b.tt -= dt;
      if (b.tt <= 0) {
        b.tt = b.tick;
        const mb = marks(); G.killer = b.own;
        const ca = Math.cos(b.ang), sa = Math.sin(b.ang), L = b.len * b.grow, ox = p.x + ca * HAND, oy = p.y - 3 + sa * HAND;
        for (const e of G.enemies) {
          if (e.dead) continue;
          const t = (e.x - ox) * ca + (e.y - oy) * sa;
          if (t < 0 || t > L) continue;
          if (Math.abs(-(e.x - ox) * sa + (e.y - oy) * ca) < b.width / 2 + e.r) hurt(e, b.dmg, ca * 25, sa * 25, b.col);
        }
        tagSince(mb, b.own);
      }
    }
    G.beams = G.beams.filter(b => b.life > 0);

    for (const b of G.bombs) {
      if (b.charge > 0) {
        b.charge -= dt; b.x = b.src.x; b.y = b.src.y - 22 - b.size;
        if (Math.random() < 0.8) { const a = rand(0, TAU), R = rand(30, 60); G.parts.push({ x: b.x + Math.cos(a) * R, y: b.y + Math.sin(a) * R, vx: -Math.cos(a) * R * 2, vy: -Math.sin(a) * R * 2, life: 0.45, max: 0.45, col: b.col, sz: 1, g: 0 }); }
        if (b.target && !b.target.dead) { b.tx = b.target.x; b.ty = b.target.y; }
        continue;
      }
      b.life -= dt;
      if (b.target && !b.target.dead) { b.tx = b.target.x; b.ty = b.target.y; }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
      b.x += dx / d * b.speed * dt; b.y += dy / d * b.speed * dt;
      let hit = d < b.speed * dt + 2 || b.life <= 0;
      if (!hit) query(b.x, b.y, b.size, () => { hit = true; return false; });
      if (hit) { const me = marks(); G.killer = b.own; explode(b.x, b.y, b.radius, b.dmg, b.col, b.core); tagSince(me, b.own); b.done = true; }
    }
    G.bombs = G.bombs.filter(b => !b.done);

    for (const h of G.hz) {
      if (h.wait > 0) { h.wait -= dt; h.x += rand(-0.5, 0.5); h.y += rand(-0.5, 0.5); continue; }
      const dx = h.cx - h.x, dy = h.cy - h.y, d = Math.hypot(dx, dy);
      if (d < 5) { const mh = marks(); G.killer = h.own; explode(h.cx + rand(-4, 4), h.cy + rand(-4, 4), h.r, h.dmg, h.col, h.core); tagSince(mh, h.own); h.done = true; continue; }
      h.x += dx / d * Math.min(d, 320 * dt); h.y += dy / d * Math.min(d, 320 * dt);
    }
    G.hz = G.hz.filter(h => !h.done);

    G.killer = undefined;
    const bs = bodies();
    for (const s of G.eshots) {
      if (s.homing && bs.length) {
        const tg = nearestBody(s.x, s.y);
        const want = Math.atan2(tg.y - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const na = cur + clamp(da, -s.homing * dt, s.homing * dt), sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const p of bs) {
        const R = s.r + (p.fusion ? 7 : 4);
        if (d2(s.x, s.y, p.x, p.y) < R * R) {
          damagePlayer(p, s.dmg); s.life = 0;
          if (s.big) G.fx.push({ type: 'boom', x: s.x, y: s.y, r: 26, life: 0.4, max: 0.4, col: s.col, core: '#fff' });
          break;
        }
      }
    }
    G.eshots = G.eshots.filter(s => s.life > 0);
  }

  function dropOrb(x, y, v) { G.orbs.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), v, mag: null, sp: 0 }); }
  function orbSprite(v) { return v < 3 ? 'orb_blue' : v < 12 ? 'orb_green' : v < 50 ? 'orb_red' : 'orb_gold'; }
  function updatePickups(dt) {
    const bs = bodies(); if (!bs.length) return;
    for (const o of G.orbs) {
      if (o.mag && (o.mag.down || o.mag.absorbed)) o.mag = null;
      if (!o.mag) for (const p of bs) if (d2(o.x, o.y, p.x, p.y) < p.ps.magnet * p.ps.magnet) { o.mag = p; break; }
      if (o.mag === true) o.mag = nearestBody(o.x, o.y);
      if (o.mag) {
        const p = o.mag;
        o.sp = Math.min(400, o.sp + dt * 500);
        const d = Math.hypot(p.x - o.x, p.y - o.y) || 1; o.x += (p.x - o.x) / d * o.sp * dt; o.y += (p.y - o.y) / d * o.sp * dt;
        if (d < 7) { o.got = true; gainXp(o.v * p.ps.xp); sfx('xp'); }
      }
    }
    G.orbs = G.orbs.filter(o => !o.got);
    if (G.orbs.length > 380) {   // fold distant orbs into one so the list stays small
      let pool = 0; const keep = [];
      const bs = bodies();
      for (const o of G.orbs) { if (!o.mag && bs.every(b => d2(o.x, o.y, b.x, b.y) > 200 * 200)) pool += o.v; else keep.push(o); }
      G.orbs = keep; if (pool) { const [x, y] = spawnRingPos(); dropOrb(x, y, pool); }
    }
    for (const k of G.pickups) {
      k.t += dt;
      const p = nearestBody(k.x, k.y); if (!p) break;
      if (k.kind === 'loot') {   // stand next to a capsule to pop it open
        k.prog = d2(k.x, k.y, p.x, p.y) < LOOT_R * LOOT_R ? k.prog + dt : Math.max(0, k.prog - dt * 0.5);
        if (k.prog >= LOOT_OPEN) openLoot(k);
        continue;
      }
      const dd = d2(k.x, k.y, p.x, p.y), R = k.kind === 'dragonball' ? 40 : 16;
      if (dd < R * R) {
        const d = Math.sqrt(dd) || 1; k.x += (p.x - k.x) / d * 160 * dt; k.y += (p.y - k.y) / d * 160 * dt;
        if (d < 8) { k.got = true; collect(k, p); }
      }
    }
    G.pickups = G.pickups.filter(k => !k.got);
  }
  function collect(k, p) {
    sfx('pick');
    if (k.kind === 'senzu') {
      for (const q of bodies()) q.hp = Math.min(q.ps.maxHp, q.hp + q.ps.maxHp * 0.5);
      for (const q of G.players) if (q.down) revivePlayer(q, 0.5);
      text(p.x, p.y - 14, 'SENZU', '#8ae87a', true); burst(p.x, p.y, '#8ae87a', 14, 50);
    } else if (k.kind === 'cap') openCapsule(k, p);
    else if (k.kind === 'ticket') { addTickets(1); netEvent(['tk', 1]); burst(p.x, p.y, '#f2c43a', 10, 40); }
    else if (k.kind === 'dragonball') {
      G.dragonBalls++;
      if (G.dragonBalls >= 7) startWish();
      else showBanner(G.dragonBalls + '-STAR DRAGON BALL', G.dragonBalls + ' of 7 collected. Find them all to summon Shenron.', '#ff9a1a');
    }
  }
  function gainXp(v) {
    G.xp += v;
    while (G.xp >= G.xpNext) {
      G.xp -= G.xpNext; G.level++; G.xpNext = xpFor(G.level);
      for (const p of G.players) G.picks.push(p.idx);
      sfx('level');
      for (const p of G.players) for (const [id, lv] of p.C.techs) if (lv <= G.level && !p.announced.has(id)) { p.announced.add(id); toast(pName(p) + ' unlocked ' + TECHS[id].name); }
    }
  }

  // ------------------------------------------------------------ level up
  function levelOptions(p, n = 3) {
    const pool = [];
    for (const [id, lv] of p.C.techs) {
      const inst = p.techs[id];
      if (inst) { if (inst.lv < 6) pool.push({ kind: 'tech', id, w: 3 }); }
      else if (lv <= G.level) pool.push({ kind: 'tech', id, w: 5, fresh: true });
    }
    for (const id in PASSIVES) if ((p.passives[id] || 0) < PASSIVES[id].max) pool.push({ kind: 'passive', id, w: 1.6 });
    const out = [];
    const fresh = pool.filter(o => o.fresh);
    if (fresh.length) { const f = fresh[(Math.random() * fresh.length) | 0]; out.push(f); pool.splice(pool.indexOf(f), 1); }
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce((a, o) => a + o.w, 0);
      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (!out.length) out.push({ kind: 'senzu' });
    for (const o of out) describe(o, p);
    return shuffle(out);
  }
  const STAT_LABEL = { dmg: 'Damage', cd: 'Cooldown', count: 'Count', radius: 'Area', len: 'Range', width: 'Width', pierce: 'Pierce', dur: 'Duration', might: 'Power', life: 'Duration', size: 'Size' };
  function describe(o, p) {
    if (o.kind === 'senzu') { o.name = 'Senzu Bean'; o.tag = 'HEAL'; o.desc = 'Restore half of your HP.'; o.col = '#8ae87a'; return; }
    if (o.kind === 'passive') {
      const P = PASSIVES[o.id], lv = (p.passives[o.id] || 0) + 1;
      o.name = P.name; o.tag = lv === 1 ? 'NEW' : 'LV ' + lv; o.desc = P.info; o.col = '#c8c4e0'; o.lv = lv; return;
    }
    const T = TECHS[o.id], inst = p.techs[o.id];
    o.name = T.name; o.col = T.color;
    if (!inst) { o.tag = 'NEW'; o.desc = T.info; o.lv = 1; return; }
    const lv = inst.lv + 1, a = T.stats(inst.lv), b = T.stats(lv), parts = [];
    for (const k in b) {
      if (!STAT_LABEL[k] || a[k] === b[k]) continue;
      if (k === 'count' || k === 'pierce') parts.push(STAT_LABEL[k] + ' +' + (b[k] - a[k]));
      else { const pc = Math.round((b[k] / a[k] - 1) * 100); parts.push(STAT_LABEL[k] + ' ' + (pc > 0 ? '+' : '') + pc + '%'); }
    }
    o.tag = 'LV ' + lv; o.lv = lv;
    o.desc = (T.labels ? T.name + ' ' + T.labels[lv - 1] + '. ' : '') + parts.slice(0, 3).join(' · ');
  }
  function applyOption(o, p) {
    const body = p.absorbed ? G.fusion.ctrl : p;
    if (o.kind === 'senzu') body.hp = Math.min(body.ps.maxHp, body.hp + body.ps.maxHp * 0.5);
    else if (o.kind === 'passive') {
      p.passives[o.id] = (p.passives[o.id] || 0) + 1;
      if (o.id === 'zenkai') body.hp += 20;
    } else if (p.techs[o.id]) p.techs[o.id].lv++;
    else addTech(p, o.id);
    recalc(body);
  }
  let curOpts = [], cardFocus = 0, pickPlayer = null;
  function openLevelUp() {
    state = 'levelup';
    pickPlayer = G.players[G.picks[0]];
    curOpts = levelOptions(pickPlayer, 3);
    if (pickPlayer.remote && !pickPlayer.left) {
      const lvl = G.level - Math.ceil(G.picks.length / G.players.length) + 1;
      sendTo(pickPlayer.idx, { t: 'lvl', title: 'Level ' + lvl, opts: curOpts.map(o => ({ name: o.name, tag: o.tag, desc: o.desc, col: o.col })) });
      $('levelup').hidden = true;
      return;
    }
    if (isBot(pickPlayer) || pickPlayer.left) { applyOption(curOpts[Math.max(0, curOpts.findIndex(o => o.kind === 'tech'))], pickPlayer); G.picks.shift(); state = 'play'; return; }
    const box = $('cards'); box.innerHTML = '';
    curOpts.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.id = 'card' + i;
      b.innerHTML = `<span class="orb" style="--c:${o.col}"></span><span class="card-body"><span class="card-top"><span class="card-name"></span><span class="tag ${o.tag === 'NEW' ? 'new' : ''}">${o.tag}</span></span><span class="card-desc"></span></span><kbd>${i + 1}</kbd>`;
      b.querySelector('.card-name').textContent = o.name;
      b.querySelector('.card-desc').textContent = o.desc;
      b.onclick = () => choose(i);
      box.appendChild(b);
    });
    const lvl = G.level - Math.ceil(G.picks.length / G.players.length) + 1;
    $('lvl-title').textContent = 'Level ' + lvl;
    const who = $('lvl-who');
    who.hidden = !coop();
    who.textContent = pName(pickPlayer) + ' picks';
    who.style.setProperty('--c', P_COLORS[pickPlayer.idx]);
    $('levelup').hidden = false;
    cardFocus = 0;
    setTimeout(() => $('card0') && $('card0').focus(), 30);
  }
  function moveCardFocus(d) { cardFocus = (cardFocus + d + curOpts.length) % curOpts.length; const el = $('card' + cardFocus); if (el) el.focus(); }
  function choose(i, net) {
    if (state !== 'levelup' || !curOpts[i] || (pickPlayer.remote && !net)) return;
    applyOption(curOpts[i], pickPlayer); G.picks.shift();
    $('levelup').hidden = true; state = 'play';
  }

  // ------------------------------------------------------------ transformation
  function nextForm(p) { return p.C.forms[p.form + 1]; }
  function startTransform(p) {
    state = 'transform'; G.tf = { t: 0, dur: 1.9, done: false, form: nextForm(p), p };
    if (p.charId === 'goku' && p.form === 0 && !G.ssjClip) {   // the first Super Saiyan gets the anime clip
      G.ssjClip = true; Object.assign(G.tf, { clip: true, dur: CLIP_TIME, at: CLIP_FLIP });
      playClip(); netEvent(['clip']);
    }
    sfx('transform');
  }
  function updateTransform(dt) {
    const tf = G.tf, p = tf.p; tf.t += dt;
    const col = tf.form.aura || '#fff';
    for (let i = 0; i < 4; i++) { const a = rand(0, TAU), R = rand(10, 40) * (1 - tf.t / tf.dur) + 6; G.parts.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, vx: -Math.cos(a) * 40, vy: -Math.sin(a) * 40 - 30, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? col : '#fff', sz: 1, g: 0 }); }
    G.shake = Math.max(G.shake, tf.t * 2);
    if (!tf.done && tf.t > (tf.at || tf.dur * 0.55)) {
      tf.done = true; p.form++; recalc(p); p.hp = Math.min(p.ps.maxHp, p.hp + p.ps.maxHp * 0.3);
      G.flash = 1; G.flashCol = col; G.shake = 10;
      showBanner(tf.form.name.toUpperCase(), (coop() ? pName(p) + ' · ' : '') + 'Power ×' + tf.form.power, col);
      pushEnemiesFrom(p.x, p.y, Math.max(VW, VH) * 0.6, 260, 40 * might(p), col);
      G.fx.push({ type: 'ring', x: p.x, y: p.y, r: Math.max(VW, VH) * 0.6, life: 0.6, max: 0.6, col });
      G.enemies = G.enemies.filter(e => !e.dead);
      if (fusePair() && fuseStatus() === 'ready' && G.fuseCD <= 0 && !G.fuseHinted) { G.fuseHinted = true; toast('Fusion unlocked: both press your fuse key (E / Enter)'); }
    }
    if (tf.t >= tf.dur) { state = 'play'; G.tf = null; hideClip(); }
  }

  // ------------------------------------------------------------ update
  function updateCamera() {
    if (online()) {   // online: the host's screen follows the host; guests follow themselves on their side
      const me = G.players[0], b = me && (me.absorbed && G.fusion ? G.fusion.ctrl : me);
      if (b && !b.down) { G.cx = b.x; G.cy = b.y; return; }
    }
    const bs = bodies(); if (!bs.length) return;
    G.cx = bs.reduce((a, p) => a + p.x, 0) / bs.length;
    G.cy = bs.reduce((a, p) => a + p.y, 0) / bs.length;
  }
  function update(dt) {
    G.t += dt; if (!G.arena) G.sagaT += dt;
    if (G.interSaga > 0) {
      G.interSaga -= dt;
      if (G.interSaga <= 0) { if (G.victoryPending) { G.victoryPending = false; gameOver(true); return; } nextSaga(); }
    }
    if (G.fuseCD > 0) { G.fuseCD -= dt; if (G.fuseCD <= 0 && fuseStatus() === 'ready') toast('Fusion is ready again'); }
    if (G.fuseReq) { const o = fusePartner(G.players[G.fuseReq.by]); if (o && isBot(o) && G.fuseReq.t < FUSE_WINDOW - 0.8) fusePressed(o); }
    if (G.fuseReq) { G.fuseReq.t -= dt; if (G.fuseReq.t <= 0) { G.fuseReq = null; toast('Fusion timed out'); } }
    if (G.fusion) { G.fusion.t -= dt; if (G.fusion.t <= 0) endFusion(false); }
    updateRift(dt);
    if (state !== 'play') return;

    for (const p of bodies()) {
      const [mx, my] = moveInput(p);
      p.moving = !!(mx || my);
      if (mx) p.face = mx > 0 ? 1 : -1;
      const sp = moveSpeed(p);
      p.x += (mx * sp + p.kvx) * dt; p.y += (my * sp + p.kvy) * dt;
      for (const k in p.buffs) if (p.buffs[k] > 0) p.buffs[k] -= dt;
      if (p.itemCD > 0) p.itemCD -= dt;
      if (p.ultLock > 0) p.ultLock -= dt;
      const mi = marks(); G.killer = p.idx; updateItem(p, dt); G.killer = undefined; tagSince(mi, p.idx);
      const dec = Math.max(0, 1 - dt * 6); p.kvx *= dec; p.kvy *= dec;
      p.anim += dt;
      p.iframe -= dt; p.hurtT -= dt;
      if (p.C.regen && !p.fusion) p.hp = Math.min(p.ps.maxHp, p.hp + p.ps.maxHp * p.C.regen * dt);
    }
    leash();
    for (const p of bodies()) if (!hasItem(p, 'nimbus')) pushOutSolids(p, 5);
    if (G.arena) arenaClamp();
    // reviving a downed partner
    for (const p of G.players) {
      if (!p.down) continue;
      const helper = bodies().find(q => d2(q.x, q.y, p.x, p.y) < 18 * 18);
      p.reviveT = helper ? p.reviveT + dt : Math.max(0, p.reviveT - dt);
      if (p.reviveT >= REVIVE_TIME) revivePlayer(p, 0.4);
    }
    updateCamera();
    if (online() && !G.arena) for (const b of bodies()) {   // build terrain (and its collisions) around every fighter
      const bx = Math.floor(b.x / CHUNK), by = Math.floor(b.y / CHUNK);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) getChunk(bx + i, by + j, saga().biome);
    }

    spawning(dt);
    if (!G.arena && (G.lootT -= dt) <= 0) { G.lootT = rand(70, 100); spawnSupplyDrop(); }
    buildGrid();
    updateEnemies(dt);
    buildGrid();
    for (const p of bodies()) {
      const m = marks(); G.killer = p.idx;
      updateTechs(p, p, dt);
      if (p.fusion) updateTechs(p, p.fusion.other, dt);
      tagSince(m, p.idx);
    }
    G.killer = undefined;
    updateUlts(dt);
    updateShots(dt);
    G.enemies = G.enemies.filter(e => !e.dead);
    updatePickups(dt);
    updateFx(dt);
    if (state !== 'play') return;

    for (const p of bodies()) {
      const pl = powerLevel(p);
      if (!G.over9000 && pl > 9000) { G.over9000 = true; showBanner("IT'S OVER 9,000!", pName(p) + ': power level ' + fmt(pl), '#ff5a3a'); }
    }
    // Forms: fighters inside a fusion (or down) grow silently and show it later.
    for (const p of G.players) {
      if (!(p.absorbed || p.fusion || p.down)) continue;
      while (nextForm(p) && G.level >= nextForm(p).lv) { p.form++; toast(pName(p) + ' reached ' + p.C.forms[p.form].name); }
      if (p.fusion) recalc(p);
    }
    const tp = bodies().find(p => !p.fusion && nextForm(p) && G.level >= nextForm(p).lv);
    if (tp) startTransform(tp);
    else if (G.picks.length) openLevelUp();
  }
  function leash() {   // keep couch co-op players on one screen
    if (online()) return;
    const bs = bodies(); if (bs.length < 2) return;
    for (const [k, lim] of [['x', VW - 40], ['y', VH - 40]]) {
      const lo = Math.min(...bs.map(p => p[k])), hi = Math.max(...bs.map(p => p[k])), span = hi - lo;
      if (span <= lim) continue;
      const mid = (lo + hi) / 2;
      for (const p of bs) p[k] = mid + (p[k] - mid) * lim / span;
    }
  }
  function updateFx(dt) {
    for (const p of bodies()) {
      const f = curForm(p), sc = f.scale || 1;
      if (f.aura && Math.random() < 0.9) {
        G.parts.push({ x: p.x + rand(-6, 6) * sc, y: p.y + 6 * sc, vx: rand(-6, 6), vy: rand(-55, -35), life: rand(0.25, 0.45), max: 0.45, col: Math.random() < 0.7 ? f.aura : '#fff', sz: 1, g: 0, aura: true });
      }
      if (hasTech(p, 'kaioken') && Math.random() < 0.6) G.parts.push({ x: p.x + rand(-7, 7), y: p.y + 6, vx: rand(-8, 8), vy: rand(-50, -30), life: 0.35, max: 0.35, col: '#ff3030', sz: 1, g: 0, aura: true });
    }
    for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.life -= dt; q.vx *= 0.96; if (!q.aura) q.vy *= 0.96; }
    G.parts = G.parts.filter(q => q.life > 0);
    for (const x of G.fx) x.life -= dt;
    G.fx = G.fx.filter(x => x.life > 0);
    for (const t of G.texts) { t.life -= dt; t.y -= dt * (t.big ? 10 : 22); }
    G.texts = G.texts.filter(t => t.life > 0);
    G.shake = Math.max(0, G.shake - dt * 20);
    if (G.wishFade > 0 && state !== 'wish') G.wishFade -= dt;
    G.flash = Math.max(0, G.flash - dt * 1.6);
  }

  // ------------------------------------------------------------ attack effect sprites
  // From the Supersonic Warriors effects sheet (tools/make_fx.py). Each attack picks the sprite family
  // closest to its colour: y (yellow/orange), g (green), b (blue), p (pink/purple/red).
  const FX_NAMES = (() => {
    const n = ['fx/disc', 'fx/sphere_y', 'fx/sphere_p', 'fx/sphere_g', 'fx/sphere_b', 'fx/ghost', 'fx/boom_s', 'fx/boom'];
    for (const f of ['y', 'g', 'b', 'p']) {
      n.push('fx/spark_' + f, 'fx/orb_' + f, 'fx/comet_' + f);
      for (const k of ['start', 'body0', 'body1', 'end']) n.push('fx/beam_' + f + '_' + k, 'fx/drill_' + f + '_' + k);
    }
    return n;
  })();
  const famCache = {};
  function fam(col) {
    if (famCache[col]) return famCache[col];
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(col || '');
    let f = 'y';
    if (m) {
      const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d / (mx || 1) > 0.25) {
        let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        f = h < 15 || h >= 260 ? 'p' : h < 75 ? 'y' : h < 165 ? 'g' : 'b';
      } else if (b > r + 0.05) f = 'b';
    }
    return (famCache[col] = f);
  }
  // Draws frame `frame` of an art/fx sprite centred on (x, y), `size` world units wide, turned by `ang`.
  function fxImg(name, frame, x, y, size, ang = 0, alpha = 1) {
    const a = ART[name]; if (!a) return false;
    const h = size * a.fh / a.fw;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (ang) ctx.rotate(ang);
    ctx.drawImage(a.img, (frame % a.frames) * a.fw, 0, a.fw, a.fh, -size / 2, -h / 2, size, h);
    ctx.restore();
    return true;
  }
  const spin = (rate, n) => Math.floor(G.t * rate) % n;
  function drawShot(s) {
    const f = fam(s.col);
    if (s.r >= 4.5) fxImg('fx/comet_' + f, 0, s.x, s.y, s.r * 5.2, Math.atan2(s.vy, s.vx) - Math.PI / 2);   // comets fall "down" on the sheet
    else if (!fxImg('fx/orb_' + f, spin(12, 2), s.x, s.y, s.r * 5)) kiBall(s.x, s.y, s.r, s.col, s.core);
  }
  function drawEnemyShot(s) {
    const f = fam(s.col);
    if (s.big) fxImg('fx/comet_' + f, 0, s.x, s.y, s.r * 5.2, Math.atan2(s.vy, s.vx) - Math.PI / 2);
    else if (!fxImg('fx/orb_' + f, spin(12, 2), s.x, s.y, s.r * 5.5)) { circ(s.x, s.y, s.r + 1, '#1a1020'); circ(s.x, s.y, s.r, s.col); }
  }
  function drawBomb(b) {
    const grow = b.chargeMax > 0 ? clamp(1 - b.charge / b.chargeMax, 0.15, 1) : 1, f = fam(b.col);
    const name = 'fx/sphere_' + f, a = ART[name];
    if (!a || !fxImg(name, spin(10, a.frames), b.x, b.y, b.size * grow * 2.3)) kiBall(b.x, b.y, b.size * grow, b.col, b.core);
  }
  function drawHz(h) {
    if (h.ghost) fxImg('fx/ghost', spin(10, 5), h.x, h.y, 18);
    else fxImg('fx/orb_' + fam(h.col), spin(12, 2), h.x, h.y, 13) || kiBall(h.x, h.y, 3, h.col, h.core);
  }
  function drawBoom(x, k) {   // k runs 1 -> 0 over the explosion
    const big = x.r >= 18, name = big ? 'fx/boom' : 'fx/boom_s';
    if (!fxImg(name, Math.min(5, Math.floor((1 - k) * 6)), x.x, x.y, x.r * (big ? 2.4 : 3.2))) {
      ctx.globalAlpha = k; circ(x.x, x.y, x.r * (1.1 - k * 0.5), x.col); circ(x.x, x.y, x.r * (0.8 - k * 0.4), x.core || '#fff'); ctx.globalAlpha = 1;
    }
  }
  function drawSpark(x, k) { return fxImg('fx/spark_' + fam(x.col), Math.min(3, Math.floor((1 - k) * 4)), x.x, x.y, 20); }
  // Beam from sprites: a start burst at the hands, the body stretched to length, and the head at the far end.
  function beamSprites(kind, f, L, w) {
    const body = ART['fx/' + kind + '_' + f + '_body' + spin(20, 2)], st = ART['fx/' + kind + '_' + f + '_start'], en = ART['fx/' + kind + '_' + f + '_end'];
    if (!body || !st || !en) return false;
    const H = kind === 'drill' ? w * 2.2 + 4 : w * 1.35;
    ctx.drawImage(body.img, 0, -H / 2, L, H);
    const sh = kind === 'drill' ? H * 1.6 : w * 2, sw = st.fw / st.fh * sh;
    ctx.drawImage(st.img, -sw * 0.35, -sh / 2, sw, sh);
    const eh = kind === 'drill' ? H * 1.8 : w * 2.3, ew = en.fw / en.fh * eh;
    ctx.drawImage(en.img, L - ew * 0.45, -eh / 2, ew, eh);
    return true;
  }

  // ------------------------------------------------------------ render
  let titleCam = 0;
  function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  function render() {
    if (VW < 1 || VH < 1) return;
    let cx, cy, sg;
    if (G) { cx = G.cx; cy = G.cy; sg = saga(); }
    else { titleCam += 0.25; cx = titleCam; cy = titleCam * 0.4; sg = SAGAS[0]; }
    const sh = G ? G.shake : 0;
    const ox = Math.round(VW / 2 - cx + rand(-sh, sh)), oy = Math.round(VH / 2 - cy + rand(-sh, sh));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#101428'; ctx.fillRect(0, 0, low.width, low.height);
    ctx.setTransform(FINE, 0, 0, FINE, ox * FINE, oy * FINE);
    const x0 = cx - VW / 2, y0 = cy - VH / 2;

    // ground, decals and the structures in view
    let structs = [];
    if (G && G.arena) drawArena(x0, y0);
    else structs = drawGround(x0, y0, sg.biome);
    if (!G) { structs.sort((a, b) => a.y - b.y); for (const st of structs) drawStruct(st); flush(); return; }
    if (G.rift) drawPortal(G.rift.x, G.rift.y, G.rift.ph, '#b05aff', '#1a0630', Math.ceil(G.rift.t));
    if (G.arena && G.arena.exit) drawPortal(G.arena.exit.x, G.arena.exit.y, G.t, '#8af0ff', '#0a2a40', 0);

    // pickups
    for (const o of G.orbs) sprite(orbSprite(o.v), o.x, o.y);
    for (const k of G.pickups) {
      if (k.kind === 'loot') { drawLoot(k); continue; }
      const bob = Math.round(Math.sin(k.t * 4) * 1.5);
      if (k.kind === 'dragonball') { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(k.t * 6); circ(k.x, k.y + bob, 9, '#ffb030'); ctx.globalAlpha = 1; }
      if (k.kind === 'ticket') { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(k.t * 7); circ(k.x, k.y + bob, 7, '#f2c43a'); ctx.globalAlpha = 1; }
      if (k.kind === 'cap') { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(k.t * 5); circ(k.x, k.y + bob, k.cap === 'item' ? 9 : 6, CAPSULES[k.cap].color); ctx.globalAlpha = 1; }
      sprite(k.kind === 'cap' ? CAPSULES[k.cap].sprite : k.kind, k.x, k.y + bob);
    }

    // boss telegraphs
    for (const e of G.enemies) if (e.boss && e.act) {
      const a = e.act;
      if (a.type === 'dash' && a.t < 0.6) line(e.x, e.y, e.x + Math.cos(a.ang) * 130, e.y + Math.sin(a.ang) * 130, 'rgba(255,60,60,' + (0.3 + a.t) + ')', 2);
      if (a.type === 'beam' && a.t < 0.85) line(e.x, e.y, e.x + Math.cos(a.ang) * 420, e.y + Math.sin(a.ang) * 420, 'rgba(255,60,60,' + (0.25 + a.t * 0.6) + ')', 1 + a.t * 6);
      if (a.type === 'teleport' && a.moved && !a.hit) { ctx.strokeStyle = 'rgba(255,60,60,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, 30, 0, TAU); ctx.stroke(); }
    }

    // downed players lie under everything else
    for (const p of G.players) if (p.down) drawDowned(p);

    // characters, y-sorted
    const list = G.enemies.slice();
    for (const p of G.players) if (!p.down && !p.absorbed) list.push(p);
    for (const st of structs) list.push(st);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e.struct) { drawStruct(e); continue; }
      if (e.C) { drawPlayer(e); continue; }
      const sc = e.scale || 1;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(Math.round(e.x - 5 * sc), Math.round(e.y + 7 * sc), Math.round(10 * sc), 2);
      const bob = Math.sin(e.ph * 10) > 0 ? -1 : 0;
      if (e.boss) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(e.ph * 8); circ(e.x, e.y, 10 * sc, e.color); ctx.globalAlpha = 1; }
      const ea = ART[e.s];
      const alpha = e.act && e.act.type === 'teleport' && !e.act.moved ? Math.max(0.1, 1 - e.act.t / 0.3) : 1;
      if (ea && ea.frames === 8) {
        const fr = e.act ? Math.floor(e.ph * 6) % 4 : 4 + Math.floor(e.ph * 10) % 4;
        sprite(e.s, e.x, e.y + 8 * sc - spriteHeight(e.s, sc) / 2, sc, e.flash, alpha, fr, e.face < 0);
      } else sprite(e.s, e.x, e.y + bob, sc, e.flash, alpha);
      if (e.stunT > 0) for (let k = 0; k < 3; k++) {   // dizzy stars
        const a = G.t * 6 + k * TAU / 3;
        ctx.fillStyle = '#ffe24a'; ctx.fillRect(Math.round(e.x + Math.cos(a) * 6), Math.round(e.y - 12 * sc + Math.sin(a) * 2), 2, 2);
      }
    }

    // clones
    for (const p of bodies()) {
      if (!hasTech(p, 'multiform') || (online() && p.idx !== viewIdx())) continue;
      const inst = techOf(p, 'multiform'), n = TECHS.multiform.stats(inst.lv).count, f = curForm(p);
      for (let i = 0; i < n; i++) { const [x, y] = clonePos(p, inst, i, n); sprite(f.sprite, x, y, 0.85 * (f.scale || 1), 0, 0.55); }
    }

    for (const b of G.beams) if (seen(b)) drawBeam(b);
    for (const s of G.shots) {
      if (!seen(s)) continue;
      if (s.style === 'laser') { const d = Math.hypot(s.vx, s.vy); line(s.x - s.vx / d * 8, s.y - s.vy / d * 8, s.x, s.y, s.col, 2); line(s.x - s.vx / d * 6, s.y - s.vy / d * 6, s.x, s.y, s.core, 1); }
      else if (s.style === 'dragon') drawDragon(s);
      else if (s.style === 'disc') fxImg('fx/disc', spin(16, 4), s.x, s.y, s.r * 3);
      else drawShot(s);
    }
    for (const b of G.bombs) if (seen(b)) drawBomb(b);
    for (const h of G.hz) if (seen(h)) drawHz(h);
    for (const s of G.eshots) drawEnemyShot(s);
    for (const x of G.fx) {
      if (!seen(x)) continue;
      const k = x.life / x.max;
      if (x.type === 'boom') drawBoom(x, k);
      else if (x.type === 'spark') drawSpark(x, k);
      else if (x.type === 'ring') { ctx.globalAlpha = k; ctx.strokeStyle = x.col; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(x.x, x.y, x.r * (1 - k * 0.85), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (x.type === 'dash') { ctx.globalAlpha = k; line(x.x, x.y, x.x2, x.y2, x.col, 2); ctx.globalAlpha = 1; }
      else if (x.type === 'impact' && drawSpark(x, k)) { /* sprite spark */ }
      else if (x.type === 'impact') { const r = 8 * (1 - k) + 3; ctx.globalAlpha = k; line(x.x - r, x.y, x.x + r, x.y, x.col, 2); line(x.x, x.y - r, x.x, x.y + r, x.col, 2); line(x.x - r * 0.6, x.y - r * 0.6, x.x + r * 0.6, x.y + r * 0.6, '#fff', 1); ctx.globalAlpha = 1; }
      else if (x.type === 'erase') { ctx.globalAlpha = k; circ(x.x, x.y, 10 * (1 - k) + 2, x.col); ctx.globalAlpha = 1; }
    }
    for (const q of G.parts) { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.sz, q.sz); }
    ctx.globalAlpha = 1;
    for (const p of bodies()) drawPlayer(p, true);
    // player tags in co-op
    if (coop()) {
      ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace';
      for (const p of bodies()) {
        const h = Math.min(spriteHeight(curForm(p).sprite, curForm(p).scale || 1), 36 * (curForm(p).scale || 1));   // glide frames widen the cell
        const label = p.fusion ? 'P' + (p.fusion.ctrl.idx + 1) + '+P' + (p.fusion.other.idx + 1) : 'P' + (p.idx + 1);
        ctx.fillStyle = '#1a1020'; ctx.fillText(label, p.x + 0.5, p.y + 8 - h - 1.5);
        ctx.fillStyle = p.fusion ? '#ffd83a' : P_COLORS[p.idx]; ctx.fillText(label, p.x, p.y + 8 - h - 2);
      }
    }
    // texts
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const t of G.texts) {
      if (!seen(t)) continue;
      ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2; ctx.strokeText(t.s, Math.round(t.x), Math.round(t.y));
      ctx.fillStyle = t.col; ctx.fillText(t.s, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
    drawIndicators();
    if (state === 'wish' || (G.wishFade > 0)) drawShenron();
    ctx.setTransform(FINE, 0, 0, FINE, 0, 0);
    if (G.flash > 0) { ctx.globalAlpha = Math.min(1, G.flash); ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    flush();
  }
  function flush() {
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(low, 0, 0, low.width * Z / FINE, low.height * Z / FINE);
    if (joy.on && state === 'play') {
      sctx.globalAlpha = 0.35; sctx.strokeStyle = '#fff'; sctx.lineWidth = 3;
      sctx.beginPath(); sctx.arc(joy.ox, joy.oy, 40, 0, TAU); sctx.stroke();
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), k = d > 40 ? 40 / d : 1;
      sctx.fillStyle = '#fff'; sctx.beginPath(); sctx.arc(joy.ox + dx * k, joy.oy + dy * k, 16, 0, TAU); sctx.fill();
      sctx.globalAlpha = 1;
    }
  }
  function line(x1, y1, x2, y2, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  // Picks the animation frame: hero strips are idle0 idle1 walk0-3; fusion strips are idle0 idle1 move0 move1.
  function animFrame(name, p) {
    const a = ART[name]; if (!a || a.frames < 2) return 0;
    if (a.frames >= 8) return p.moving ? 4 + Math.floor(p.anim * 10) % 4 : Math.floor(p.anim * 6) % 4;
    if (a.frames >= 6) return p.moving ? 2 + Math.floor(p.anim * 8) % 4 : Math.floor(p.anim * 2.5) % 2;
    return (p.moving ? 2 : 0) + Math.floor(p.anim * (p.moving ? 6 : 2.5)) % 2;
  }
  function drawPlayer(p, top) {
    const f = curForm(p), sc = f.scale || 1, name = f.sprite, a = ART[name];
    if (top) {   // second pass above effects: sprite only
      const h = spriteHeight(name, sc), animated = a && a.frames > 1;
      const bob = !animated ? (p.moving && Math.sin(p.anim * 14) > 0 ? -1 : 0) : p.moving ? Math.round(Math.sin(p.anim * 7) * 1.5) - 2 : 0;   // gliding fighters hover
      const flip = !!(a && (a.frames === 4 || a.frames === 8) && p.face < 0);
      const blink = p.iframe > 0 && Math.floor(G.t * 20) % 2 ? 0.45 : 1;
      sprite(name, p.x, p.y + 8 * sc - h / 2 + bob, sc, p.hurtT > 0 ? 0.08 : 0, blink, animFrame(name, p), flip);
      return;
    }
    if (f.aura) { ctx.globalAlpha = 0.22 + 0.08 * Math.sin(G.t * 20); circ(p.x, p.y + 1, (p.fusion ? 15 : 11) * sc, f.aura); ctx.globalAlpha = 1; }
    if (hasTech(p, 'kaioken') && (!online() || p.idx === viewIdx())) {
      const r = TECHS.kaioken.stats(techOf(p, 'kaioken').lv).radius * p.ps.area;
      ctx.globalAlpha = 0.18 + 0.06 * Math.sin(G.t * 14); ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (f.sparks && Math.random() < 0.25) {
      let x = p.x + rand(-10, 10), y = p.y - 12;
      ctx.strokeStyle = Math.random() < 0.5 ? '#bfe8ff' : '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 4; i++) { x += rand(-4, 4); y += rand(3, 6); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(p.x - 5 * sc), Math.round(p.y + 7 * sc), Math.round(10 * sc), 2);
    if (aimOn(p) && (!online() || p.idx === viewIdx())) {   // the shooter's aim inside a fusion
      const a = Math.atan2(p.fusion.aim[1], p.fusion.aim[0]), c = Math.cos(a), sn = Math.sin(a), R = 22;
      ctx.globalAlpha = 0.75; ctx.fillStyle = P_COLORS[p.idx];
      ctx.beginPath(); ctx.moveTo(p.x + c * (R + 5), p.y + sn * (R + 5)); ctx.lineTo(p.x + c * R - sn * 3, p.y + sn * R + c * 3); ctx.lineTo(p.x + c * R + sn * 3, p.y + sn * R - c * 3); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const blink = p.iframe > 0 && Math.floor(G.t * 20) % 2 ? 0.45 : 1;
    const h = spriteHeight(name, sc);
    const animated = a && a.frames > 1;
    const bob = !animated ? (p.moving && Math.sin(p.anim * 14) > 0 ? -1 : 0) : p.moving ? Math.round(Math.sin(p.anim * 7) * 1.5) - 2 : 0;   // gliding fighters hover
    const flip = !!(a && (a.frames === 4 || a.frames === 8) && p.face < 0);   // fusion and fighter strips face right
    if (hasItem(p, 'nimbus')) { ctx.globalAlpha = 0.9; circ(p.x - 4, p.y + 8, 4, '#f2c43a'); circ(p.x + 3, p.y + 8, 5, '#fff27a'); circ(p.x, p.y + 6, 4, '#fff8b0'); ctx.globalAlpha = 1; }
    if (hasItem(p, 'ring')) { ctx.globalAlpha = 0.16; ctx.strokeStyle = '#f2c43a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 60, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    sprite(name, p.x, p.y + 8 * sc - h / 2 + bob, sc, p.hurtT > 0 ? 0.08 : 0, blink, animFrame(name, p), flip);
  }
  function drawDowned(p) {
    const f = p.C.forms[p.form];
    ctx.save(); ctx.translate(p.x, p.y + 4); ctx.rotate(Math.PI / 2);
    sprite(f.sprite, 0, 0, f.scale || 1, 0, 0.6);
    ctx.restore();
    if (p.reviveT > 0) {
      ctx.strokeStyle = '#8ae87a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * p.reviveT / REVIVE_TIME); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.font = '4px "Press Start 2P", monospace';
    ctx.fillStyle = P_COLORS[p.idx]; ctx.fillText('P' + (p.idx + 1) + ' DOWN', p.x, p.y - 12);
  }
  function drawBeam(b) {
    const p = b.src;
    const fade = Math.min(1, b.life / 0.15), w = b.width * fade * (0.9 + 0.15 * Math.sin(G.t * 50));
    const L = b.len * b.grow, ox = p.x + Math.cos(b.ang) * HAND, oy = p.y - 3 + Math.sin(b.ang) * HAND;
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(b.ang);
    if (b.style === 'pole') {
      ctx.fillStyle = '#8a1a12'; ctx.fillRect(0, -2, L, 4);
      ctx.fillStyle = b.col; ctx.fillRect(0, -1.5, L, 2);
      ctx.fillStyle = b.core; ctx.fillRect(L - 4, -2.5, 4, 5); ctx.fillRect(0, -2.5, 3, 5);
    } else if (b.style === 'drill' && beamSprites('drill', fam(b.col), L, w)) {
      /* sprite drill beam */
    } else if (b.style !== 'drill' && beamSprites('beam', fam(b.col), L, w)) {
      /* sprite beam */
    } else if (b.style === 'drill') {
      ctx.fillStyle = b.col; ctx.fillRect(0, -w / 2, L, w);
      ctx.fillStyle = b.core; ctx.fillRect(0, -w / 4, L, Math.max(1, w / 2));
      ctx.fillStyle = b.spiral;
      for (let i = 0; i < L; i += 2) ctx.fillRect(i, Math.round(Math.sin(i * 0.35 - G.t * 40) * (w + 3)), 2, 2);
    } else {
      ctx.globalAlpha = 0.35; ctx.fillStyle = b.col; ctx.fillRect(0, -w * 0.8, L, w * 1.6); ctx.globalAlpha = 1;
      ctx.fillRect(0, -w / 2, L, w);
      ctx.fillStyle = b.core; ctx.fillRect(0, -w / 4, L, w / 2);
      circ(L, 0, w * 0.75, b.col); circ(L, 0, w * 0.4, b.core);
      circ(0, 0, w * 0.7, b.col); circ(0, 0, w * 0.4, b.core);
    }
    ctx.restore();
  }
  function drawDragon(s) {
    const tr = s.trail;
    for (let i = tr.length - 1; i >= 1; i -= 1) {
      const k = 1 - i / tr.length, r = s.r * (0.35 + 0.6 * k);
      circ(tr[i][0], tr[i][1] + Math.sin(i * 0.9 + G.t * 20) * 2, r + 1, '#a8701a');
      circ(tr[i][0], tr[i][1] + Math.sin(i * 0.9 + G.t * 20) * 2, r, s.col);
    }
    const a = Math.atan2(s.vy, s.vx);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
    circ(0, 0, s.r + 1, '#a8701a'); circ(0, 0, s.r, s.col); circ(s.r * 0.6, 0, s.r * 0.6, s.col);
    ctx.fillStyle = '#fff4b0'; ctx.fillRect(-s.r * 0.6, -s.r - 4, 3, 5); ctx.fillRect(-s.r * 0.6, s.r - 1, 3, 5);
    ctx.fillStyle = '#d81a1a'; ctx.fillRect(Math.round(s.r * 0.3), -3, 2, 2); ctx.fillRect(Math.round(s.r * 0.3), 1, 2, 2);
    ctx.restore();
  }

  // ------------------------------------------------------------ technique slots & bonds
  function buildSlotBar() {
    $('slotbar').innerHTML = G.players.map(p => `<div class="slotrow" style="--pc:${P_COLORS[p.idx]}">` +
      (coop() ? `<b class="pc-tag">P${p.idx + 1}</b>` : '') +
      p.slots.map((sl, i) => `<button class="slot ${i === p.active ? 'on' : ''} ${sl.length > 1 ? 'bonded' : ''}" data-p="${p.idx}" data-i="${i}" title="${esc(sl.map(id => TECHS[id].name).join(' + '))}">` +
        `<kbd>${coop() && p.idx && !NET.role ? 'N' + (i + 1) : i + 1}</kbd>` +
        sl.map(id => `<span style="--c:${TECHS[id].color}"><em></em>${TECHS[id].name}<b>${p.techs[id].lv}</b></span>`).join('<i>+</i>') + '</button>').join('') +
      (p.bonds ? `<button class="bondtok" data-bond="${p.idx}">Bond ×${p.bonds} <kbd>${coop() && p.idx && !NET.role ? 'Num +' : 'B'}</kbd></button>` : '') +
      '</div>').join('');
  }
  $('slotbar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !G) return;
    if (b.dataset.bond !== undefined) openBond(G.players[+b.dataset.bond]);
    else selectSlot(G.players[+b.dataset.p], +b.dataset.i);
  });

  let bondP = null, bondSel = new Set();
  function grantBond() {
    for (const p of G.players) p.bonds++;
    techKey = '';
    toast(coop() ? 'Bond earned! P1 press B, P2 press Num + to merge techniques' : 'Bond earned! Press B to merge techniques into one slot');
  }
  function openBond(p) {
    if (!p || state !== 'play' || NET.bondOpen) return;
    if (isClient() && p.idx !== NET.me) return;
    if (p.bonds <= 0) { toast('Beat a boss to earn a Bond'); return; }
    if (p.slots.length < 2) { toast('You need at least two technique slots to bond'); return; }
    if (isClient()) NET.bondOpen = true; else state = 'bond';
    bondP = p; bondSel = new Set();
    renderBond(); $('bond').hidden = false;
    setTimeout(() => { const f = document.querySelector('#bond-slots button'); if (f) f.focus(); }, 30);
  }
  function renderBond() {
    $('bond-sub').textContent = (coop() ? pName(bondP) + ' · ' : '') + 'Bonds left: ' + bondP.bonds +
      '. Pick two or more slots. Bonded techniques all fire while that slot is selected.';
    $('bond-slots').innerHTML = bondP.slots.map((sl, i) => `<button class="card bslot ${bondSel.has(i) ? 'on' : ''}" data-i="${i}">` +
      `<span class="orb" style="--c:${TECHS[sl[0]].color}"></span><span class="card-body"><span class="card-name">${sl.map(id => TECHS[id].name).join(' + ')}</span>` +
      `<span class="card-desc">Slot ${i + 1}${sl.length > 1 ? ' · already bonded' : ''}</span></span><kbd>${i + 1}</kbd></button>`).join('');
    $('bond-go').disabled = bondSel.size < 2;
    $('bond-go').textContent = bondSel.size < 2 ? 'Pick 2 or more' : 'Bond ' + bondSel.size + ' slots';
  }
  $('bond-slots').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !bondP) return;
    const i = +b.dataset.i; bondSel.has(i) ? bondSel.delete(i) : bondSel.add(i); renderBond();
  });
  function doBond() {
    if (!bondP || bondSel.size < 2) return;
    if (isClient()) { sendHost({ t: 'bond', sel: [...bondSel] }); closeBond(); return; }
    const idx = [...bondSel].sort((a, b) => a - b);
    const merged = idx.flatMap(i => bondP.slots[i]);
    const keep = bondP.slots.filter((_, i) => !bondSel.has(i));
    keep.splice(idx[0], 0, merged);
    bondP.slots = keep; bondP.active = idx[0]; bondP.bonds--;
    const p = bondP;
    closeBond();
    showBanner('TECHNIQUES BONDED', merged.map(id => TECHS[id].name).join(' + ') + ' · slot ' + (idx[0] + 1), '#ffd83a');
    const body = p.absorbed && G.fusion ? G.fusion.ctrl : p;
    burst(body.x, body.y, '#ffd83a', 20, 60); sfx('fuse');
    techKey = '';
  }
  function closeBond() { $('bond').hidden = true; if (state === 'bond') state = 'play'; bondP = null; NET.bondOpen = false; }
  function bondKey(c, digit) {
    if (digit) { const i = +digit[2] - 1; if (i < bondP.slots.length) { bondSel.has(i) ? bondSel.delete(i) : bondSel.add(i); renderBond(); } }
    else if (c === 'Enter' || c === 'NumpadEnter') doBond();
    else if (c === 'Escape' || c === 'KeyB' || c === 'NumpadAdd') closeBond();
  }
  $('bond-go').onclick = doBond;
  $('bond-close').onclick = closeBond;

  // ------------------------------------------------------------ Shenron's wishes
  const WISHES = [
    { id: 'power', name: 'Make me stronger', info: 'You deal 30% more damage for the rest of the run.', apply: p => { p.wish.might *= 1.3; } },
    { id: 'form', name: 'Unlock my hidden power', info: 'Jump straight to your next transformation.', ok: p => !!nextForm(p),
      apply: p => { p.form++; const f = p.C.forms[p.form]; showBanner(f.name.toUpperCase(), pName(p) + ' awakens early', f.aura || '#fff'); } },
    { id: 'life', name: 'Restore us', info: 'The whole team is healed and revived, and your max HP rises 25%.',
      apply: p => { p.wish.hp *= 1.25; recalcAll(); for (const q of G.players) if (q.down) revivePlayer(q, 1); for (const q of bodies()) q.hp = q.ps.maxHp; } },
    { id: 'bond', name: 'Bind my techniques', info: 'You gain two Bonds.', apply: p => { p.bonds += 2; } },
    { id: 'wisdom', name: 'Grant us wisdom', info: 'The team gains four levels.', apply: () => { let xp = 0; for (let l = G.level; l < G.level + 4; l++) xp += xpFor(l); gainXp(xp); } },
    { id: 'treasure', name: 'Bring me treasure', info: 'A special item and three capsules.', apply: p => {
      const body = p.absorbed && G.fusion ? G.fusion.ctrl : p;
      giveItem(p); for (let i = 0; i < 3; i++) dropCapsule(body.x + (i - 1) * 16, body.y + 18);
    } },
    { id: 'speed', name: 'Make me swift', info: 'You move 20% faster for the rest of the run.', apply: p => { p.wish.speed *= 1.2; } },
    { id: 'peace', name: 'Clear the battlefield', info: 'Every regular enemy vanishes, and none arrive for 20 seconds.', apply: () => {
      for (const e of G.enemies) if (!e.boss) { e.dead = true; burst(e.x, e.y, '#8aff4a', 4, 40); }
      G.enemies = G.enemies.filter(e => !e.dead); G.peaceT = 20;
    } },
  ];
  let wishFocus = 0;
  function startWish() {
    state = 'wish'; G.wishT = 0; G.dragonBalls = 0; G.shenron++;
    G.wishUsed = new Set(); G.wishOrder = [0, 1, 2].map(k => (k + (G.shenron - 1) * 3) % G.players.length); G.wishIdx = 0;
    G.flash = 1; G.flashCol = '#8aff4a'; G.shake = 6;
    sfx('boss'); sfx('transform');
    $('banner').hidden = true;
    buildWish();
  }
  function wishOk(w, p) { return !G.wishUsed.has(w.id) && (!w.ok || w.ok(p)); }
  function buildWish() {
    const p = G.players[G.wishOrder[G.wishIdx]];
    $('wish-sub').textContent = (coop() ? pName(p) + ' makes wish ' : 'Wish ') + (G.wishIdx + 1) + ' of 3. Each wish can be granted once.';
    if (p.left) { chooseWish(WISHES.findIndex(w => wishOk(w, p)), true); return; }
    if (p.remote) {
      sendTo(p.idx, { t: 'wishes', sub: 'Your wish (' + (G.wishIdx + 1) + ' of 3). Each wish can be granted once.', list: WISHES.map(w => ({ name: w.name, info: w.info, ok: wishOk(w, p), used: G.wishUsed.has(w.id) })) });
      $('wish').hidden = true;
      return;
    }
    const box = $('wish-list'); box.innerHTML = '';
    WISHES.forEach((w, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.id = 'wish' + i;
      b.disabled = !wishOk(w, p);
      b.innerHTML = `<span class="orb" style="--c:#ff9a1a"></span><span class="card-body"><span class="card-top"><span class="card-name"></span>${G.wishUsed.has(w.id) ? '<span class="tag">GRANTED</span>' : ''}</span><span class="card-desc"></span></span><kbd>${i + 1}</kbd>`;
      b.querySelector('.card-name').textContent = w.name;
      b.querySelector('.card-desc').textContent = w.info;
      b.onclick = () => chooseWish(i);
      box.appendChild(b);
    });
    $('wish').hidden = false;
    wishFocus = WISHES.findIndex(w => wishOk(w, p));
    setTimeout(() => { const el = $('wish' + wishFocus); if (el) el.focus(); }, 30);
  }
  function moveWishFocus(d) {
    const p = G.players[G.wishOrder[G.wishIdx]];
    for (let k = 1; k <= WISHES.length; k++) { const i = (wishFocus + d * k + WISHES.length * 9) % WISHES.length; if (wishOk(WISHES[i], p)) { wishFocus = i; break; } }
    const el = $('wish' + wishFocus); if (el) el.focus();
  }
  function chooseWish(i, net) {
    if (state !== 'wish') return;
    const w = WISHES[i], p = G.players[G.wishOrder[G.wishIdx]];
    if (p.remote && !net) return;
    if (!w || !wishOk(w, p)) return;
    G.wishUsed.add(w.id);
    w.apply(p);
    recalcAll();
    sfx('level');
    toast('Shenron: "' + w.name + '". Your wish has been granted.');
    G.wishIdx++;
    if (G.wishIdx < 3) { buildWish(); return; }
    $('wish').hidden = true; state = 'play'; G.wishFade = 1.5;
    showBanner('THE DRAGON BALLS SCATTER', 'Collect all seven again for three more wishes', '#8aff4a');
  }
  function drawShenron() {
    const t = G.wishT || 0, a = state === 'wish' ? Math.min(1, t / 1.2) : Math.max(0, G.wishFade / 1.5);
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(FINE, 0, 0, FINE, 0, 0);
    ctx.fillStyle = 'rgba(4,18,10,' + (0.75 * a) + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    const cx = G.cx, cy = G.cy + VH * 0.3;
    ctx.globalAlpha = 0.22 * a; ctx.fillStyle = '#d8ffb0'; ctx.fillRect(cx - 7, cy - VH, 14, VH);
    for (let i = 0; i < 7; i++) {
      const ang = i / 7 * TAU + t * 0.6, bx = cx + Math.cos(ang) * 24, by = cy + Math.sin(ang) * 8;
      ctx.globalAlpha = 0.45 * a; circ(bx, by, 6, '#ffb030'); sprite('dragonball', bx, by, 1, 0, a);
    }
    const rise = Math.min(1, t / 1.8), ease = 1 - Math.pow(1 - rise, 3);
    const sh = ART.shenron, sc = Math.min(0.62, (VH * 0.6) / 386);
    if (sh) {
      ctx.globalAlpha = a;
      const hx = cx + 40 - (1 - ease) * 60, hy = cy - VH * 0.36 - (1 - ease) * 40 + Math.sin(t * 1.6) * 3;
      ctx.globalAlpha = 0.25 * a; circ(hx, hy, 386 * sc * 0.45, '#8aff4a');
      ctx.globalAlpha = a * ease;
      sprite('shenron', hx, hy, sc);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ HUD & UI
  let hudKey = '', techKey = '';
  function buildPlayerCards() {
    $('pcards').innerHTML = G.players.map(p => `
      <div class="pcard" id="pc${p.idx}" style="--pc:${P_COLORS[p.idx]}">
        <div class="pc-head">${coop() ? `<b class="pc-tag">P${p.idx + 1}</b>` : ''}<span class="pc-form"></span></div>
        <div class="hpbar"><div class="hpfill"></div><span class="hptext"></span></div>
        <div class="enbar"><div class="enfill"></div><span class="entext"></span></div>
        <div class="pwr">Power level <b class="pc-pwr">0</b></div>
        <div class="pc-extra"></div>
      </div>`).join('');
  }
  function hud() {
    $('xpfill').style.width = (G.xp / G.xpNext * 100).toFixed(1) + '%';
    for (const p of G.players) {
      const el = $('pc' + p.idx); if (!el) continue;
      const body = p.absorbed ? G.fusion.ctrl : p;
      el.querySelector('.hpfill').style.width = clamp(body.hp / body.ps.maxHp * 100, 0, 100).toFixed(1) + '%';
      const en = body.energy || 0;
      el.querySelector('.enfill').style.width = en.toFixed(1) + '%';
      el.classList.toggle('ult', en >= ENERGY_MAX && !p.down && !p.absorbed);
    }
    const fs = fuseStatus();
    const key = [G.players.map(p => [Math.ceil(p.hp), Math.floor(p.energy || 0), p.form, p.down, p.absorbed, !!p.fusion, p.item, Math.ceil(p.itemCD), Object.values(p.buffs).map(Math.ceil).join('/')].join()).join(';'),
      G.arena && Math.ceil(G.arena.t), G.level, Math.floor(G.t), G.kills, G.dragonBalls, G.sagaIdx,
      Math.floor(powerLevel(G.players[0]) / 10), fs, G.fusion && G.fusion.form, G.fuseReq && Math.ceil(G.fuseReq.t), Math.ceil(G.fuseCD), G.fusion && Math.ceil(G.fusion.t)].join('|');
    if (key !== hudKey) {
      hudKey = key;
      for (const p of G.players) {
        const el = $('pc' + p.idx); if (!el) continue;
        const body = p.absorbed ? G.fusion.ctrl : p, f = curForm(body);
        el.classList.toggle('dim', p.down || p.absorbed);
        el.querySelector('.hptext').textContent = p.down ? 'DOWN' : Math.ceil(Math.max(0, body.hp)) + ' / ' + Math.round(body.ps.maxHp);
        const formEl = el.querySelector('.pc-form');
        formEl.textContent = p.absorbed ? 'Inside ' + FUSIONS[G.fusion.kind].name : f.name;
        formEl.style.setProperty('--c', f.aura || '#c8c4e0');
        el.querySelector('.pc-pwr').textContent = fmt(powerLevel(body));
        const U = ultOf(body), en = Math.floor(body.energy || 0);
        el.querySelector('.entext').textContent = p.absorbed ? U.name : en >= ENERGY_MAX ? U.name + ' \u00b7 ' + ultKeyName(p) : U.name + ' ' + en + '%';
        const it = p.item ? ITEMS[p.item] : null;
        el.querySelector('.pc-extra').innerHTML = (it ? `<span class="chip item" title="${esc(it.info)}"><img src="art/${it.sprite}.png" alt="">${esc(it.name)}${p.item === 'senzu' && p.itemCD > 0 ? ' ' + Math.ceil(p.itemCD) : ''}</span>` : '') +
          [['speed', 'SPD', '#3a8ae8'], ['dex', 'DEX', '#3ac85a'], ['power', 'PWR', '#f08a1a']].filter(([k]) => body.buffs[k] > 0)
            .map(([k, l, c]) => `<span class="chip" style="--c:${c}">${l} ${Math.ceil(body.buffs[k])}</span>`).join('');
      }
      $('lvl').textContent = 'LV ' + G.level;
      $('timer').textContent = mmss(G.t);
      $('saga').textContent = sagaName();
      $('kills').textContent = fmt(G.kills);
      $('dballs').innerHTML = Array.from({ length: 7 }, (_, i) => `<i class="${i < G.dragonBalls ? 'on' : ''}"></i>`).join('');
      const nf = !coop() && nextForm(G.players[0]);
      $('nextform').hidden = coop();
      $('nextform').textContent = nf ? 'Next: ' + nf.name + ' at LV ' + nf.lv : 'Final form reached';
      const fb = $('fusebox');
      fb.hidden = !fs;
      if (fs) {
        let msg = '', cls = '';
        if (G.fusion) { const F = G.fusion, split = !F.other.left && !isBot(F.other); msg = fusionForm().name + ' \u00b7 ' + mmss(F.t) + (split ? ' \u00b7 ' + pName(F.ctrl) + ' aims, ' + pName(F.other) + ' steers' : '') + (F.form < F.maxForm ? ' \u00b7 ' + fuseKeyName(F.ctrl) + ': power up' : ''); cls = 'on'; }
        else if (G.fuseReq) { const o = fusePartner(G.players[G.fuseReq.by]); msg = pName(o) + ': press ' + fuseKeyName(o) + ' to fuse · ' + Math.ceil(G.fuseReq.t); cls = 'req'; }
        else if (fs === 'ready') { msg = G.test ? 'Fusion ready \u00b7 press E' : 'Fusion ready \u00b7 ' + pName(fusePair().goku) + ' ' + fuseKeyName(fusePair().goku) + ' + ' + pName(fusePair().vegeta) + ' ' + fuseKeyName(fusePair().vegeta); cls = 'ready'; }
        else if (fs === 'cooldown') msg = 'Fusion recharging · ' + mmss(G.fuseCD);
        else if (fs === 'locked') msg = 'Fusion: Goku SSJ3 + Majin Vegeta';
        else msg = 'Fusion: both fighters must be standing';
        fb.textContent = msg; fb.className = cls;
      }
    }
    const tk = G.players.map(p => p.active + ':' + p.bonds + ':' + p.slots.map(sl => sl.map(id => id + p.techs[id].lv).join('+')).join(',')).join('|');
    if (tk !== techKey) { techKey = tk; buildSlotBar(); }
    const b = G.arena ? (G.arena.phase === 'fight' ? G.arena.boss : null) : G.boss;
    $('bossbar').hidden = !b;
    if (b) { $('bossname').textContent = b.name + (G.arena ? ' \u00b7 ' + mmss(Math.max(0, G.arena.t)) : ''); $('bossfill').style.width = clamp(b.hp / b.maxHp * 100, 0, 100) + '%'; $('bossbar').style.setProperty('--c', b.color); }
  }
  let bannerTimer = 0;
  function showBanner(title, sub, col) {
    netEvent(['b', title, sub, col]);
    const el = $('banner');
    el.hidden = false; el.style.setProperty('--c', col);
    $('banner-title').textContent = title; $('banner-sub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function toast(msg) {
    netEvent(['t', msg]);
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    const box = $('toasts'); box.appendChild(t); setTimeout(() => t.remove(), 3200);
    while (box.children.length > 4) box.firstChild.remove();
  }

  function pause() {
    if (state !== 'play') return;
    state = 'paused';
    const list = p => p.slots.map((sl, i) => `<li style="--c:${TECHS[sl[0]].color}"><span></span>${i + 1}. ${sl.map(id => TECHS[id].name + ' ' + p.techs[id].lv).join(' + ')}</li>`).join('') +
      Object.entries(p.passives).map(([id, v]) => `<li style="--c:#c8c4e0"><span></span>${PASSIVES[id].name}<b>LV ${v}</b></li>`).join('');
    const forms = p => p.C.forms.map((f, i) => `<li class="${i <= p.form ? 'got' : ''}" style="--c:${f.aura || '#c8c4e0'}">${f.name}<b>LV ${f.lv}</b></li>`).join('');
    if (coop()) {
      $('pause-h1').textContent = 'TEAM'; $('pause-h2').textContent = '';
      const col = ps => ps.map(q => `<li class="tl-head" style="--c:${P_COLORS[q.idx]}">${esc(pName(q))}</li>` + list(q)).join('');
      $('pause-techs').innerHTML = col(G.players.filter((_, i) => i % 2 === 0)); $('pause-forms').innerHTML = col(G.players.filter((_, i) => i % 2 === 1));
    } else {
      $('pause-h1').textContent = 'TECHNIQUES'; $('pause-h2').textContent = 'FORMS';
      $('pause-techs').innerHTML = list(G.players[0]); $('pause-forms').innerHTML = forms(G.players[0]);
    }
    $('pause-forms').classList.toggle('forms', !coop());
    $('pause').hidden = false;
    $('resume').focus();
  }
  function resume() { if (state !== 'paused') return; $('pause').hidden = true; state = 'play'; }

  function gameOver(won) {
    state = 'over';
    const key = G.charIds.join('+'), rec = best[key] || {};
    const score = G.sagaIdx * 1000 + G.t;
    const isBest = !rec.score || score > rec.score;
    if (isBest) { best[key] = { score, saga: G.sagaIdx + (won ? 1 : 0), time: G.t, level: G.level }; try { localStorage.setItem('zs-best', JSON.stringify(best)); } catch (e) { } }
    const names = G.players.map(p => p.C.name).join(' and ');
    $('over-title').textContent = won ? 'Universe saved' : 'Defeated';
    $('over-sub').textContent = won ? 'Broly is down. Every saga cleared as ' + names + '.' : 'Fell during ' + sagaName() + '.' + (isBest ? ' New personal best.' : '');
    const stats = [['Time', mmss(G.t)], ['Level', G.level], ...G.players.map(p => [coop() ? pName(p) : 'Form', p.C.forms[p.form].name]),
      ['Sagas cleared', G.sagaIdx + (won ? 1 : 0)], ['Enemies defeated', fmt(G.kills)], ['Damage dealt', short(G.dmgDealt)], ['Summon tickets', (G.ticketsRun || 0) + ' earned \u00b7 ' + gacha.tickets + ' saved']];
    $('over-stats').innerHTML = stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('endless').hidden = !won;
    $('over').hidden = false; $('levelup').hidden = true;
    ($('endless').hidden ? $('retry') : $('endless')).focus();
    if (isHost()) sendAll({ t: 'over', title: $('over-title').textContent, sub: $('over-sub').textContent, stats: $('over-stats').innerHTML });
  }

  // ------------------------------------------------------------ title
  let mode = 1, chosen = [];
  function portrait(name, cls = '') {
    const a = ART[name];
    if (a && a.hd) return `<span class="spr ${a.frames >= 8 ? 'idle4' : ''} ${cls}" style="background-image:url('art/${name}.png');--n:${a.frames}"></span>`;
    return `<img src="art/${name}.png" alt="" class="${cls}">`;
  }
  function buildTitle() {
    for (let m = 1; m <= 4; m++) { $('mode' + m).classList.toggle('on', mode === m); $('mode' + m).setAttribute('aria-pressed', mode === m); }
    $('pick-label').textContent = mode === 1 ? 'Choose your fighter' : 'Player ' + (chosen.length + 1) + ': choose your fighter';
    $('coop-hint').hidden = mode === 1;
    const box = $('chars'); box.innerHTML = '';
    updateTicketBadge();
    const locked = Object.keys(CHARS).filter(id => !ownsChar(id)).length;
    Object.entries(CHARS).filter(([id]) => ownsChar(id)).forEach(([id, C], i) => {
      const b = document.createElement('button'); b.className = 'char'; b.id = 'char-' + id;
      const rec = best[id];
      const taken = chosen.map((c, k) => c === id ? k : -1).filter(k => k >= 0);
      b.innerHTML = `
        ${taken.length ? `<span class="taken-row">${taken.map(k => `<span class="taken" style="--c:${P_COLORS[k]}">P${k + 1}</span>`).join('')}</span>` : ''}
        <span class="char-art">${portrait(C.forms[C.forms.length - 1].sprite, 'ghost')}${portrait(C.forms[0].sprite)}</span>
        <span class="char-head"><span class="char-name">${C.name}</span>${C.gacha ? `<span class="rar" style="--c:${GACHA.tiers[C.gacha].color}">${C.gacha}</span>` : ''}${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</span>
        <span class="char-title">${C.title}</span>
        <span class="char-perk">${C.perk}</span>
        <span class="char-start">Starts with <b>${TECHS[C.start].name}</b></span>
        <span class="ladder">${C.forms.map(f => `<i style="--c:${f.aura || '#c8c4e0'}" title="${f.name} · LV ${f.lv}">${f.short}</i>`).join('')}</span>
        <span class="char-best">${rec ? 'Best solo: ' + rec.saga + ' saga' + (rec.saga === 1 ? '' : 's') + ' · ' + mmss(rec.time) + ' · LV ' + rec.level : 'No solo runs yet'}</span>`;
      b.onclick = () => pickFighter(id);
      box.appendChild(b);
    });
    if (locked) {
      const b = document.createElement('button'); b.className = 'char summon-card';
      b.innerHTML = `<span class="char-art"><img src="art/cap_item.png" alt=""></span><span class="char-name">${locked} more fighter${locked > 1 ? 's' : ''}</span>
        <span class="char-perk">Summon them with tickets dropped by enemies and bosses.</span><span class="char-start"><b>Open Summon</b></span>`;
      b.onclick = () => { audioInit(); openGacha(); };
      box.appendChild(b);
    }
  }
  function pickFighter(id) {
    audioInit();
    if (mode === 1) { newRun([id]); return; }
    chosen.push(id);
    if (chosen.length === mode) { const ids = chosen; chosen = []; newRun(ids); return; }
    buildTitle();
  }
  function setMode(m) { mode = m; chosen = []; buildTitle(); }
  function toTitle() {
    if (NET.role) leaveRoom(true);
    $('retry').hidden = false; $('menu').textContent = 'Fighters';
    G = null; state = 'title'; chosen = [];
    ['over', 'pause', 'levelup', 'hud', 'banner', 'bond', 'wish', 'lobby', 'netwait'].forEach(id => $(id).hidden = true);
    buildTitle(); $('title').hidden = false;
  }

  // ------------------------------------------------------------ summoning (gacha)
  // Tickets drop from enemies and bosses and are saved in this browser. 5 tickets buy one summon.
  const GACHA_KEY = 'zs-gacha';
  const gacha = { tickets: 0, owned: [] };
  // Sandbox: #summontest gives 10 tickets, #summontest50 gives 50, and so on. Nothing is saved.
  const simMatch = /^#summontest(\d{1,4})?$/.exec(location.hash);
  const SUMMON_SIM = !!simMatch, SIM_TICKETS = simMatch ? Math.max(1, +(simMatch[1] || 10)) : 0;
  if (SUMMON_SIM) gacha.tickets = SIM_TICKETS;
  else try { Object.assign(gacha, JSON.parse(localStorage.getItem(GACHA_KEY) || '{}')); } catch (e) { }
  function saveGacha() { if (SUMMON_SIM) return; try { localStorage.setItem(GACHA_KEY, JSON.stringify(gacha)); } catch (e) { } }
  const ownsChar = id => !CHARS[id].gacha || gacha.owned.includes(id);
  const gachaPool = tier => Object.keys(CHARS).filter(id => CHARS[id].gacha === tier);
  function addTickets(n, quiet) {
    gacha.tickets += n; saveGacha(); updateTicketBadge();
    if (G) G.ticketsRun = (G.ticketsRun || 0) + n;
    if (!quiet) toast('Summon ticket +' + n + ' (' + gacha.tickets + ' saved)');
  }
  function dropTickets(x, y, n) { for (let i = 0; i < n; i++) G.pickups.push({ x: x + rand(-14, 14), y: y + rand(-10, 10), kind: 'ticket', t: 0 }); }
  function updateTicketBadge() {
    const el = $('summon-btn'); if (el) el.innerHTML = `<img src="art/ticket.png" alt=""> Summon <b>${gacha.tickets}</b>`;
    const t = $('g-tix'); if (t) t.textContent = gacha.tickets;
    const one = $('g-pull'), ten = $('g-pull10');
    if (one) { one.disabled = gacha.tickets < GACHA.cost; one.textContent = 'Summon \u00d71 (' + GACHA.cost + ' ticket)'; }
    if (ten) { ten.disabled = gacha.tickets < GACHA.cost * GACHA.multi; ten.textContent = 'Summon \u00d7' + GACHA.multi + ' (' + GACHA.cost * GACHA.multi + ' tickets)'; }
  }
  function openGacha() {
    if (state !== 'title') return;
    $('g-rates').textContent = GACHA.rates.map(([t, r]) => t + ' ' + Math.round(r * 100) + '%').join(' · ');
    $('g-roster').innerHTML = ['LR', 'SSR', 'SR', 'R'].map(tier => gachaPool(tier).map(id => {
      const C = CHARS[id], own = gacha.owned.includes(id);
      return `<div class="g-char ${own ? 'own' : 'locked'}" style="--c:${GACHA.tiers[tier].color}"><span class="rar">${tier}</span>${portrait(C.forms[0].sprite)}<span>${own ? esc(C.name) : '???'}</span></div>`;
    }).join('')).join('');
    updateTicketBadge();
    $('gacha').hidden = false; $('title').hidden = true;
  }
  function closeGacha() { $('gacha').hidden = true; if (state === 'title') { buildTitle(); $('title').hidden = false; } }
  function rollTier() {
    let r = Math.random();
    for (const [tier, p] of GACHA.rates) { r -= p; if (r <= 0) return tier; }
    return 'R';
  }
  const TIER_RANK = { R: 0, SR: 1, SSR: 2, LR: 3 };
  function pull(n) {
    if (gacha.tickets < GACHA.cost * n || revealing) return;
    gacha.tickets -= GACHA.cost * n;
    const results = [];
    for (let i = 0; i < n; i++) {
      const tier = rollTier(), pool = gachaPool(tier), id = pool[(Math.random() * pool.length) | 0];
      const dupe = gacha.owned.includes(id);
      if (!dupe) gacha.owned.push(id);
      results.push({ id, tier, dupe });
    }
    saveGacha(); updateTicketBadge();
    playReveal(results);
  }

  // The reveal: a capsule drops and cracks open. SR adds gold, SSR goes rainbow and cuts to manga panels.
  // A x10 plays once, keyed to its best pull, then lays all ten out.
  let revealing = false, revealTimers = [], revealDone = null;
  function playReveal(results) {
    const R = $('reveal');
    const best = results.reduce((a, r) => TIER_RANK[r.tier] > TIER_RANK[a.tier] ? r : a, results[0]);
    const tier = best.tier, C = CHARS[best.id];
    revealing = true; revealTimers.forEach(clearTimeout); revealTimers = [];
    R.className = 'tier-' + tier + (results.length > 1 ? ' multi' : ''); R.hidden = false;
    R.style.setProperty('--c', GACHA.tiers[tier].color);
    $('rv-tier').textContent = tier;
    $('rv-komas').innerHTML = '';
    if (results.length === 1) {
      $('rv-art').innerHTML = portrait(C.forms[C.forms.length - 1].sprite) + portrait(C.forms[0].sprite);
      $('rv-rarity').textContent = tier;
      $('rv-name').textContent = C.name;
      $('rv-note').textContent = best.dupe ? 'Already in your roster' : 'New fighter unlocked: ' + C.title;
    } else {
      $('rv-multi').innerHTML = `<div class="rv-multi-title">Summon \u00d7${results.length}</div><div class="rv-grid">` + results.map((r, i) => {
        const c = CHARS[r.id];
        return `<div class="rv-tile t-${r.tier}" style="--c:${GACHA.tiers[r.tier].color};--d:${i * 0.09}s"><span class="rar">${r.tier}</span>${portrait(c.forms[0].sprite)}<span class="rv-tile-name">${esc(c.name)}</span><span class="rv-tile-note">${r.dupe ? 'Duplicate' : 'NEW'}</span></div>`;
      }).join('') + '</div>';
    }
    const at = (ms, fn) => revealTimers.push(setTimeout(fn, ms));
    const phase = p => { R.dataset.phase = p; };
    phase('drop'); sfx('pick');
    let t = 1100;
    at(t, () => { phase('crack'); sfx(tier === 'R' ? 'level' : 'transform'); });
    t += tier === 'R' ? 500 : 900;
    if (tier === 'LR') {   // Legendary Rare: the Dragon Ball intro manga, panel by panel, then the logo
      $('rv-lr').innerHTML = '';
      at(t, () => { phase('lr'); sfx('boss'); });
      t += 300;
      for (let i = 0; i < LR_PANELS; i++) {
        const last = i === LR_PANELS - 1;
        at(t, () => {
          const img = document.createElement('img');
          img.src = 'art/lr/p' + i + '.webp'; img.alt = ''; img.className = 'lrp' + (last ? ' logo' : '') + ' s' + (i % 4);
          $('rv-lr').appendChild(img); sfx(last ? 'transform' : 'hit'); if (!last) sfx('boom');
        });
        t += last ? 1600 : 620;
      }
      at(t, () => { phase('ssr'); sfx('boss'); });
      t += 1400;
    }
    if (tier === 'SSR') {
      at(t, () => { phase('ssr'); sfx('boss'); });
      t += 1300;
      const komas = C.komas || [];
      komas.forEach((k, i) => at(t + i * 650, () => {
        phase('komas');
        const img = document.createElement('img');
        img.src = 'art/komas/k' + k + '.png'; img.alt = ''; img.className = 'koma k' + i;
        $('rv-komas').appendChild(img); sfx('hit'); sfx('boom');
      }));
      t += komas.length * 650 + 900;
    }
    at(t, () => { phase('card'); sfx('level'); revealDone = true; });
    revealDone = false;
  }
  function revealClick() {
    if (!revealing) return;
    if (!revealDone) { revealTimers.forEach(clearTimeout); revealTimers = []; $('reveal').dataset.phase = 'card'; revealDone = true; return; }
    revealing = false; $('reveal').hidden = true; openGacha();
  }
  $('reveal').addEventListener('click', revealClick);
  $('g-pull').onclick = () => pull(1);
  $('g-pull10').onclick = () => pull(GACHA.multi);
  $('g-close').onclick = closeGacha;
  $('g-refill').hidden = !SUMMON_SIM;
  $('g-sim').hidden = !SUMMON_SIM;
  $('g-refill').textContent = 'Refill ' + SIM_TICKETS + ' tickets';
  $('g-sim').textContent = 'Summon simulator: ' + SIM_TICKETS + ' practice tickets. Nothing you spend or unlock here is saved.';
  $('g-refill').onclick = () => { gacha.tickets = SIM_TICKETS; gacha.owned = []; openGacha(); toast('Simulator reset: ' + SIM_TICKETS + ' tickets, empty roster'); };
  $('summon-btn').onclick = () => { audioInit(); openGacha(); };

  function onKey(e) {
    const c = e.code;
    if (c === 'KeyM') { muted = !muted; toast(muted ? 'Sound off' : 'Sound on'); return; }
    const digit = /^(Digit|Numpad)([1-9])$/.exec(c);
    if (!$('lobby').hidden) return;
    if ((state === 'intro' || state === 'transform') && c !== 'KeyM' && skipCinematic()) return;
    if (isClient()) { clientKey(c, digit); return; }
    if (!$('gacha').hidden || !$('reveal').hidden) { if (!$('reveal').hidden && (c === 'Space' || c === 'Enter')) revealClick(); else if (c === 'Escape' && !$('gacha').hidden && $('reveal').hidden) closeGacha(); return; }
    const roster = Object.keys(CHARS).filter(ownsChar);
    if (state === 'title' && digit && roster[+digit[2] - 1]) { pickFighter(roster[+digit[2] - 1]); return; }
    if (state === 'levelup' && digit && +digit[2] <= 3) { choose(+digit[2] - 1); return; }
    if (state === 'bond') { bondKey(c, digit); return; }
    if (state === 'wish') { if (digit) chooseWish(+digit[2] - 1); return; }
    if (c === 'Escape' || c === 'KeyP') { if (state === 'play') pause(); else if (state === 'paused') resume(); return; }
    if (state === 'play' && G && isHost()) {   // online host: this keyboard only drives P1
      if (FUSE_KEYS.flat().includes(c)) fusePressed(G.players[0]);
      if (c === 'KeyQ') castUltimate(G.players[0]);
      if (digit) selectSlot(G.players[0], +digit[2] - 1);
      if (c === 'KeyB') openBond(G.players[0]);
      return;
    }
    if (state === 'play' && G) {
      if (G.test && (FUSE_KEYS[0].includes(c) || FUSE_KEYS[1].includes(c))) fusePressed(G.players[0]);
      else if (FUSE_KEYS[0].includes(c) && G.players[0]) fusePressed(G.players[0]);
      else if (FUSE_KEYS[1].includes(c) && G.players[1]) fusePressed(G.players[1]);
      else if (FUSE_KEYS[2].includes(c) && G.players[2]) fusePressed(G.players[2]);
      if (c === 'KeyQ') castUltimate(G.players[0]);
      if ((c === 'NumpadDecimal' || c === 'Period') && G.players[1] && !G.test) castUltimate(G.players[1]);
      if (c === 'KeyN' && G.players[2]) castUltimate(G.players[2]);
      const p3 = G.players[2];
      if (p3 && (c === 'KeyU' || c === 'KeyO')) selectSlot(p3, (p3.active + (c === 'KeyO' ? 1 : -1) + p3.slots.length) % p3.slots.length);
      if (p3 && c === 'KeyH') openBond(p3);
      if (G.test && c === 'KeyR') { G.fuseCD = 0; toast('Test: fusion cooldown reset'); }
      if (digit) selectSlot(G.players[digit[1] === 'Numpad' && coop() && !G.test ? 1 : 0], +digit[2] - 1);
      if (c === 'KeyB') openBond(G.players[0]);
      if (c === 'NumpadAdd' && coop()) openBond(G.players[1]);
    }
  }
  for (let m = 1; m <= 4; m++) $('mode' + m).onclick = () => setMode(m);
  $('resume').onclick = resume;
  $('quit').onclick = toTitle;
  $('retry').onclick = () => newRun(G.charIds);
  $('menu').onclick = () => toTitle();
  $('pausebtn').onclick = () => { if (isClient()) sendHost({ t: 'pause' }); else pause(); };
  $('endless').onclick = () => { G.endless = true; $('over').hidden = true; state = 'play'; nextSaga(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !NET.role) pause(); });

  // ------------------------------------------------------------ online co-op
  // The host's browser runs the real game. Guests send their inputs and receive ~15 snapshots a second,
  // which they draw locally (terrain is generated locally from the same seeds). PeerJS brokers the
  // peer-to-peer connection; GitHub Pages only has to serve the files.
  const NET = { role: null, peer: null, code: '', seats: [], conn: null, me: 0, inputs: {}, events: [], sendT: 0, inT: 0, started: false, bondOpen: false, eid: 0, lastSnap: 0 };
  const isClient = () => NET.role === 'client';
  const isHost = () => NET.role === 'host' && NET.started;
  const ROOM_PREFIX = 'zsurvivors-room-';
  function roomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; }
  function netEvent(ev) { if (isHost()) NET.events.push(ev); }
  function sendTo(idx, msg) { const s = NET.seats[idx]; if (s && s.conn && s.conn.open) s.conn.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); }
  function sendAll(msg) { for (let i = 1; i < NET.seats.length; i++) sendTo(i, msg); }
  function sendHost(msg) { if (NET.conn && NET.conn.open) NET.conn.send(JSON.stringify(msg)); }
  function lobbyStatus(t) { $('lobby-status').textContent = t; }
  function netAvailable() {
    if (window.Peer) return true;
    toast('Online play needs the PeerJS library, which failed to load. Check your internet connection.');
    return false;
  }

  // ---- lobby
  function hostRoom() {
    if (!netAvailable()) return;
    audioInit();
    leaveRoom(true);
    NET.role = 'host'; NET.code = roomCode(); NET.seats = [{ pick: null, local: true }]; NET.started = false;
    showLobby();
    lobbyStatus('Opening a room...');
    const peer = new Peer(ROOM_PREFIX + NET.code.toLowerCase(), { debug: 0 });
    NET.peer = peer;
    peer.on('open', () => { lobbyStatus('Share the code with up to three friends. Everyone picks a fighter, then press Start.'); renderLobby(); });
    peer.on('connection', conn => {
      conn.on('open', () => {
        if (NET.started || NET.seats.length >= 4) { conn.send(JSON.stringify({ t: 'full', why: NET.started ? 'That game has already started.' : 'That room is full.' })); setTimeout(() => conn.close(), 300); return; }
        NET.seats.push({ pick: null, conn });
        conn.on('data', msg => hostMsg(NET.seats.findIndex(s => s.conn === conn), msg));
        conn.on('close', () => seatLeft(conn));
        broadcastLobby();
      });
    });
    peer.on('error', e => {
      if (e.type === 'unavailable-id') { peer.destroy(); hostRoom(); return; }   // code collision: roll a new one
      lobbyStatus('Connection problem: ' + (e.type || e.message) + '. Try again in a moment.');
    });
  }
  function joinRoom(code) {
    if (!netAvailable()) return;
    code = (code || '').trim().toUpperCase();
    if (code.length !== 5) { toast('Room codes are 5 letters'); return; }
    audioInit();
    leaveRoom(true);
    NET.role = 'client'; NET.code = code; NET.started = false;
    showLobby();
    lobbyStatus('Connecting to room ' + code + '...');
    const peer = new Peer(undefined, { debug: 0 });
    NET.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code.toLowerCase(), { serialization: 'raw', reliable: true });
      NET.conn = conn;
      conn.on('open', () => lobbyStatus('Connected. Pick your fighter; the host starts the game.'));
      conn.on('data', clientMsg);
      conn.on('close', () => { if (NET.role === 'client') { leaveRoom(true); toTitle(); toast('Disconnected from the host'); } });
    });
    peer.on('error', e => {
      lobbyStatus(e.type === 'peer-unavailable' ? 'No room with code ' + code + '. Check the code with your host.' : 'Connection problem: ' + (e.type || e.message));
    });
  }
  function leaveRoom(quiet) {
    if (NET.role === 'host') sendAll({ t: 'closed' });
    if (NET.conn) try { NET.conn.close(); } catch (e) { }
    if (NET.peer) try { NET.peer.destroy(); } catch (e) { }
    Object.assign(NET, { role: null, peer: null, conn: null, seats: [], started: false, inputs: {}, events: [], bondOpen: false });
    $('lobby').hidden = true; $('netwait').hidden = true;
    if (!quiet) toTitle();
  }
  function seatLeft(conn) {
    const i = NET.seats.findIndex(s => s.conn === conn);
    if (i < 0 || NET.seats[i].gone) return;
    if (!NET.started) { NET.seats.splice(i, 1); broadcastLobby(); return; }
    NET.seats[i].gone = true; NET.inputs[i] = { x: 0, y: 0 };
    if (G && G.players[i]) { toast(pName(G.players[i]) + ' disconnected'); G.players[i].left = true; }
  }
  function broadcastLobby() {
    renderLobby();
    NET.seats.forEach((s, i) => { if (i) sendTo(i, { t: 'lobby', code: NET.code, you: i, seats: NET.seats.map(q => ({ pick: q.pick })) }); });
  }
  function showLobby() { $('title').hidden = true; $('lobby').hidden = false; $('room-code').textContent = NET.code || '-----'; renderLobby(); }
  function renderLobby(seats = NET.seats, me = NET.role === 'host' ? 0 : NET.me) {
    $('room-code').textContent = NET.code;
    $('lobby-seats').innerHTML = seats.map((s, i) => `<li style="--c:${P_COLORS[i]}"><span></span><b class="seat">P${i + 1}</b> ${s.pick ? esc(CHARS[s.pick].name) : '<i>choosing...</i>'}${i === 0 ? ' · host' : ''}${i === me ? ' · you' : ''}</li>`).join('') +
      Array.from({ length: 4 - seats.length }, (_, k) => `<li class="open"><span></span><b class="seat">P${seats.length + k + 1}</b> open seat</li>`).join('');
    const mine = seats[me] && seats[me].pick;
    $('lobby-picks').innerHTML = Object.entries(CHARS).filter(([id]) => ownsChar(id)).map(([id, C]) =>
      `<button class="lpick ${mine === id ? 'on' : ''}" data-id="${id}">${portrait(C.forms[0].sprite)}<span>${C.name}</span></button>`).join('');
    const start = $('lobby-start');
    start.hidden = NET.role !== 'host';
    start.disabled = !seats.every(s => s.pick);
    start.textContent = seats.every(s => s.pick) ? 'Start (' + seats.length + ' player' + (seats.length > 1 ? 's' : '') + ')' : 'Waiting for picks';
  }
  $('lobby-picks').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (NET.role === 'host') { NET.seats[0].pick = b.dataset.id; broadcastLobby(); }
    else { sendHost({ t: 'pick', id: b.dataset.id }); NET.lobby && (NET.lobby.seats[NET.me].pick = b.dataset.id) && renderLobby(NET.lobby.seats, NET.me); }
  });
  $('lobby-start').onclick = () => {
    if (NET.role !== 'host' || !NET.seats.every(s => s.pick)) return;
    NET.started = true; NET.inputs = {};
    $('lobby').hidden = true;
    newRun(NET.seats.map(s => s.pick));
    NET.seats.forEach((s, i) => { if (i) sendTo(i, { t: 'start', you: i }); });
  };
  $('lobby-leave').onclick = () => leaveRoom(false);
  $('host-btn').onclick = hostRoom;
  $('join-btn').onclick = () => joinRoom($('join-code').value);
  $('join-code').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') joinRoom($('join-code').value); });
  $('copy-code').onclick = () => {
    const done = () => toast('Room code copied');
    try { navigator.clipboard.writeText(NET.code).then(done, () => toast('Copy failed: the code is ' + NET.code)); } catch (e) { toast('The code is ' + NET.code); }
  };

  // ---- host side
  function hostMsg(i, m) {
    if (i < 1) return;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }
    NET.seats[i].seen = performance.now();
    if (m.t === 'pick' && !NET.started && CHARS[m.id]) { NET.seats[i].pick = m.id; broadcastLobby(); return; }
    if (!isHost() || !G) return;
    const p = G.players[i]; if (!p) return;
    if (m.t === 'in') NET.inputs[i] = { x: clamp(+m.x || 0, -1, 1), y: clamp(+m.y || 0, -1, 1) };
    else if (m.t === 'slot') selectSlot(p, m.i | 0, true);
    else if (m.t === 'fuse') fusePressed(p);
    else if (m.t === 'ult') castUltimate(p);
    else if (m.t === 'bond' && Array.isArray(m.sel)) mergeSlots(p, m.sel.map(x => x | 0));
    else if (m.t === 'choose' && state === 'levelup' && pickPlayer === p) choose(m.i | 0, true);
    else if (m.t === 'wish' && state === 'wish' && G.players[G.wishOrder[G.wishIdx]] === p) chooseWish(m.i | 0, true);
    else if (m.t === 'pause' && state === 'play') { pause(); toast(pName(p) + ' paused the game'); }
    else if (m.t === 'resume') resume();
  }
  function snapshot(seat, events) {
    const names = [], nameIx = new Map();
    const nx = s => { let k = nameIx.get(s); if (k === undefined) { k = names.length; names.push(s); nameIx.set(s, k); } return k; };
    const me = G.players[seat], body = me && me.absorbed && G.fusion ? G.fusion.ctrl : me;
    const view = body ? body.idx : -1, mine = o => o.own === undefined || o.own === view;
    const r = v => Math.round(v * 10) / 10, cx = body ? body.x : G.cx, cy = body ? body.y : G.cy;
    const near = (o, R) => Math.abs(o.x - cx) < R && Math.abs(o.y - cy) < R;
    for (const e of G.enemies) if (!e.id) e.id = ++NET.eid;
    const boss = G.arena ? (G.arena.phase === 'fight' ? G.arena.boss : null) : G.boss;
    return {
      t: 's', st: state, gt: r(G.t), lv: G.level, xp: r(G.xp), xn: G.xpNext, sg: G.sagaIdx, k: G.kills, db: G.dragonBalls, ds: Math.round(G.dmgDealt),
      cx: r(cx), cy: r(cy), sh: r(G.shake), fl: r(G.flash), fc: G.flashCol, wt: r(G.wishT || 0), wf: r(G.wishFade || 0), fcd: r(G.fuseCD),
      req: G.fuseReq ? [G.fuseReq.by, r(G.fuseReq.t)] : null, test: !!G.test,
      fus: G.fusion ? [G.fusion.kind, G.fusion.ctrl.idx, G.fusion.other.idx, r(G.fusion.t), G.fusion.form, G.fusion.maxForm, G.fusion.aim ? [r(G.fusion.aim[0]), r(G.fusion.aim[1])] : 0] : null,
      wait: netWaitText(),
      boss: boss && !boss.dead ? [boss.id, boss.name, boss.color, Math.round(boss.hp), Math.round(boss.maxHp)] : null,
      rift: G.rift ? [r(G.rift.x), r(G.rift.y), r(G.rift.t), r(G.rift.ph)] : null,
      ar: G.arena ? [G.arena.cx, G.arena.cy, G.arena.R, r(G.arena.t), G.arena.phase, G.arena.exit ? [G.arena.exit.x, G.arena.exit.y] : null, G.arena.def.color, G.arena.def.name] : null,
      pl: G.players.map(p => [p.idx, p.charId, r(p.x), r(p.y), Math.round(p.hp), p.form, (p.down ? 1 : 0) | (p.absorbed ? 2 : 0) | (p.moving ? 4 : 0), p.face, r(p.iframe), r(p.hurtT),
        { maxHp: Math.round(p.ps.maxHp), might: r(p.ps.might * 100) / 100, area: p.ps.area, speed: r(p.ps.speed), dodge: p.ps.dodge, armor: p.ps.armor, cd: p.ps.cd, magnet: p.ps.magnet, xp: p.ps.xp },
        [r(p.buffs.speed), r(p.buffs.dex), r(p.buffs.power)], p.item, r(p.itemCD), p.slots, p.active, p.bonds,
        Object.fromEntries(Object.entries(p.techs).map(([id, v]) => [id, v.lv])), r(p.reviveT), p.wish, Math.round(p.energy || 0)]),
      en: G.enemies.filter(e => !e.dead && (e.boss || near(e, 520))).map(e => [e.id, Math.round(e.x), Math.round(e.y), nx(e.s), e.scale || 1, e.flash > 0 ? 1 : 0, e.boss ? 1 : 0,
        e.color || '', r(e.ph), e.face || 1, e.act ? [e.act.type, r(e.act.t), r(e.act.ang || 0), e.act.moved ? 1 : 0, e.act.hit ? 1 : 0] : 0]),
      nm: names,
      ob: G.orbs.filter(o => near(o, 460)).flatMap(o => [Math.round(o.x), Math.round(o.y), r(o.v)]),
      pk: G.pickups.map(k => [Math.round(k.x), Math.round(k.y), k.kind, k.cap || '', r(k.t), r(k.prog || 0)]),
      sh2: G.shots.filter(s => mine(s) && near(s, 500)).map(s => [Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), r(s.r), s.col, s.core, s.style || '', s.trail ? s.trail.filter((_, i) => i % 2 === 0).map(q => [Math.round(q[0]), Math.round(q[1])]) : 0]),
      bm: G.beams.filter(mine).map(b => [b.src.idx, r(b.ang * 100) / 100, Math.round(b.len), r(b.width), r(b.life), r(b.max), r(b.grow), b.col, b.core, b.style || '', b.spiral || '']),
      bb: G.bombs.filter(mine).map(b => [Math.round(b.x), Math.round(b.y), r(b.size * (b.chargeMax > 0 ? clamp(1 - b.charge / b.chargeMax, 0.15, 1) : 1)), b.col, b.core]),
      hz: G.hz.filter(mine).map(h => [Math.round(h.x), Math.round(h.y), h.col, h.core, h.ghost ? 1 : 0]),
      es: G.eshots.filter(s => near(s, 500)).map(s => [Math.round(s.x), Math.round(s.y), Math.round(s.vx), Math.round(s.vy), s.r, s.col, s.big ? 1 : 0]),
      fx: G.fx.filter(f => mine(f) && near(f, 520)).map(f => [f.type, Math.round(f.x), Math.round(f.y), Math.round(f.r || 0), r(f.life), r(f.max), f.col || '', f.core || '', Math.round(f.x2 || 0), Math.round(f.y2 || 0)]),
      tx: G.texts.filter(t => mine(t) && near(t, 420)).slice(-45).map(t => [Math.round(t.x), Math.round(t.y), t.s, t.col, r(t.life), t.max, t.big ? 1 : 0]),
      ev: events,
    };
  }
  function netWaitText() {
    if (state === 'levelup' && pickPlayer) return pName(pickPlayer) + ' is choosing a card...';
    if (state === 'wish' && G.wishOrder) return pName(G.players[G.wishOrder[G.wishIdx]]) + ' is making a wish...';
    if (state === 'paused') return 'Game paused. Press Esc to resume.';
    if (state === 'bond' && bondP) return pName(bondP) + ' is bonding techniques...';
    return '';
  }
  function hostNetTick() {
    if (!isHost() || !G) return;
    const now = performance.now();
    // Heartbeat. Guests answer every snapshot, but a background tab can still go quiet for a while,
    // so a silent guest only stops moving; they're dropped once the link has closed or after a long silence.
    for (let i = 1; i < NET.seats.length; i++) {
      const s = NET.seats[i];
      if (!s.seen) s.seen = now;
      const quiet = now - s.seen;
      if (s.gone) continue;
      if (quiet > 1500) NET.inputs[i] = { x: 0, y: 0 };
      if (quiet > 45000 || (s.conn && !s.conn.open && quiet > 5000)) { seatLeft(s.conn); try { s.conn.close(); } catch (e) { } }
    }
    if (now - NET.lastSnap < 66) return;
    NET.lastSnap = now;
    const events = NET.events.splice(0);
    for (let i = 1; i < NET.seats.length; i++) {
      const s = NET.seats[i];
      if (!s.conn || !s.conn.open || s.gone) continue;
      s.ev = (s.ev || []).concat(events).slice(-200);   // events wait for the next snapshot this guest actually gets
      const dc = s.conn.dataChannel;
      if (dc && dc.bufferedAmount > 256 * 1024) continue;   // this guest's link is backed up: skip a frame rather than pile up stale ones
      s.conn.send(JSON.stringify(snapshot(i, s.ev)));
      s.ev = [];
    }
    const w = netWaitText(), local = (state === 'levelup' && pickPlayer && !pickPlayer.remote) || (state === 'wish' && !G.players[G.wishOrder[G.wishIdx]].remote) || state === 'paused' || (state === 'bond' && bondP && !bondP.remote);
    showWait(local ? '' : w);
  }
  function showWait(t) { const el = $('netwait'); el.hidden = !t; if (t && el.textContent !== t) el.textContent = t; }

  // ---- guest side
  function clientMsg(m) {
    NET.lastRecv = performance.now();
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }
    if (m.t === 'lobby') { NET.me = m.you; NET.lobby = m; NET.code = m.code; renderLobby(m.seats, m.you); return; }
    if (m.t === 'full') { lobbyStatus(m.why); return; }
    if (m.t === 'closed') { leaveRoom(true); toTitle(); toast('The host closed the room'); return; }
    if (m.t === 'start') { NET.me = m.you; NET.started = true; $('lobby').hidden = true; $('title').hidden = true; G = null; return; }
    if (m.t === 's') { applySnapshot(m); if (performance.now() - (NET.lastIn || 0) > 250) sendInput(); return; }
    if (m.t === 'lvl') { showRemoteCards(m); return; }
    if (m.t === 'wishes') { showRemoteWishes(m); return; }
    if (m.t === 'over') { showRemoteOver(m); return; }
  }
  function makeClientG() {
    return { client: true, t: 0, sagaIdx: 0, sagaT: 0, ults: [], enemies: [], shots: [], eshots: [], beams: [], bombs: [], hz: [], fx: [], parts: [], texts: [], orbs: [], pickups: [],
      players: [], level: 1, xp: 0, xpNext: 10, kills: 0, dragonBalls: 0, dmgDealt: 0, shake: 0, flash: 0, flashCol: '#fff', cx: 0, cy: 0, fusion: null, fuseReq: null, fuseCD: 0,
      boss: null, arena: null, rift: null, capsTaken: new Set(), capsSpawned: new Set(), picks: [], charIds: [], enemyMap: new Map(), wishT: 0, wishFade: 0 };
  }
  function applySnapshot(S) {
    if (!G || !G.client) {
      G = makeClientG();
      $('hud').hidden = false; $('title').hidden = true; $('lobby').hidden = true;
      hudKey = ''; techKey = '';
    }
    const fresh = G.players.length !== S.pl.length;
    state = S.st;
    Object.assign(G, { t: S.gt, level: S.lv, xp: S.xp, xpNext: S.xn, sagaIdx: S.sg, kills: S.k, dragonBalls: S.db, dmgDealt: S.ds, shake: S.sh, flash: S.fl, flashCol: S.fc,
      wishT: S.wt, wishFade: S.wf, fuseCD: S.fcd, test: S.test || null });
    G.fuseReq = S.req ? { by: S.req[0], t: S.req[1] } : null;
    // players
    S.pl.forEach(a => {
      const [idx, cid, x, y, hp, form, flags, face, iframe, hurtT, ps, buffs, item, itemCD, slots, active, bonds, techs, reviveT, wish, energy] = a;
      let p = G.players[idx];
      if (!p || p.charId !== cid) { p = G.players[idx] = makePlayer(idx, cid, x); p.y = y; p.tx = x; p.ty = y; }
      p.tx = x; p.ty = y;
      if (Math.hypot(p.x - x, p.y - y) > 140) { p.x = x; p.y = y; }   // teleports (rifts, fusion) snap
      Object.assign(p, { hp, form, down: !!(flags & 1), absorbed: !!(flags & 2), moving: !!(flags & 4), face, iframe, hurtT, ps, item, itemCD, slots, active, bonds, reviveT, wish, energy: energy || 0 });
      p.buffs = { speed: buffs[0], dex: buffs[1], power: buffs[2] };
      const old = p.techs; p.techs = {};
      for (const id in techs) p.techs[id] = { lv: techs[id], ang: old[id] ? old[id].ang : 0, ct: [] };
    });
    G.players.length = S.pl.length;
    if (fresh) buildPlayerCards();
    for (const p of G.players) p.fusion = null;
    if (S.fus) {
      const [kind, c, o, t, form, maxForm, aim] = S.fus;
      G.fusion = { kind, ctrl: G.players[c], other: G.players[o], t, form, maxForm, aim: aim || null };
      G.players[c].fusion = G.fusion;
    } else G.fusion = null;
    // enemies keep identity between snapshots so they can glide
    const seen = new Set(), list = [];
    for (const a of S.en) {
      const [id, x, y, si, scale, flash, boss, color, ph, face, act] = a;
      let e = G.enemyMap.get(id);
      if (!e) { e = { id, x, y }; G.enemyMap.set(id, e); }
      Object.assign(e, { tx: x, ty: y, s: S.nm[si], scale, flash: flash ? 0.1 : 0, boss: !!boss, color, ph, face, r: 6 * scale,
        act: act ? { type: act[0], t: act[1], ang: act[2], moved: !!act[3], hit: !!act[4] } : null });
      seen.add(id); list.push(e);
    }
    for (const id of G.enemyMap.keys()) if (!seen.has(id)) G.enemyMap.delete(id);
    G.enemies = list;
    G.boss = null;
    if (S.boss) { const b = G.enemyMap.get(S.boss[0]) || { x: G.cx, y: G.cy - 999 }; Object.assign(b, { name: S.boss[1], color: S.boss[2], hp: S.boss[3], maxHp: S.boss[4] }); G.boss = b; }
    G.rift = S.rift ? { x: S.rift[0], y: S.rift[1], t: S.rift[2], ph: S.rift[3] } : null;
    G.arena = S.ar ? { cx: S.ar[0], cy: S.ar[1], R: S.ar[2], t: S.ar[3], phase: S.ar[4], exit: S.ar[5] ? { x: S.ar[5][0], y: S.ar[5][1] } : null, def: { color: S.ar[6], name: S.ar[7] }, boss: G.boss } : null;
    if (G.arena) G.boss = null;
    G.orbs = []; for (let i = 0; i < S.ob.length; i += 3) G.orbs.push({ x: S.ob[i], y: S.ob[i + 1], v: S.ob[i + 2] });
    G.pickups = S.pk.map(a => ({ x: a[0], y: a[1], kind: a[2], cap: a[3] || undefined, t: a[4], prog: a[5] || 0 }));
    G.shots = S.sh2.map(a => ({ x: a[0], y: a[1], vx: a[2], vy: a[3], r: a[4], col: a[5], core: a[6], style: a[7] || undefined, trail: a[8] || undefined }));
    G.beams = S.bm.map(a => ({ src: G.players[a[0]], ang: a[1], len: a[2], width: a[3], life: a[4], max: a[5], grow: a[6], col: a[7], core: a[8], style: a[9] || undefined, spiral: a[10] || undefined }));
    G.bombs = S.bb.map(a => ({ x: a[0], y: a[1], size: a[2], charge: 0, chargeMax: 0, col: a[3], core: a[4] }));
    G.hz = S.hz.map(a => ({ x: a[0], y: a[1], col: a[2], core: a[3], ghost: !!a[4] }));
    G.eshots = S.es.map(a => ({ x: a[0], y: a[1], vx: a[2], vy: a[3], r: a[4], col: a[5], big: !!a[6] }));
    G.fx = S.fx.map(a => ({ type: a[0], x: a[1], y: a[2], r: a[3], life: a[4], max: a[5], col: a[6], core: a[7] || undefined, x2: a[8], y2: a[9] }));
    G.texts = S.tx.map(a => ({ x: a[0], y: a[1], s: a[2], col: a[3], life: a[4], max: a[5], big: !!a[6] }));
    for (const ev of S.ev) {
      if (ev[0] === 'b') showBanner(ev[1], ev[2], ev[3]);
      else if (ev[0] === 't') toast(ev[1]);
      else if (ev[0] === 's') sfx(ev[1]);
      else if (ev[0] === 'p') burst(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6]);
      else if (ev[0] === 'tk') addTickets(ev[1]);
      else if (ev[0] === 'bi') showIntro(ev[1]);
      else if (ev[0] === 'ci') showCutin(ev[1]);
      else if (ev[0] === 'clip') { preloadClip(); playClip(); }
      else if (ev[0] === 'clipx') hideClip();
    }
    // overlays that belong to the host's state
    if (state !== 'levelup') $('levelup').hidden = true;
    if (state !== 'wish') $('wish').hidden = true;
    if (state !== 'over') $('over').hidden = true;
    if (state !== 'intro') hideIntro();
    if (state !== 'transform') hideClip();
    const myTurn = (state === 'levelup' && !$('levelup').hidden) || (state === 'wish' && !$('wish').hidden);
    showWait(myTurn ? '' : S.wait);
  }
  function myBody() { const me = G && G.players[NET.me]; if (!me) return null; return me.absorbed && G.fusion ? G.fusion.ctrl : me; }
  function clientTick(dt) {
    if (NET.started && performance.now() - (NET.lastRecv || performance.now()) > 30000) { leaveRoom(true); toTitle(); toast('Lost the connection to the host'); return; }
    if (!G || !G.client) return;
    G.t += dt; if (state === 'wish') G.wishT += dt;
    const me = G.players[NET.me], body = myBody();
    const [ix, iy] = localInput(body || me);
    for (const p of G.players) {
      if (p === body && state === 'play' && !p.down) {   // predict our own movement, then ease toward the host's answer
        const sp = me.fusion ? 0 : moveSpeed(p);   // a fusion's shooter aims; the partner does the walking
        p.x += ix * sp * dt; p.y += iy * sp * dt;
        p.x += (p.tx - p.x) * Math.min(1, dt * 4); p.y += (p.ty - p.y) * Math.min(1, dt * 4);
        if (ix && sp) p.face = ix > 0 ? 1 : -1;
      } else { p.x += (p.tx - p.x) * Math.min(1, dt * 12); p.y += (p.ty - p.y) * Math.min(1, dt * 12); }
      p.anim += dt; p.hurtT -= dt; p.iframe -= dt;
      for (const id in p.techs) p.techs[id].ang += dt * 1.6;
    }
    for (const e of G.enemies) { e.x += (e.tx - e.x) * Math.min(1, dt * 12); e.y += (e.ty - e.y) * Math.min(1, dt * 12); e.ph += dt; }
    for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
    for (const s of G.eshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
    for (const b of G.beams) b.life -= dt;
    if (G.fuseReq) G.fuseReq.t -= dt;
    updateFx(dt);
    if (body) { G.cx = body.x; G.cy = body.y; }
    // send input ~20 times a second (and in reply to each snapshot, which keeps a background tab alive)
    NET.ix = ix; NET.iy = iy;
    NET.inT -= dt;
    if (NET.inT <= 0) sendInput();
  }
  function sendInput() {
    NET.inT = 0.05; NET.lastIn = performance.now();
    sendHost({ t: 'in', x: Math.round((NET.ix || 0) * 100) / 100, y: Math.round((NET.iy || 0) * 100) / 100 });
  }
  function showRemoteCards(m) {
    const box = $('cards'); box.innerHTML = '';
    m.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.id = 'card' + i;
      b.innerHTML = `<span class="orb" style="--c:${o.col}"></span><span class="card-body"><span class="card-top"><span class="card-name"></span><span class="tag ${o.tag === 'NEW' ? 'new' : ''}">${esc(o.tag)}</span></span><span class="card-desc"></span></span><kbd>${i + 1}</kbd>`;
      b.querySelector('.card-name').textContent = o.name;
      b.querySelector('.card-desc').textContent = o.desc;
      b.onclick = () => remoteChoose(i);
      box.appendChild(b);
    });
    curOpts = m.opts;
    $('lvl-title').textContent = m.title; $('lvl-who').hidden = false; $('lvl-who').textContent = 'Your pick'; $('lvl-who').style.setProperty('--c', P_COLORS[NET.me]);
    $('levelup').hidden = false; showWait('');
    cardFocus = 0; setTimeout(() => $('card0') && $('card0').focus(), 30);
  }
  function remoteChoose(i) { if ($('levelup').hidden || !curOpts[i]) return; sendHost({ t: 'choose', i }); $('levelup').hidden = true; }
  function showRemoteWishes(m) {
    $('wish-sub').textContent = m.sub;
    const box = $('wish-list'); box.innerHTML = '';
    m.list.forEach((w, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.id = 'wish' + i; b.disabled = !w.ok;
      b.innerHTML = `<span class="orb" style="--c:#ff9a1a"></span><span class="card-body"><span class="card-top"><span class="card-name"></span>${w.used ? '<span class="tag">GRANTED</span>' : ''}</span><span class="card-desc"></span></span><kbd>${i + 1}</kbd>`;
      b.querySelector('.card-name').textContent = w.name;
      b.querySelector('.card-desc').textContent = w.info;
      b.onclick = () => remoteWish(i);
      box.appendChild(b);
    });
    NET.wishOk = m.list.map(w => w.ok);
    $('wish').hidden = false; showWait('');
  }
  function remoteWish(i) { if ($('wish').hidden || !NET.wishOk || !NET.wishOk[i]) return; sendHost({ t: 'wish', i }); $('wish').hidden = true; }
  function showRemoteOver(m) {
    $('over-title').textContent = m.title; $('over-sub').textContent = m.sub; $('over-stats').innerHTML = m.stats;
    $('endless').hidden = true; $('retry').hidden = true;
    $('menu').textContent = 'Leave room';
    $('over').hidden = false; showWait('Waiting for the host to start another run...');
  }
  // keyboard / mouse / pad movement for the player at this computer
  function localInput(p) {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x--;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x++;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y--;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y++;
    const pad = pads[0];
    if (pad && pad.x !== undefined) {
      if (Math.hypot(pad.x, pad.ay) > 0.25) { x = pad.x; y = pad.ay; }
      if (pad.l) x = -1; if (pad.r) x = 1; if (pad.up) y = -1; if (pad.down) y = 1;
    }
    const mv = mouseMove(p); if (mv) [x, y] = mv;
    if (joy.on) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d > 8) { x = dx / Math.max(d, 40); y = dy / Math.max(d, 40); }
    }
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return [x, y];
  }
  function clientKey(c, digit) {
    if (state === 'levelup' && !$('levelup').hidden) { if (digit && +digit[2] <= 3) remoteChoose(+digit[2] - 1); return; }
    if (state === 'wish' && !$('wish').hidden) { if (digit) remoteWish(+digit[2] - 1); return; }
    if (NET.bondOpen) { bondKey(c, digit); return; }
    if (c === 'Escape' || c === 'KeyP') { sendHost({ t: state === 'paused' ? 'resume' : 'pause' }); return; }
    if (state !== 'play' || !G) return;
    const me = G.players[NET.me];
    if (digit) selectSlot(me, +digit[2] - 1);
    if (c === 'KeyE' || c === 'Space' || c === 'Enter') sendHost({ t: 'fuse' });
    if (c === 'KeyQ') sendHost({ t: 'ult' });
    if (c === 'KeyB') openBond(me);
  }

  function mergeSlots(p, sel) {   // a guest's bond, applied on the host
    sel = [...new Set(sel)].filter(i => i >= 0 && i < p.slots.length).sort((a, b) => a - b);
    if (sel.length < 2 || p.bonds <= 0) return;
    const merged = sel.flatMap(i => p.slots[i]), keep = p.slots.filter((_, i) => !sel.includes(i));
    keep.splice(sel[0], 0, merged);
    p.slots = keep; p.active = sel[0]; p.bonds--; techKey = '';
    showBanner('TECHNIQUES BONDED', pName(p) + ': ' + merged.map(id => TECHS[id].name).join(' + '), '#ffd83a');
  }

  // ------------------------------------------------------------ loop
  let last = performance.now();
  function step(dt) {
    if (state === 'play') update(dt);
    else if (state === 'transform') { updateTransform(dt); updateFx(dt); }
    else if (state === 'fusing') { updateFusing(dt); updateFx(dt); }
    else if (state === 'intro') { G.introT -= dt; updateFx(dt); if (G.introT <= 0) endIntro(); }
    else if (state === 'wish') { G.wishT += dt; updateFx(dt); }
  }
  // rAF drives the loop; a slow timer keeps it ticking if the host stops delivering frames.
  let rafPending = false;
  function schedule() { if (!rafPending) { rafPending = true; requestAnimationFrame(t => { rafPending = false; frame(t); }); } }
  setInterval(() => { if (performance.now() - last > 150) frame(performance.now()); }, 50);
  let frameCount = 0;
  function frame(now) {
    frameCount++;
    schedule();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (W !== innerWidth || H !== innerHeight) resize();
    if (VW < 1 || VH < 1) return;
    readPads();
    if (isClient()) clientTick(dt);
    else { step(dt); hostNetTick(); }
    render();
    if (G && state !== 'over') hud();
  }

  // #fusiontest: you play Goku next to an invulnerable AI Vegeta, both at level 50, and fusion always gives Gogeta.
  function startFusionTest() {
    audioInit();
    newRun(['goku', 'vegeta']);
    G.test = { bots: [1], force: 'gogeta' };
    G.level = 50; G.xpNext = xpFor(50);
    for (const p of G.players) {
      while (p.C.forms[p.form + 1] && p.C.forms[p.form + 1].lv <= G.level) p.form++;
      for (const [id, lv] of p.C.techs) if (lv <= G.level) { if (!p.techs[id]) addTech(p, id); p.techs[id].lv = 3; p.announced.add(id); }
      recalc(p); p.hp = p.ps.maxHp;
    }
    G.players[1].x = 18;
    hudKey = ''; techKey = '';
    showBanner('FUSION TEST', 'You are Goku. Press E to fuse with Vegeta. R resets the cooldown.', '#ffd83a');
  }

  // Open the page with #debug to get a console handle for testing.
  // #ssjtest: a solo Goku run one level short of Super Saiyan; a few kills set off the transformation.
  function startSsjTest() {
    audioInit();
    newRun(['goku']);
    const p = G.players[0], lv = p.C.forms[1].lv - 1;
    G.level = lv; G.xpNext = xpFor(lv); G.xp = G.xpNext - 3;
    for (const [id, l] of p.C.techs) if (l <= lv) { if (!p.techs[id]) addTech(p, id); p.announced.add(id); }
    recalc(p); p.hp = p.ps.maxHp;
    hudKey = ''; techKey = '';
    showBanner('ALMOST SUPER SAIYAN', 'Defeat a few enemies to reach level ' + p.C.forms[1].lv, '#ffd83a');
  }
  if (location.hash === '#debug' || location.hash === '#fusiontest') window.ZS = {
    get G() { return G; }, get state() { return state; }, get loop() { return { frameCount, last, now: performance.now(), rafPending, VW, VH }; }, xp: v => gainXp(v), saga: n => { G.sagaIdx = n - 1; nextSaga(); }, boss: () => { G.sagaT = SAGA_TIME; },
    start: ids => newRun(ids), tickets: n => addTickets(n, true), reveal: (id, tier) => playReveal([{ id, tier, dupe: false }]), gacha: () => gacha, rift: () => { G.riftT = 0; }, arena: () => { if (!G.rift) spawnRift(); if (G.rift) enterArena(); },
    cap: (t, i = 0) => openCapsule({ cap: t }, G.players[i]), fuse: (i) => fusePressed(G.players[i]), endFusion: () => endFusion(false),
    ult: (i = 0) => castUltimate(G.players[i]), supply: () => spawnSupplyDrop(), snap: (i = 1) => snapshot(i, []),
    step: (n, pick = true) => {
      for (let i = 0; i < n; i++) {
        if (state === 'levelup' && pick) choose(Math.max(0, curOpts.findIndex(o => o.kind === 'tech')));
        if (window.ZS.bot && G) for (const pl of G.players) if (pl.bonds > 0 && pl.slots.length > 1 && state === 'play') { openBond(pl); bondSel = new Set(pl.slots.map((_, j) => j)); doBond(); }
        if (state === 'wish' && pick) chooseWish(WISHES.findIndex(w => !G.wishUsed.has(w.id) && (!w.ok || w.ok(G.players[G.wishOrder[G.wishIdx]]))));
        if (state === 'over') break;
        step(1 / 60);
      }
      render(); if (G) hud(); return state;
    },
  };

  Promise.all(artNames().map(loadImg)).then(() => (document.fonts ? document.fonts.ready : null)).then(() => {
    $('loading').hidden = true; toTitle();
    if (location.hash === '#fusiontest') startFusionTest();
    if (location.hash === '#ssjtest') startSsjTest();
    if (SUMMON_SIM) openGacha();
  });
  schedule();
})();
