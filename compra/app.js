/* Lista de la compra · Pa la tetita de Noah
   Vive en el mismo archivo de Google Drive que Noah APP (pestaña «Compra»): lo que apunta uno, lo ve el otro. */
window.APP_COMPRA_VERSION = '2.5 · 24 nov';
(function (root) {
  'use strict';
  var G = root.MOCK_API || root.GAPI, ls = G.ls, TAB = 'Compra';
  var HEAD = ['id', 'nombre', 'cantidad', 'seccion', 'hecho', 'autor', 'creado', 'modificado', 'borrado', 'comprado', 'nota'];

  /* Secciones, en el orden en que se recorre el súper */
  var CATS = [
    ['fruta', 'Fruta y verdura', '🥦', '#13804D'], ['carne', 'Carne y pescado', '🥩', '#C8323A'], ['lacteos', 'Lácteos y huevos', '🧀', '#B27A00'],
    ['pan', 'Panadería', '🥖', '#A85F1B'], ['despensa', 'Despensa', '🥫', '#5646C4'], ['congelados', 'Congelados', '🧊', '#1478B8'],
    ['bebidas', 'Bebidas', '🧃', '#B8336F'], ['bebe', 'Pa Noah', '🍼', '#D9487A'], ['higiene', 'Higiene', '🧴', '#0D827D'],
    ['limpieza', 'Limpieza', '🧽', '#2F6BFF'], ['otros', 'Otros', '🛒', '#5C6890']
  ];
  var MERCADONA = ['fruta', 'pan', 'carne', 'lacteos', 'despensa', 'bebidas', 'bebe', 'higiene', 'limpieza', 'congelados', 'otros'];
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
    var t = txt.trim().replace(/\s+/g, ' '), m, qty = '', nota = '';
    if ((m = /^(.*?)\s*\((.+)\)\s*$/.exec(t))) { t = m[1]; nota = m[2].trim(); }
    if ((m = /^(\d+[.,]?\d*\s?(kg|g|gr|l|ml|paquetes?|botes?|latas?|docenas?|bolsas?)?)\s+(.+)$/i.exec(t))) { qty = m[1]; t = m[3]; }
    else if ((m = /^(.+?)\s+x\s?(\d+)$/i.exec(t))) { qty = m[2]; t = m[1]; }
    return { nombre: t.charAt(0).toUpperCase() + t.slice(1), cant: qty, nota: nota };
  }

  var DINO = '<svg class="dino" viewBox="0 0 200 200" aria-hidden="true"><g transform="translate(8 6)"><path d="M62 118 C40 124 22 138 10 162 C34 156 52 150 70 142 Z" fill="#2F6BFF"/><path d="M104 40 l7-16 9 12 8-16 9 13 8-14 7 16 z" fill="#FF8A3D" stroke="#FF8A3D" stroke-width="4" stroke-linejoin="round"/><ellipse cx="92" cy="118" rx="44" ry="42" fill="#2F6BFF"/><rect x="88" y="34" width="86" height="64" rx="30" fill="#2F6BFF"/><path d="M96 70 C90 84 88 96 92 108 L120 100 Z" fill="#2F6BFF"/><ellipse cx="98" cy="128" rx="26" ry="26" fill="#BFD3FF"/><rect x="66" y="146" width="22" height="34" rx="11" fill="#1F55E0"/><rect x="100" y="146" width="22" height="34" rx="11" fill="#2F6BFF"/><path d="M124 108 q12 4 12 14" stroke="#2F6BFF" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M118 80 Q146 92 172 78" stroke="#14285E" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M130 85 l4 7 4-6 M146 86 l4 7 4-7 M160 83 l3 6 4-7" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="140" cy="56" r="11" fill="#fff"/><circle cx="143" cy="57" r="6.5" fill="#14285E"/><circle cx="145" cy="54.5" r="2.2" fill="#fff"/><circle cx="166" cy="48" r="2.6" fill="#14285E"/><circle cx="126" cy="72" r="6" fill="#FF9EB4" opacity=".8"/></g></svg>';

  /* ---------- estado ---------- */
  var S = root.S = { items: ls('compra.cache') || [], queue: ls('compra.queue') || [], me: ls('me'), ready: false, syncing: false, err: false };
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function persist() { ls('compra.cache', S.items); ls('compra.queue', S.queue); }
  function active() { return S.items.filter(function (i) { return !i.borrado && i.id.charAt(0) !== '_'; }); }
  function orderRec() { return S.items.find(function (i) { return i.id === '_orden'; }); }
  function order() {
    var o = orderRec(), list = o ? o.nombre.split(',').filter(function (k) { return CAT[k]; }) : MERCADONA.slice();
    CATS.forEach(function (c) { if (list.indexOf(c[0]) < 0) list.push(c[0]); });
    return list;
  }
  function saveOrder(list) {
    var o = orderRec(), csv = list.join(',');
    if (o) upd([Object.assign({}, o, { nombre: csv })]); else add([{ id: '_orden', nombre: csv, sec: 'otros', hecho: true, borrado: true }]);
  }
  /* la sección que usasteis la última vez para ese producto manda sobre la adivinada */
  function secFor(name) { var k = norm(name), best = null; S.items.forEach(function (i) { if (i.id.charAt(0) !== '_' && norm(i.nombre) === k && (!best || (i.creado || '') > (best.creado || ''))) best = i; }); return best ? best.sec : guess(name); }

  /* ---------- Google ---------- */
  var tabOk = false;
  function ensureTab() {
    if (tabOk) return Promise.resolve();
    var id = G.fileId();
    return G.api(G.SHEETS + id + '?fields=' + G.q('sheets(properties(title))')).then(function (ss) {
      if (ss.sheets.some(function (s) { return s.properties.title === TAB; })) return;
      return G.api(G.SHEETS + id + ':batchUpdate', { method: 'POST', json: { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 1 } } } }] } })
        .then(function () { return G.api(G.SHEETS + id + '/values/' + G.q(TAB + '!A1:K1') + '?valueInputOption=RAW', { method: 'PUT', json: { values: [HEAD] } }); });
    }).then(function () { tabOk = true; });
  }
  function toRow(i) { return [i.id, i.nombre, i.cant || '', i.sec, i.hecho ? '1' : '', i.autor || '', i.creado || '', i.mod || '', i.borrado ? '1' : '', i.comprado || '', i.nota || '']; }
  function readAll() {
    return ensureTab().then(function () { return G.api(G.SHEETS + G.fileId() + '/values/' + G.q(TAB + '!A2:K20000')); }).then(function (r) {
      return (r.values || []).map(function (x, k) { return { id: x[0], nombre: x[1] || '', cant: x[2] || '', sec: CAT[x[3]] ? x[3] : 'otros', hecho: x[4] === '1', autor: x[5] || '', creado: x[6] || '', mod: x[7] || '', borrado: x[8] === '1', comprado: x[9] || '', nota: x[10] || '', row: k + 2 }; }).filter(function (i) { return i.id; });
    });
  }
  function apiAdd(recs) { return ensureTab().then(function () { return G.api(G.SHEETS + G.fileId() + '/values/' + G.q(TAB + '!A:K') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', json: { values: recs.map(toRow) } }); }); }
  function apiUpd(recs) {
    var id = G.fileId();
    var need = recs.some(function (r) { return !r.row; });
    var rows = need ? G.api(G.SHEETS + id + '/values/' + G.q(TAB + '!A2:A20000')).then(function (r) { var m = {}; (r.values || []).forEach(function (x, k) { m[x[0]] = k + 2; }); return m; }) : Promise.resolve({});
    return rows.then(function (m) {
      var data = recs.map(function (r) { var n = r.row || m[r.id]; return n ? { range: TAB + '!A' + n + ':K' + n, values: [toRow(r)] } : null; }).filter(Boolean);
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
    S.items.forEach(function (i) { if (i.id.charAt(0) === '_') return; var k = norm(i.nombre); if (!k) return; var c = cnt[k] || (cnt[k] = { n: 0, nombre: i.nombre, sec: i.sec, last: '' }); c.n++; if ((i.creado || '') > c.last) { c.last = i.creado || ''; c.nombre = i.nombre; c.sec = i.sec; } });
    return Object.keys(cnt).filter(function (k) { return !inList[k] && cnt[k].n >= 2; }).map(function (k) { return cnt[k]; }).sort(function (a, b) { return b.n - a.n || (b.last > a.last ? 1 : -1); }).slice(0, 14);
  }

  /* ---------- pintar ---------- */
  function initials(n) { return n ? n.trim().charAt(0).toUpperCase() : ''; }
  function whoColor(n) { var h = 0; for (var i = 0; i < (n || '').length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; return ['#2F6BFF', '#FFCF33', '#1A3FA8', '#D9487A'][Math.abs(h) % 4]; }
  function render() {
    if (!S.ready) return;
    var todo = active();
    $('#count').innerHTML = '<b>' + todo.length + '</b><span>' + (todo.length === 1 ? 'por comprar' : 'por comprar') + '</span>';
    var fv = favs();
    $('#favs').innerHTML = '<span class="fl">Sugerencias</span>' + fv.map(function (f) { return '<button data-fav="' + esc(f.nombre) + '" data-sec="' + f.sec + '"><i>+</i>' + esc(f.nombre) + '</button>'; }).join('');
    $('#favs').hidden = !fv.length;
    var h = '';
    if (!todo.length) h = '<div class="empty">' + DINO + '<b>¡Lista vacía!</b><span>Nevera llena, ¡qué gloria! Apunta abajo lo que vaya haciendo falta.</span></div>';
    order().map(function (k) { return CATS[CAT[k].i]; }).forEach(function (c) {
      var its = todo.filter(function (i) { return i.sec === c[0]; }).sort(function (a, b) { return (a.creado || '') < (b.creado || '') ? -1 : 1; });
      if (!its.length) return;
      h += '<section class="sec" style="--c:' + c[3] + '"><h2><i>' + c[2] + '</i>' + c[1] + '<b>' + its.length + '</b></h2><div class="pills">' + its.map(row).join('') + '</div></section>';
    });
    if (todo.length) h += '<p class="hint">Toca lo que eches al carro · mantén pulsado para editar</p>';
    h += '<p class="hint"><button class="link" data-order>Ordenar secciones como vuestro súper</button></p>';
    h += '<p class="ver">versión ' + root.APP_COMPRA_VERSION + '</p>';
    $('#list').innerHTML = h;
    $('#undo').classList.toggle('off', !gone().length);
    paintSync();
  }
  function row(i) {
    var c = CATS[(CAT[i.sec] || CAT.otros).i];
    return '<button class="it" data-id="' + i.id + '" style="--c:' + c[3] + '"><span class="ck"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' + esc(i.nombre) + (i.cant ? '<em>' + esc(i.cant) + '</em>' : '') + (i.nota ? '<small class="nt">' + esc(i.nota) + '</small>' : '') +
      (i.autor ? '<span class="who" style="background:' + whoColor(i.autor) + ';color:' + (whoColor(i.autor) === '#FFCF33' ? '#14285E' : '#fff') + '">' + esc(initials(i.autor)) + '</span>' : '') + '</button>';
  }
  function paintSync() {
    var d = $('#sync'); if (!d) return;
    var n = S.queue.reduce(function (a, j) { return a + j.recs.length; }, 0);
    d.className = 'sync ' + (S.syncing ? 'busy' : n || S.err ? 'warn' : 'ok');
    d.title = S.syncing ? 'Guardando…' : n ? n + ' cambios sin subir' : S.err ? 'Sin conexión' : 'Al día';
  }

  /* ---------- añadir ---------- */
  var inp = $('#inp'), gEl = $('#guess');
  inp.addEventListener('input', function () { var parts = inp.value.split(/[,\n]/), t = parts[parts.length - 1]; gEl.textContent = t.trim() ? CAT[secFor(parse(t).nombre)].e : '🛒'; suggest(parts.length > 1 ? t : inp.value); });
  $('#addf').addEventListener('submit', function (e) {
    e.preventDefault();
    var parts = inp.value.split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean); if (!parts.length) return;
    var listed = {}; active().forEach(function (i) { listed[norm(i.nombre)] = 1; });
    var recs = [], dup = [];
    parts.forEach(function (p) { var x = parse(p); if (listed[norm(x.nombre)]) { dup.push(x.nombre); return; } listed[norm(x.nombre)] = 1; recs.push({ nombre: x.nombre, cant: x.cant, nota: x.nota, sec: secFor(x.nombre), hecho: false }); });
    if (recs.length) add(recs);
    if (dup.length) toast(dup.join(', ') + (dup.length > 1 ? ' ya estaban apuntaos' : ' ya estaba apuntao'));
    inp.value = ''; gEl.textContent = '🛒'; $('#sugs').innerHTML = '';
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
    if (e.target.closest('[data-order]')) return orderSheet();
    var it = e.target.closest('.it'); if (!it || it.classList.contains('gone')) return;
    var r = byId(it.dataset.id); if (!r) return;
    if (navigator.vibrate) navigator.vibrate(8);
    it.classList.add('gone');
    setTimeout(function () { bought(r); }, 230);
  });
  var batch = { recs: [], t: 0 };
  function bought(r) {
    var now = new Date().toISOString();
    if (Date.now() - batch.t > 5000) batch.recs = [];
    batch.recs.push(r); batch.t = Date.now();
    upd([Object.assign({}, r, { hecho: true, borrado: true, comprado: now })]);
    var recs = batch.recs.slice(), empty = !active().length;
    if (empty) confetti(110);
    toast(empty ? '¡Compra hecha! Pa casa 💛💙' : recs.length === 1 ? '«' + r.nombre + '» al carro' : recs.length + ' cosas al carro', 'Deshacer', function () {
      batch.recs = []; upd(recs.map(function (x) { return Object.assign({}, x, { hecho: false, borrado: false, comprado: '' }); }));
    });
  }
  /* ---------- deshacer cuando quieras (sale de lo guardado en Drive, también tras cerrar la app) ---------- */
  function gone() {
    return S.items.filter(function (i) { return i.borrado && !/^imph/.test(i.id) && i.id.charAt(0) !== '_' && i.mod; }).sort(function (a, b) { return a.mod < b.mod ? 1 : -1; });
  }
  function restore(recs, msg) { upd(recs.map(function (x) { return Object.assign({}, x, { hecho: false, borrado: false, comprado: '' }); })); if (msg) toast(msg); }
  function ago(t) { var m = Math.round((Date.now() - Date.parse(t)) / 60000); if (m < 1) return 'ahora mismo'; if (m < 60) return 'hace ' + m + ' min'; var h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h'; var d = Math.round(h / 24); return d === 1 ? 'ayer' : 'hace ' + d + ' días'; }
  $('#undo').addEventListener('click', function () {
    var g = gone(); if (!g.length) return toast('No hay nada que deshacer');
    restore([g[0]]); toast('«' + g[0].nombre + '» ha vuelto a la lista', 'Ver más', recentSheet);
  });
  function recentSheet() {
    var g = gone().slice(0, 30), layer = $('#layer');
    layer.innerHTML = '<div class="scrim" data-x></div><div class="sheet"><button type="button" class="x" data-x aria-label="Cerrar">×</button><h3>Quitados hace poco</h3><p class="meta">Toca uno para devolverlo a la lista.</p><div class="gone">' +
      (g.length ? g.map(function (i) { var c = CAT[i.sec] || CAT.otros; return '<button data-back="' + i.id + '"><i>' + c.e + '</i><span>' + esc(i.nombre) + (i.cant ? ' <em>' + esc(i.cant) + '</em>' : '') + '</span><small>' + ago(i.mod) + '</small><b>Recuperar</b></button>'; }).join('') : '<p class="meta">No has quitado nada todavía.</p>') + '</div></div>';
    layer.classList.add('open');
    layer.onclick = function (e) {
      if (e.target.closest('[data-x]')) return close();
      var b = e.target.closest('[data-back]'); if (!b) return;
      var r = byId(b.dataset.back); if (!r) return;
      restore([r]); b.remove(); toast('«' + r.nombre + '» ha vuelto a la lista');
    };
  }
  function byId(id) { return S.items.find(function (i) { return i.id === id; }); }
  function edit(r) {
    if (!r) return;
    var layer = $('#layer');
    layer.innerHTML = '<div class="scrim" data-x></div><form class="sheet"><button type="button" class="x" data-x aria-label="Cerrar">×</button><h3>Editar</h3>' +
      '<div class="two"><label class="f"><span>Qué</span><input name="nombre" value="' + esc(r.nombre) + '" required></label><label class="f sm"><span>Cuánto</span><input name="cant" value="' + esc(r.cant) + '" placeholder="2, 1 kg…"></label></div>' +
      '<label class="f"><span>Nota</span><input name="nota" value="' + esc(r.nota || '') + '" placeholder="La de vainilla, marca blanca…"></label><span class="lbl">Sección</span><div class="secs">' + order().map(function (k) { return CATS[CAT[k].i]; }).map(function (c) { return '<label style="--c:' + c[3] + '"><input type="radio" name="sec" value="' + c[0] + '"' + (r.sec === c[0] ? ' checked' : '') + '><span>' + c[2] + ' ' + c[1] + '</span></label>'; }).join('') + '</div>' +
      '<p class="meta">' + (r.autor ? 'Lo apuntó ' + esc(r.autor) : '') + '</p><div class="acts"><button type="button" class="btn ghost" data-del>Quitar de la lista</button><button class="btn">Guardar</button></div></form>';
    layer.classList.add('open');
    var f = layer.querySelector('form');
    layer.onclick = function (e) {
      if (e.target.closest('[data-x]')) close();
      if (e.target.closest('[data-del]')) { upd([Object.assign({}, r, { borrado: true })]); close(); toast('Quitado', 'Deshacer', function () { upd([Object.assign({}, r, { borrado: false })]); }); }
    };
    f.onsubmit = function (e) { e.preventDefault(); var n = f.nombre.value.trim(); if (!n) return; upd([Object.assign({}, r, { nombre: n, cant: f.cant.value.trim(), nota: f.nota.value.trim(), sec: f.sec.value })]); close(); };
  }
  function orderSheet() {
    var layer = $('#layer');
    function paint() {
      var o = order();
      layer.innerHTML = '<div class="scrim" data-x></div><div class="sheet"><button type="button" class="x" data-x aria-label="Cerrar">×</button><h3>Orden del súper</h3><p class="meta">Ponlas en el orden en que recorréis el súper. Se guarda para los dos.</p><div class="ord">' +
        o.map(function (k, n) { var c = CAT[k]; return '<div style="--c:' + c.c + '"><i>' + c.e + '</i><span>' + c.n + '</span><button data-mv="' + n + ',-1" aria-label="Subir"' + (n ? '' : ' disabled') + '>▲</button><button data-mv="' + n + ',1" aria-label="Bajar"' + (n < o.length - 1 ? '' : ' disabled') + '>▼</button></div>'; }).join('') +
        '</div><button class="link" data-reset>Volver al orden típico de Mercadona</button></div>';
      layer.classList.add('open');
    }
    paint();
    layer.onclick = function (e) {
      if (e.target.closest('[data-x]')) return close();
      if (e.target.closest('[data-reset]')) { saveOrder(MERCADONA.slice()); return paint(); }
      var b = e.target.closest('[data-mv]'); if (!b) return;
      var a = b.dataset.mv.split(','), n = +a[0], d = +a[1], o = order(), t = o[n]; o[n] = o[n + d]; o[n + d] = t; saveOrder(o); paint();
    };
  }
  /* sugerencias mientras escribes, de lo que soléis comprar */
  function suggest(q) {
    var k = norm(q), box = $('#sugs'); if (k.length < 2) { box.innerHTML = ''; return; }
    var cnt = {}, inList = {};
    active().forEach(function (i) { inList[norm(i.nombre)] = 1; });
    S.items.forEach(function (i) { if (i.id.charAt(0) === '_') return; var n = norm(i.nombre); if (inList[n] || n.indexOf(k) < 0) return; var c = cnt[n] || (cnt[n] = { n: 0, i: i, pre: n.indexOf(k) === 0 }); c.n++; if ((i.creado || '') > (c.i.creado || '')) c.i = i; });
    var l = Object.keys(cnt).map(function (n) { return cnt[n]; }).sort(function (a, b) { return (b.pre - a.pre) || (b.n - a.n); }).slice(0, 4);
    box.innerHTML = l.map(function (c) { return '<button type="button" data-sug="' + c.i.id + '"><i>' + CAT[c.i.sec].e + '</i>' + esc(c.i.nombre) + '</button>'; }).join('');
  }
  $('#sugs').addEventListener('mousedown', function (e) { e.preventDefault(); });
  $('#sugs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sug]'); if (!b) return; var r = byId(b.dataset.sug); if (!r) return;
    var parts = inp.value.split(/[,\n]/); parts.pop(); var rest = parts.length ? parts.map(function (x) { return x.trim(); }).join(', ') + ', ' : '';
    add([{ nombre: r.nombre, cant: '', nota: r.nota || '', sec: r.sec, hecho: false }]);
    inp.value = rest; $('#sugs').innerHTML = ''; inp.focus();
  });
  /* pantalla encendida mientras la lista está abierta */
  var wl = null;
  function wake() { if (!('wakeLock' in navigator) || document.hidden || !S.ready || wl) return; navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {}); }
  document.addEventListener('visibilitychange', wake);
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
  function login() { screen('<img src="icons/icon-192.png" alt=""><h1>CompraDona</h1><p>La lista de la compra pa la tetita de Noah. Lo que apunta uno, le aparece al otro al momento.</p><button class="btn big" id="go">Entrar con Google</button>'); $('#go').onclick = function () { G.signIn({ prompt: 'select_account' }); }; }
  function start() { $('#welcome').hidden = true; $('#main').hidden = false; S.ready = true; render(); refresh(); wake(); document.addEventListener('click', wake, { once: true }); }
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
  $('#count').addEventListener('click', function () { flush(); refresh(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.ready) refresh(); });
  setInterval(function () { if (!document.hidden && S.ready && !$('#layer').innerHTML && document.activeElement !== inp) refresh(); }, 5000);
  addEventListener('online', function () { flush(); refresh(); });
  root.Compra = { guess: guess, parse: parse };
  boot();
})(window);
