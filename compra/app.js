/* Lista de la compra · Pa la tetita de Noah
   Vive en el mismo archivo de Google Drive que Noah APP (pestaña «Compra»): lo que apunta uno, lo ve el otro. */
window.APP_COMPRA_VERSION = '2.0 · 24 nov';
(function (root) {
  'use strict';
  var G = root.MOCK_API || root.GAPI, ls = G.ls, TAB = 'Compra';
  var HEAD = ['id', 'nombre', 'cantidad', 'seccion', 'hecho', 'autor', 'creado', 'modificado', 'borrado', 'comprado'];

  /* Secciones, en el orden en que se recorre el súper */
  var CATS = [
    ['fruta', 'Fruta y verdura', '🥦', '#1E9E62'], ['carne', 'Carne y pescado', '🥩', '#E0484F'], ['lacteos', 'Lácteos y huevos', '🧀', '#D99A00'],
    ['pan', 'Panadería', '🥖', '#C77A2E'], ['despensa', 'Despensa', '🥫', '#6E61D6'], ['congelados', 'Congelados', '🧊', '#2B9BE0'],
    ['bebidas', 'Bebidas', '🧃', '#D64D8A'], ['bebe', 'Pa Noah', '🍼', '#FF7FA8'], ['higiene', 'Higiene', '🧴', '#17A39D'],
    ['limpieza', 'Limpieza', '🧽', '#2F6BFF'], ['otros', 'Otros', '🛒', '#7A86A8']
  ];
  var CAT = {}; CATS.forEach(function (c, i) { CAT[c[0]] = { k: c[0], n: c[1], e: c[2], c: c[3], i: i }; });
  var KW = {
    fruta: 'fruta verdura manzana platano pera naranja mandarina limon uva fresa melon sandia pina kiwi aguacate guacamole tomate lechuga cebolla ajo patata zanahoria pimiento pepino calabacin berenjena brocoli espinaca champinon seta judia ensalada rucula canonigo puerro apio mango cereza melocoton nectarina ciruela arandano frambuesa perejil cilantro hierbabuena calabaza boniato',
    carne: 'pollo pechuga muslo ternera cerdo lomo jamon pavo chorizo salchichon fuet salchicha hamburguesa carne filete costilla bacon beicon morcilla mortadela conejo cordero albondiga picada pescado merluza salmon bacalao dorada lubina gamba langostino calamar sepia mejillon almeja boqueron pulpo rape emperador',
    lacteos: 'leche yogur queso mantequilla nata huevo clara kefir batido natillas flan cuajada requeson mozzarella burrata',
    pan: 'pan baguette barra molde picos rosquito regana tostada croissant magdalena bizcocho bolleria sandwich',
    despensa: 'arroz pasta macarron espagueti fideo noodle harina azucar sal aceite vinagre garbanzo lenteja alubia atun caldo soja salsa mayonesa ketchup mostaza especia oregano pimienta cafe infusion cacao colacao cereales avena galleta mermelada miel chocolate almendra nuez conserva lata aceituna levadura tomate_frito bote_patata patatas_fritas caldo_pollo caldo_de_pollo pan_rallado frutos_secos leche_evaporada',
    congelados: 'congelado congelada congelados helado pizza croqueta nugget guisantes hielo',
    bebidas: 'agua cerveza vino refresco cocacola coca_cola fanta zumo tinto gaseosa aquarius nestea',
    bebe: 'panal panales toallita toallitas biberon tetina chupete potito papilla formula ropa_bebe colonia_bebe crema_del_panal suero_fisiologico bebe',
    higiene: 'champu gel desodorante dentifrico pasta_de_dientes cepillo colutorio compresa tampon cuchilla crema papel_higienico algodon bastoncillo jabon colonia protector_solar',
    limpieza: 'detergente suavizante lejia friegasuelos lavavajillas fairy estropajo bayeta basura papel_de_cocina servilleta film aluminio limpiacristales amoniaco ambientador norit'
  };
  var KWL = []; Object.keys(KW).forEach(function (c) { KW[c].split(' ').forEach(function (w) { KWL.push([w.replace(/_/g, ' '), c]); }); });
  KWL.sort(function (a, b) { return b[0].length - a[0].length; });
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n').trim(); }
  function guess(name) { var n = ' ' + norm(name) + ' '; for (var i = 0; i < KWL.length; i++) if (n.indexOf(KWL[i][0]) >= 0) return KWL[i][1]; return 'otros'; }
  function parse(txt) {
    var t = txt.trim().replace(/\s+/g, ' '), m, qty = '';
    if ((m = /^(\d+[.,]?\d*\s?(kg|g|gr|l|ml|paquetes?|botes?|latas?|docenas?|bolsas?)?)\s+(.+)$/i.exec(t))) { qty = m[1]; t = m[3]; }
    else if ((m = /^(.+?)\s+x\s?(\d+)$/i.exec(t))) { qty = m[2]; t = m[1]; }
    return { nombre: t.charAt(0).toUpperCase() + t.slice(1), cant: qty };
  }

  /* ---------- estado ---------- */
  var S = root.S = { items: ls('compra.cache') || [], queue: ls('compra.queue') || [], me: ls('me'), showCart: false, ready: false, syncing: false, err: false };
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function persist() { ls('compra.cache', S.items); ls('compra.queue', S.queue); }
  function active() { return S.items.filter(function (i) { return !i.borrado; }); }

  /* ---------- Google ---------- */
  var tabOk = false;
  function ensureTab() {
    if (tabOk) return Promise.resolve();
    var id = G.fileId();
    return G.api(G.SHEETS + id + '?fields=' + G.q('sheets(properties(title))')).then(function (ss) {
      if (ss.sheets.some(function (s) { return s.properties.title === TAB; })) return;
      return G.api(G.SHEETS + id + ':batchUpdate', { method: 'POST', json: { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } } }] } })
        .then(function () { return G.api(G.SHEETS + id + '/values/' + G.q(TAB + '!A1:J1') + '?valueInputOption=RAW', { method: 'PUT', json: { values: [HEAD] } }); });
    }).then(function () { tabOk = true; });
  }
  function toRow(i) { return [i.id, i.nombre, i.cant || '', i.sec, i.hecho ? '1' : '', i.autor || '', i.creado || '', i.mod || '', i.borrado ? '1' : '', i.comprado || '']; }
  function readAll() {
    return ensureTab().then(function () { return G.api(G.SHEETS + G.fileId() + '/values/' + G.q(TAB + '!A2:J20000')); }).then(function (r) {
      return (r.values || []).map(function (x, k) { return { id: x[0], nombre: x[1] || '', cant: x[2] || '', sec: CAT[x[3]] ? x[3] : 'otros', hecho: x[4] === '1', autor: x[5] || '', creado: x[6] || '', mod: x[7] || '', borrado: x[8] === '1', comprado: x[9] || '', row: k + 2 }; }).filter(function (i) { return i.id; });
    });
  }
  function apiAdd(recs) { return ensureTab().then(function () { return G.api(G.SHEETS + G.fileId() + '/values/' + G.q(TAB + '!A:J') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', json: { values: recs.map(toRow) } }); }); }
  function apiUpd(recs) {
    var id = G.fileId();
    var need = recs.some(function (r) { return !r.row; });
    var rows = need ? G.api(G.SHEETS + id + '/values/' + G.q(TAB + '!A2:A20000')).then(function (r) { var m = {}; (r.values || []).forEach(function (x, k) { m[x[0]] = k + 2; }); return m; }) : Promise.resolve({});
    return rows.then(function (m) {
      var data = recs.map(function (r) { var n = r.row || m[r.id]; return n ? { range: TAB + '!A' + n + ':J' + n, values: [toRow(r)] } : null; }).filter(Boolean);
      return data.length ? G.api(G.SHEETS + id + '/values:batchUpdate', { method: 'POST', json: { valueInputOption: 'RAW', data: data } }) : null;
    });
  }

  /* ---------- cambios (con cola si no hay cobertura) ---------- */
  function add(recs) {
    var now = new Date().toISOString();
    recs.forEach(function (r) { r.id = r.id || uid(); r.creado = r.creado || now; r.autor = r.autor || (S.me && S.me.name) || ''; S.items.push(r); });
    S.queue.push({ op: 'add', recs: recs }); persist(); render(); flush();
  }
  function upd(recs) {
    var now = new Date().toISOString();
    recs = recs.map(function (r) { r = Object.assign({}, r, { mod: now }); var k = S.items.findIndex(function (x) { return x.id === r.id; }); if (k >= 0) S.items[k] = r; return r; });
    S.queue.push({ op: 'upd', recs: recs }); persist(); render(); flush();
  }
  function flush() {
    if (S.syncing || !S.queue.length) return paintSync();
    S.syncing = true; paintSync();
    var j = S.queue[0];
    (j.op === 'add' ? apiAdd(j.recs) : apiUpd(j.recs)).then(function () { S.queue.shift(); persist(); S.syncing = false; S.err = false; flush(); })
      .catch(function (e) { S.syncing = false; S.err = true; paintSync(); if (e.auth) reauth(); });
  }
  var busy = false;
  function refresh() {
    if (busy || !G.fileId() || !G.token()) return Promise.resolve();
    busy = true;
    return readAll().then(function (items) {
      var pend = {}; S.queue.forEach(function (j) { j.recs.forEach(function (r) { pend[r.id] = r; }); });
      var have = {}; items.forEach(function (i) { have[i.id] = 1; });
      S.items = items.map(function (i) { return pend[i.id] ? Object.assign({}, pend[i.id], { row: i.row }) : i; })
        .concat(Object.keys(pend).filter(function (k) { return !have[k]; }).map(function (k) { return pend[k]; }));
      S.err = false; persist(); busy = false; render(); flush(); doImport();
    }).catch(function (e) { busy = false; S.err = true; paintSync(); if (e.auth) reauth(); });
  }
  function reauth() {
    try { if (sessionStorage.getItem('compra.reauth')) { if (!S.ready) login(); return; } sessionStorage.setItem('compra.reauth', '1'); } catch (e) {}
    G.signIn();
  }

  /* ---------- traer la lista anterior (enlace con #importar=…) ---------- */
  (function () {
    var m = /[#&]importar=([^&]+)/.exec(location.hash); if (!m) return;
    try { ls('compra.import', JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))))); } catch (e) {}
    history.replaceState(null, '', location.pathname);
  })();
  function doImport() {
    var d = ls('compra.import'); if (!d) return;
    ls('compra.import', null);
    var have = {}; S.items.forEach(function (i) { have[i.id] = 1; });
    var recs = []; var t0 = Date.now() - 1e6;
    (d.items || []).forEach(function (x, k) { var id = 'imp' + k; if (!have[id]) recs.push({ id: id, nombre: x[0], cant: '', sec: CAT[x[1]] ? x[1] : guess(x[0]), hecho: false, autor: x[2] || '', creado: new Date(t0 + k * 1000).toISOString() }); });
    (d.habituales || []).forEach(function (x, k) { for (var n = 0; n < (x[2] || 1); n++) { var id = 'imph' + k + '-' + n; if (!have[id]) recs.push({ id: id, nombre: x[0], sec: x[1], hecho: true, borrado: true, comprado: new Date(t0).toISOString(), creado: new Date(t0).toISOString() }); } });
    if (recs.length) { add(recs); toast('Me he traído vuestra lista: ' + (d.items || []).length + ' cosas'); }
  }

  /* ---------- habituales: lo que más compráis y no está ya en la lista ---------- */
  function favs() {
    var cnt = {}, inList = {};
    active().forEach(function (i) { inList[norm(i.nombre)] = 1; });
    S.items.forEach(function (i) { var k = norm(i.nombre); if (!k) return; var c = cnt[k] || (cnt[k] = { n: 0, nombre: i.nombre, sec: i.sec, last: '' }); c.n++; if ((i.creado || '') > c.last) { c.last = i.creado || ''; c.nombre = i.nombre; c.sec = i.sec; } });
    return Object.keys(cnt).filter(function (k) { return !inList[k] && cnt[k].n >= 2; }).map(function (k) { return cnt[k]; }).sort(function (a, b) { return b.n - a.n || (b.last > a.last ? 1 : -1); }).slice(0, 14);
  }

  /* ---------- pintar ---------- */
  function initials(n) { return n ? n.trim().charAt(0).toUpperCase() : ''; }
  function whoColor(n) { var h = 0; for (var i = 0; i < (n || '').length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; return ['#2F6BFF', '#E0A800', '#1A3FA8', '#FF7FA8'][Math.abs(h) % 4]; }
  function render() {
    if (!S.ready) return;
    var all = active(), todo = all.filter(function (i) { return !i.hecho; }), cart = all.filter(function (i) { return i.hecho; });
    // anillo
    var tot = all.length, pct = tot ? cart.length / tot : 0, C = 2 * Math.PI * 17;
    $('#ring').innerHTML = '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="17" class="rb"/><circle cx="22" cy="22" r="17" class="rf" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '"/></svg><span>' + (tot ? cart.length + '/' + tot : '0') + '</span>';
    // habituales
    var fv = favs();
    $('#favs').innerHTML = fv.map(function (f) { return '<button data-fav="' + esc(f.nombre) + '" data-sec="' + f.sec + '"><i>' + CAT[f.sec].e + '</i>' + esc(f.nombre) + '</button>'; }).join('');
    $('#favs').hidden = !fv.length;
    // lista por secciones
    var h = '';
    if (!all.length) h = '<div class="empty"><b>La lista está vacía</b><span>¡Qué gloria! Apunta abajo lo que haga falta.</span></div>';
    CATS.forEach(function (c) {
      var its = todo.filter(function (i) { return i.sec === c[0]; }).sort(function (a, b) { return (a.creado || '') < (b.creado || '') ? -1 : 1; });
      if (!its.length) return;
      h += '<section class="sec" style="--c:' + c[3] + '"><h2><i>' + c[2] + '</i>' + c[1] + '<b>' + its.length + '</b></h2><div class="pills">' + its.map(row).join('') + '</div></section>';
    });
    if (cart.length) {
      h += '<section class="sec cart"><button class="carth" data-act="cart"><i>💛</i>En el carro<b>' + cart.length + '</b><span>' + (S.showCart ? 'Ocultar' : 'Ver') + '</span></button>' + (S.showCart ? '<div class="pills">' + cart.map(row).join('') + '</div>' : '') + '</section>';
    }
    if (all.length) h += '<p class="hint">Toca para echarlo al carro · mantén pulsado para editar</p>';
    h += '<p class="ver">versión ' + root.APP_COMPRA_VERSION + '</p>';
    $('#list').innerHTML = h;
    var fin = $('#finish'); fin.hidden = !cart.length; fin.innerHTML = '💙 Terminar compra <b>' + cart.length + '</b>';
    paintSync();
  }
  function row(i) {
    var c = CATS[(CAT[i.sec] || CAT.otros).i];
    return '<button class="it' + (i.hecho ? ' on' : '') + '" data-id="' + i.id + '" style="--c:' + c[3] + '"><span class="ck"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' + esc(i.nombre) + (i.cant ? '<em>' + esc(i.cant) + '</em>' : '') +
      (i.autor ? '<span class="who" style="background:' + whoColor(i.autor) + '">' + esc(initials(i.autor)) + '</span>' : '') + '</button>';
  }
  function paintSync() {
    var d = $('#sync'); if (!d) return;
    var n = S.queue.reduce(function (a, j) { return a + j.recs.length; }, 0);
    d.className = 'sync ' + (S.syncing ? 'busy' : n || S.err ? 'warn' : 'ok');
    d.title = S.syncing ? 'Guardando…' : n ? n + ' cambios sin subir' : S.err ? 'Sin conexión' : 'Al día';
  }

  /* ---------- añadir ---------- */
  var inp = $('#inp'), gEl = $('#guess');
  inp.addEventListener('input', function () { var t = inp.value.split(/[,\n]/)[0]; gEl.textContent = t.trim() ? CAT[guess(parse(t).nombre)].e : '🛒'; });
  $('#addf').addEventListener('submit', function (e) {
    e.preventDefault();
    var parts = inp.value.split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean); if (!parts.length) return;
    var listed = {}; active().filter(function (i) { return !i.hecho; }).forEach(function (i) { listed[norm(i.nombre)] = 1; });
    var recs = [], dup = [];
    parts.forEach(function (p) { var x = parse(p); if (listed[norm(x.nombre)]) { dup.push(x.nombre); return; } listed[norm(x.nombre)] = 1; recs.push({ nombre: x.nombre, cant: x.cant, sec: guess(x.nombre), hecho: false }); });
    if (recs.length) add(recs);
    if (dup.length) toast(dup.join(', ') + (dup.length > 1 ? ' ya estaban apuntaos' : ' ya estaba apuntao'));
    inp.value = ''; gEl.textContent = '🛒';
  });
  $('#favs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; add([{ nombre: b.dataset.fav, cant: '', sec: b.dataset.sec, hecho: false }]); });

  /* ---------- tocar, editar, terminar ---------- */
  var lp = null, lpFired = false;
  function lpStart(e) { var it = e.target.closest('.it'); if (!it) return; lpFired = false; clearTimeout(lp); lp = setTimeout(function () { lpFired = true; if (navigator.vibrate) navigator.vibrate(15); edit(byId(it.dataset.id)); }, 480); }
  function lpEnd() { clearTimeout(lp); }
  ['touchstart', 'mousedown'].forEach(function (ev) { $('#list').addEventListener(ev, lpStart, { passive: true }); });
  ['touchend', 'touchmove', 'touchcancel', 'mouseup', 'mouseleave'].forEach(function (ev) { $('#list').addEventListener(ev, lpEnd, { passive: true }); });
  $('#list').addEventListener('contextmenu', function (e) { if (e.target.closest('.it')) e.preventDefault(); });
  $('#list').addEventListener('click', function (e) {
    if (lpFired) { lpFired = false; return; }
    if (e.target.closest('[data-act=cart]')) { S.showCart = !S.showCart; return render(); }
    var it = e.target.closest('.it'); if (!it) return;
    var r = byId(it.dataset.id); if (!r) return;
    if (navigator.vibrate) navigator.vibrate(8);
    it.classList.add('pop');
    setTimeout(function () { upd([Object.assign({}, r, { hecho: !r.hecho })]); var a = active(); if (!r.hecho && a.length && a.every(function (x) { return x.hecho; })) { toast('¡Todo en el carro! 💛💙'); confetti(40); } }, 160);
  });
  function byId(id) { return S.items.find(function (i) { return i.id === id; }); }
  $('#finish').addEventListener('click', function () {
    var cart = active().filter(function (i) { return i.hecho; }); if (!cart.length) return;
    var now = new Date().toISOString();
    upd(cart.map(function (i) { return Object.assign({}, i, { borrado: true, comprado: now }); }));
    confetti(110); S.showCart = false;
    toast('¡Compra hecha! Pa casa 💛💙', 'Deshacer', function () { upd(cart.map(function (i) { return Object.assign({}, i, { borrado: false, comprado: '' }); })); });
  });
  function edit(r) {
    if (!r) return;
    var layer = $('#layer');
    layer.innerHTML = '<div class="scrim" data-x></div><form class="sheet"><button type="button" class="x" data-x aria-label="Cerrar">×</button><h3>Editar</h3>' +
      '<div class="two"><label class="f"><span>Qué</span><input name="nombre" value="' + esc(r.nombre) + '" required></label><label class="f sm"><span>Cuánto</span><input name="cant" value="' + esc(r.cant) + '" placeholder="2, 1 kg…"></label></div>' +
      '<span class="lbl">Sección</span><div class="secs">' + CATS.map(function (c) { return '<label style="--c:' + c[3] + '"><input type="radio" name="sec" value="' + c[0] + '"' + (r.sec === c[0] ? ' checked' : '') + '><span>' + c[2] + ' ' + c[1] + '</span></label>'; }).join('') + '</div>' +
      '<p class="meta">' + (r.autor ? 'Lo apuntó ' + esc(r.autor) : '') + '</p><div class="acts"><button type="button" class="btn ghost" data-del>Quitar de la lista</button><button class="btn">Guardar</button></div></form>';
    layer.classList.add('open');
    var f = layer.querySelector('form');
    layer.onclick = function (e) {
      if (e.target.closest('[data-x]')) close();
      if (e.target.closest('[data-del]')) { upd([Object.assign({}, r, { borrado: true })]); close(); toast('Quitado', 'Deshacer', function () { upd([Object.assign({}, r, { borrado: false })]); }); }
    };
    f.onsubmit = function (e) { e.preventDefault(); var n = f.nombre.value.trim(); if (!n) return; upd([Object.assign({}, r, { nombre: n, cant: f.cant.value.trim(), sec: f.sec.value })]); close(); };
  }
  function close() { var l = $('#layer'); l.classList.remove('open'); l.innerHTML = ''; l.onclick = null; }

  /* ---------- avisos y confeti ---------- */
  function toast(msg, act, fn) {
    document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
    var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = '<span>' + esc(msg) + '</span>' + (act ? '<button>' + esc(act) + '</button>' : '');
    if (act) t.querySelector('button').onclick = function () { fn(); t.remove(); };
    document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, act ? 5000 : 2600);
  }
  function confetti(n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas'), x = cv.getContext('2d'), W = cv.width = innerWidth * 2, H = cv.height = innerHeight * 2, P = [];
    cv.className = 'confetti'; document.body.appendChild(cv);
    for (var i = 0; i < n; i++) P.push({ x: W / 2, y: H * 0.85, vx: (Math.random() - 0.5) * 34, vy: -Math.random() * 46 - 18, r: Math.random() * 6 + 5, c: ['#2F6BFF', '#FFCF33', '#1A3FA8', '#FFE07A'][i % 4], a: Math.random() * 6 });
    var t0 = performance.now();
    (function f(t) { x.clearRect(0, 0, W, H); P.forEach(function (p) { p.vy += 1.6; p.x += p.vx; p.y += p.vy; p.a += 0.2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); }); if (t - t0 < 1800) requestAnimationFrame(f); else cv.remove(); })(t0);
  }

  /* ---------- arranque ---------- */
  function screen(h) { $('#main').hidden = true; var w = $('#welcome'); w.hidden = false; w.innerHTML = h; }
  function login() { screen('<img src="icons/icon-192.png" alt=""><h1>Lista de la compra</h1><p>Pa la tetita de Noah. Lo que apunta uno, le aparece al otro al momento.</p><button class="btn big" id="go">Entrar con Google</button>'); $('#go').onclick = function () { G.signIn({ prompt: 'select_account' }); }; }
  function start() { $('#welcome').hidden = true; $('#main').hidden = false; S.ready = true; render(); refresh(); }
  function boot() {
    if (!G.token()) { if (G.fileId() && S.items.length) { S.ready = true; $('#main').hidden = false; render(); } return S.me ? reauth() : login(); }
    var who = S.me ? Promise.resolve(S.me) : G.whoami();
    who.then(function (me) {
      S.me = me; if (G.fileId()) return start();
      return G.findFile().then(function (id) {
        if (id) return start();
        screen('<img src="icons/icon-192.png" alt=""><h1>¡Buenas, ' + esc(me.name) + '!</h1><p>La lista se guarda junto a los datos de Noah APP. Si ya usáis Noah APP, elige su archivo; si no, ábrela primero y prepara el espacio.</p><button class="btn big" id="pick">Elegir «Noah APP · datos»</button><a class="btn big ghost" href="../">Abrir Noah APP</a>');
        $('#pick').onclick = function () { G.pickFile().then(start).catch(function (e) { if (e.message !== 'CANCEL') toast(e.message); }); };
      });
    }).catch(function (e) { if (e.auth) return reauth(); if (S.items.length) { S.ready = true; $('#main').hidden = false; render(); } toast(e.message); });
  }
  $('#sync').addEventListener('click', function () { flush(); refresh(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.ready) refresh(); });
  setInterval(function () { if (!document.hidden && S.ready && !$('#layer').innerHTML && document.activeElement !== inp) refresh(); }, 5000);
  addEventListener('online', function () { flush(); refresh(); });
  root.Compra = { guess: guess, parse: parse };
  boot();
})(window);
