/* Noah APP — interfaz */
(function (root) {
  'use strict';
  var API = root.MOCK_API || root.GAPI, R = root.REF, ls = API.ls;
  var S = root.S = { view: 'home', me: ls('me'), recs: ls('cache') || [], queue: ls('queue') || [], seg: { peso: 'farmacia', citas: 'citas', diario: 'todo' }, syncing: false, showPast: false };
  var $ = function (s) { return document.querySelector(s); };
  var app = $('#app'), layer = $('#layer'), nav = $('#nav');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function parseD(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function days(a, b) { var x = parseD(a), y = parseD(b); return x && y ? Math.round((y - x) / 864e5) : null; }
  function addMonths(s, n) { var d = parseD(s); if (!d) return ''; var day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d); }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  function fd(s, wd) { var d = parseD(s); if (!d) return ''; var y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''; return (wd ? DIA[d.getDay()] + ' ' : '') + d.getDate() + ' ' + MES[d.getMonth()] + y; }
  function rel(s) { var n = days(today(), s); if (n === null) return ''; if (n === 0) return 'hoy'; if (n === 1) return 'mañana'; if (n === -1) return 'ayer'; return n > 0 ? 'en ' + n + ' días' : 'hace ' + (-n) + ' días'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function kg(g) { return g ? (g / 1000).toFixed(3).replace('.', ',') : '—'; }
  function num(v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function grams(v) { var n = num(v); if (n == null) return null; return Math.round(n < 50 ? n * 1000 : n); }
  function dec(n) { return n == null ? '' : String(n).replace('.', ','); }
  function signed(g) { return (g > 0 ? '+' : g < 0 ? '−' : '±') + Math.abs(g) + ' g'; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  /* ---------- datos ---------- */
  function live(t) { return S.recs.filter(function (r) { return r.tipo === t && !r.borrado; }); }
  function byId(id) { return S.recs.find(function (r) { return r.id === id; }); }
  function perfil() { var p = live('perfil').sort(function (a, b) { return (a.mod || a.creado) < (b.mod || b.creado) ? -1 : 1; }).pop(); return p ? p.d : {}; }
  function birth() { return perfil().nacimiento || ''; }
  function ageDays(s) { return days(birth(), s || today()); }
  function ageText() {
    var n = ageDays(); if (n == null) return ''; if (n < 0) return 'Aún no ha nacido';
    if (n < 14) return plural(n, 'día', 'días');
    if (n < 91) { var w = Math.floor(n / 7), r = n % 7; return plural(w, 'semanita', 'semanitas') + (r ? ' y ' + plural(r, 'día', 'días') : ''); }
    var b = parseD(birth()), t = new Date(), m = (t.getFullYear() - b.getFullYear()) * 12 + t.getMonth() - b.getMonth(); if (t.getDate() < b.getDate()) m--;
    var rest = days(addMonths(birth(), m), today());
    if (m < 24) return plural(m, 'mes', 'meses') + (rest ? ' y ' + plural(rest, 'día', 'días') : '');
    return plural(Math.floor(m / 12), 'año', 'años') + (m % 12 ? ' y ' + plural(m % 12, 'mes', 'meses') : '');
  }
  function weights(kind) {
    var list = kind === 'farmacia' ? live('peso') : live('consulta');
    list = list.filter(function (r) { return r.d.g; }).map(function (r) { return { id: r.id, fecha: r.fecha, g: r.d.g, rec: r }; });
    if (kind === 'consulta' && perfil().peso) list.push({ id: '_nac', fecha: birth(), g: perfil().peso, birth: true });
    return list.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
  }
  function centroVac() { return perfil().centroVacunas || ''; }
  function pedName(id) { var p = byId(id); return p && !p.borrado ? p.d.nombre : ''; }
  function pedPlace(p) { return p ? [p.d.centro, p.d.direccion].filter(Boolean).join(', ') : ''; }

  /* ---------- guardar (con cola sin conexión) ---------- */
  function persist() { ls('cache', S.recs); ls('queue', S.queue); }
  function save(rec, msg) {
    var now = new Date().toISOString();
    if (!rec.id) { rec.id = uid(); rec.creado = now; rec.autor = (S.me && S.me.name) || ''; S.recs.push(rec); S.queue.push({ op: 'add', recs: [rec] }); }
    else { rec.mod = now; rec.modAutor = (S.me && S.me.name) || ''; var i = S.recs.findIndex(function (r) { return r.id === rec.id; }); if (i >= 0) S.recs[i] = rec; else S.recs.push(rec); S.queue.push({ op: 'upd', rec: rec }); }
    persist(); closeSheet(); render(); if (msg) toast(msg); flush();
  }
  function remove(rec, msg) { rec = Object.assign({}, rec, { borrado: true }); save(rec, msg || 'Borrado'); }
  function addMany(recs) {
    var now = new Date().toISOString();
    recs.forEach(function (r) { r.creado = r.creado || now; r.autor = r.autor || (S.me && S.me.name) || ''; S.recs.push(r); });
    S.queue.push({ op: 'add', recs: recs }); persist(); flush();
  }
  var reauthing = false;
  function flush() {
    if (S.syncing || !S.queue.length) return Promise.resolve();
    S.syncing = true; paintSync();
    var job = S.queue[0];
    var p = job.op === 'add' ? API.add(job.recs) : API.update(job.rec);
    return p.then(function () { S.queue.shift(); persist(); S.syncing = false; paintSync(); return flush(); })
      .catch(function (e) { S.syncing = false; paintSync(); if (e.auth) reauth(); });
  }
  function reauth() {
    if (reauthing) return; reauthing = true;
    try {
      if (sessionStorage.getItem('noah.reauth')) {
        if (!S.ready) screen('<h1>Noah APP</h1><p>Google necesita que vuelvas a entrar.</p><button class="btn big" data-act="login">Entrar con Google</button>');
        else toast('Vuelve a entrar con Google para guardar los cambios');
        return;
      }
      sessionStorage.setItem('noah.reauth', '1');
    } catch (e) {}
    API.signIn();
  }
  function refresh(quiet) {
    if (!API.fileId()) return Promise.resolve();
    return API.load().then(function (recs) {
      var pend = {}; S.queue.forEach(function (j) { (j.recs || [j.rec]).forEach(function (r) { pend[r.id] = r; }); });
      recs = recs.filter(function (r) { return !pend[r.id]; }).concat(Object.keys(pend).map(function (k) { return pend[k]; }));
      S.recs = recs; persist(); try { sessionStorage.removeItem('noah.reauth'); } catch (e) {}
      if (!layer.innerHTML) render(); flush();
    }).catch(function (e) { if (e.auth) reauth(); else if (!quiet) toast(navigator.onLine === false ? 'Sin conexión: ves lo último guardado' : 'No he podido actualizar: ' + e.message); });
  }
  function paintSync() {
    var el = $('#sync'); if (!el) return;
    var n = S.queue.reduce(function (a, j) { return a + (j.recs ? j.recs.length : 1); }, 0);
    el.hidden = !n; el.textContent = S.syncing ? 'Guardando…' : n + (n === 1 ? ' cambio' : ' cambios') + ' sin subir · toca para reintentar';
  }

  /* ---------- piezas visuales ---------- */
  var DINO = '<svg class="dino" viewBox="0 0 200 200" aria-hidden="true"><g transform="translate(8 6)"><path d="M62 118 C40 124 22 138 10 162 C34 156 52 150 70 142 Z" fill="#2F6BFF"/><path d="M104 40 l7-16 9 12 8-16 9 13 8-14 7 16 z" fill="#FF8A3D" stroke="#FF8A3D" stroke-width="4" stroke-linejoin="round"/><ellipse cx="92" cy="118" rx="44" ry="42" fill="#2F6BFF"/><rect x="88" y="34" width="86" height="64" rx="30" fill="#2F6BFF"/><path d="M96 70 C90 84 88 96 92 108 L120 100 Z" fill="#2F6BFF"/><ellipse cx="98" cy="128" rx="26" ry="26" fill="#BFD3FF"/><rect x="66" y="146" width="22" height="34" rx="11" fill="#1F55E0"/><rect x="100" y="146" width="22" height="34" rx="11" fill="#2F6BFF"/><path d="M124 108 q12 4 12 14" stroke="#2F6BFF" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M118 80 Q146 92 172 78" stroke="#14285E" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M130 85 l4 7 4-6 M146 86 l4 7 4-7 M160 83 l3 6 4-7" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="140" cy="56" r="11" fill="#fff"/><circle cx="143" cy="57" r="6.5" fill="#14285E"/><circle cx="145" cy="54.5" r="2.2" fill="#fff"/><circle cx="166" cy="48" r="2.6" fill="#14285E"/><circle cx="126" cy="72" r="6" fill="#FF9EB4" opacity=".8"/></g></svg>';
  var ICON = {
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/></svg>',
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  function calLink(c) {
    var t = c.d.titulo || 'Cita', ped = byId(c.d.ped), place = c.d.lugar || pedPlace(ped);
    var det = [ped ? pedName(c.d.ped) : '', c.d.notas || ''].filter(Boolean).join('\n');
    var dates;
    if (c.d.hora) {
      var st = new Date(c.fecha + 'T' + c.d.hora + ':00'), en = new Date(st.getTime() + (c.d.dur || 30) * 60000);
      var f = function (d) { return iso(d).replace(/-/g, '') + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
      dates = f(st) + '/' + f(en);
    } else { var nx = parseD(c.fecha); nx.setDate(nx.getDate() + 1); dates = c.fecha.replace(/-/g, '') + '/' + iso(nx).replace(/-/g, ''); }
    return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: '🦖 Noah · ' + t, dates: dates, ctz: 'Europe/Madrid', location: place, details: det }).toString();
  }
  function mapLink(addr) { return 'https://maps.apple.com/?q=' + encodeURIComponent(addr); }
  function tel(t) { return 'tel:' + String(t).replace(/[^\d+]/g, ''); }
  function head(title, sub, extra) { return '<header class="top"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra || '') + '</header>'; }
  function seg(key, opts) {
    return '<div class="seg" role="tablist">' + opts.map(function (o) { return '<button role="tab" data-act="seg" data-k="' + key + '" data-v="' + o[0] + '" class="' + (S.seg[key] === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function empty(txt, act, label) { return '<div class="empty"><p>' + txt + '</p>' + (act ? '<button class="btn" data-act="' + act + '">' + label + '</button>' : '') + '</div>'; }
  function by(r) { if (!r || !r.autor) return ''; return '<span class="by">' + esc(r.autor) + '</span>'; }

  /* ---------- INICIO ---------- */
  function pcChip(d, g) { var pc = R.percentile(d, g / 1000); return pc ? '<button class="pc" data-act="pcInfo" data-p="' + pc + '">Percentil ' + pc + '<i>?</i></button>' : ''; }
  function lastWeight() {
    var all = weights('farmacia').concat(weights('consulta')).sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; }), last = all[all.length - 1];
    if (!last) return null;
    var kind = last.birth || last.rec.tipo === 'consulta' ? 'consulta' : 'farmacia', ser = weights(kind), i = ser.findIndex(function (x) { return x.id === last.id; });
    return { w: last, prev: ser[i - 1] };
  }
  function greet() { var h = new Date().getHours(), n = S.me && S.me.name ? ', ' + esc(S.me.name) : ''; return (h < 6 ? '¡Buenas noches' : h < 13 ? '¡Buenos días' : h < 21 ? '¡Buenas tardes' : '¡Buenas noches') + n + '!'; }
  function gainShort(a, b) { var g = b.g - a.g, d = days(a.fecha, b.fecha) || 0; return d >= 4 && g > 0 ? '+' + Math.round(g / d * 7) + ' g/semana' : signed(g) + ' en ' + plural(d, 'día', 'días'); }
  function foto() { var f = live('foto').sort(function (a, b) { return (a.creado || '') < (b.creado || '') ? -1 : 1; }).pop(); return f ? f.d.img : ''; }
  function spark() {
    var pts = weights('farmacia').concat(weights('consulta')).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).slice(-8);
    if (pts.length < 2) return '';
    var xs = pts.map(function (p) { return ageDays(p.fecha); }), ys = pts.map(function (p) { return p.g; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs) || 1, y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var P = pts.map(function (p, i) { return [4 + 112 * (xs[i] - x0) / ((x1 - x0) || 1), 30 - 26 * (ys[i] - y0) / ((y1 - y0) || 1)]; });
    var d = P.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''), e = P[P.length - 1];
    return '<svg class="spark" viewBox="0 0 120 34" aria-hidden="true"><path d="' + d + ' L' + e[0].toFixed(1) + ' 34 L4 34 Z" class="sa"/><path d="' + d + '" class="sl"/><circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="3.2" class="sd"/></svg>';
  }
  function vHome() {
    var p = perfil(), up = live('cita').filter(function (c) { return c.fecha >= today(); }).sort(cmpCita), next = up[0], img = foto();
    var h = '<div class="home"><section class="hero2' + (img ? ' has' : '') + '"' + (img ? ' style="background-image:url(' + img + ')"' : '') + '>' +
      (img ? '' : '<div class="hph">' + DINO + '<button class="addph" data-act="photo">Poner una foto de ' + esc(p.nombre || 'Noah') + '</button></div>') +
      '<button class="gear" data-act="settings" aria-label="Ajustes">' + ICON.gear + '</button>' +
      '<div class="hcap"><p class="hi">' + greet() + '</p><h1>' + esc(p.nombre || 'Noah') + '</h1><p class="age">' + esc(ageText() || 'Pon su fecha de nacimiento en Ajustes') + '</p></div></section>';
    if (!S.recs.length) return h + '<div class="card hi"><h3>Empieza aquí</h3><p class="mut">Pega el texto de importación y aparecerán los datos de Noah.</p><div class="row2"><button class="btn" data-act="import">Importar datos</button></div></div></div>';
    if (next) {
      var n = days(today(), next.fecha);
      h += '<section class="nextc" data-act="editCita" data-id="' + next.id + '"><div class="nxh"><span class="lbl">Lo próximo</span><span class="cd' + (n <= 1 ? ' hot' : '') + '">' + rel(next.fecha) + '</span></div>' +
        '<div class="nxm">' + dateBox(next.fecha) + '<div class="lm"><p class="ttl">' + esc(next.d.titulo) + '</p><p class="mut sm">' + citaLine(next) + '</p></div><a class="ib" href="' + esc(calLink(next)) + '" target="_blank" rel="noopener" aria-label="Añadir a Calendar">' + ICON.cal + '</a></div>' +
        (up.length > 1 ? '<div class="after" data-act="go" data-v="citas">' + up.slice(1, 3).map(function (c) { return '<span><b>' + fd(c.fecha) + '</b> ' + esc(c.d.titulo) + '</span>'; }).join('') + (up.length > 3 ? '<span class="more">+' + (up.length - 3) + '</span>' : '') + '</div>' : '') + '</section>';
    }
    var lw = lastWeight(), nv = nextVac(), tr = activeTreat(), pend = live('pendiente').filter(function (x) { return !x.d.hecho; }), st = weightStatus();
    h += '<div class="tiles">';
    h += '<div class="tile" data-act="go" data-v="peso"><p class="lbl">Peso' + (lw ? ' · ' + fd(lw.w.fecha) : '') + '</p>' + (lw ? '<p class="big">' + kg(lw.w.g) + '<small>kg</small></p>' + spark() +
      '<div class="trow2">' + pcChip(ageDays(lw.w.fecha), lw.w.g) + (st ? '<span class="stl s-' + st.level + '">' + (st.level === 'ok' ? 'Va de lujo' : esc(st.title)) + '</span>' : '') + '</div>' : '<p class="mut sm">Sin pesadas</p>') + '</div>';
    var vd = nv ? days(today(), nv.cita ? nv.cita.fecha : nv.due) : null;
    h += '<div class="tile" data-act="go" data-v="vacunas"><p class="lbl">Vacunas</p>' + (nv ? '<p class="big">' + (vd > 0 ? vd + '<small>días</small>' : 'Ya') + '</p><p class="sm strong">' + esc(nv.g.label) + ' · ' + plural(nv.g.vacs.length, 'vacuna', 'vacunas') + '</p><p class="mut sm">' + (nv.cita ? 'Cita ' + fd(nv.cita.fecha) + (nv.cita.d.hora ? ', ' + esc(nv.cita.d.hora) : '') : 'Desde el ' + fd(nv.due)) + '</p>' : '<p class="mut sm">Al día</p>') + '</div>';
    h += '<div class="tile" data-act="go" data-v="diario"><p class="lbl">Tratamiento</p>' + (tr.length ? tr.slice(0, 2).map(function (t) { return '<p class="strong">' + esc(t.d.nombre.replace(/\s*\(.*\)/, '')) + '</p><p class="mut sm">' + esc(t.d.pauta || '') + '</p>'; }).join('') : '<p class="mut sm">Ninguno ahora</p>') + '</div>';
    h += '<div class="tile" data-act="go" data-v="diario"><p class="lbl">Pendiente</p>' + (pend.length ? '<p class="big">' + pend.length + '</p><p class="mut sm one">' + esc(pend[0].d.texto) + '</p>' : '<p class="mut sm">Nada pendiente, ¡qué gloria!</p>') + '</div></div>';
    return h + '</div>';
  }
  function gainText(a, b) {
    var g = b.g - a.g, d = days(a.fecha, b.fecha) || 0;
    return signed(g) + ' en ' + plural(d, 'día', 'días') + (d >= 4 && g > 0 ? ' · ≈ ' + Math.round(g / d * 7) + ' g/semana' : '');
  }
  function activeTreat() { return live('tratamiento').filter(function (t) { return (!t.d.desde || t.d.desde <= today()) && (!t.d.hasta || t.d.hasta >= today()); }); }

  /* ---------- CITAS y PEDIATRAS ---------- */
  function cmpCita(a, b) { var x = a.fecha + (a.d.hora || ''), y = b.fecha + (b.d.hora || ''); return x < y ? -1 : x > y ? 1 : 0; }
  function dateBox(s) { var d = parseD(s); return '<div class="dt"><b>' + d.getDate() + '</b><span>' + MES[d.getMonth()] + '</span></div>'; }
  function citaLine(c) {
    var ped = byId(c.d.ped); ped = ped && !ped.borrado ? ped : null;
    return [DIA[parseD(c.fecha).getDay()] + (c.d.hora ? ' ' + esc(c.d.hora) : ''), ped ? esc(ped.d.nombre) : '', c.d.lugar ? esc(c.d.lugar.split(',')[0]) : ped && ped.d.centro ? esc(ped.d.centro) : ''].filter(Boolean).join(' · ');
  }
  function citaRow(c, past) {
    return '<div class="lrow' + (past ? ' past' : '') + '" data-act="editCita" data-id="' + c.id + '">' + dateBox(c.fecha) + '<div class="lm">' + (past ? '' : '<p class="lbl">' + rel(c.fecha) + '</p>') + '<p class="strong">' + esc(c.d.titulo) + '</p><p class="mut sm">' + citaLine(c) + '</p>' + (c.d.notas ? '<p class="mut sm">' + esc(c.d.notas) + '</p>' : '') + '</div>' +
      (past ? '' : '<a class="ib" href="' + esc(calLink(c)) + '" target="_blank" rel="noopener" aria-label="Añadir a Calendar">' + ICON.cal + '</a>') + '</div>';
  }
  function vCitas() {
    var h = head('Citas', '', '<button class="add" data-act="' + (S.seg.citas === 'citas' ? 'addCita' : 'addPed') + '" aria-label="Añadir">' + ICON.plus + '</button>') + seg('citas', [['citas', 'Citas'], ['peds', 'Pediatras']]) + '<div class="stack">';
    if (S.seg.citas === 'peds') {
      var ps = live('pediatra');
      if (!ps.length) return h + empty('Aún no hay pediatras.', 'addPed', 'Añadir pediatra') + '</div>';
      return h + ps.map(function (p) {
        var d = p.d;
        return '<div class="card" data-act="editPed" data-id="' + p.id + '"><p class="strong">' + esc(d.nombre) + '</p><p class="mut">' + esc(d.centro || '') + '</p>' +
          (centroVac() && d.centro && centroVac().indexOf(d.centro.split(' ')[0]) >= 0 ? '' : '') +
          (d.direccion ? '<p class="mut sm">' + esc(d.direccion) + '</p>' : '') + (d.notas ? '<p class="note">' + esc(d.notas) + '</p>' : '') + '<div class="row2">' +
          (d.tel ? '<a class="btn sm" href="' + tel(d.tel) + '" data-stop>' + ICON.phone + esc(d.tel) + '</a>' : '') +
          (d.direccion ? '<a class="btn sm ghost" href="' + mapLink([d.centro, d.direccion].join(', ')) + '" target="_blank" rel="noopener" data-stop>' + ICON.pin + 'Cómo llegar</a>' : '') +
          (d.web ? '<a class="btn sm ghost" href="' + esc(/^https?:/.test(d.web) ? d.web : 'https://' + d.web) + '" target="_blank" rel="noopener" data-stop>' + ICON.web + 'Web</a>' : '') +
          (d.tel2 ? '<a class="btn sm ghost" href="' + tel(d.tel2) + '" data-stop>' + ICON.phone + esc(d.tel2Label || 'Otro') + '</a>' : '') + '</div></div>';
      }).join('') + '</div>';
    }
    var all = live('cita').sort(cmpCita), up = all.filter(function (c) { return c.fecha >= today(); }), past = all.filter(function (c) { return c.fecha < today(); }).reverse();
    if (!all.length) return h + empty('No hay citas apuntás todavía.', 'addCita', 'Añadir cita') + '</div>';
    h += up.length ? '<div class="list">' + up.map(function (c) { return citaRow(c); }).join('') + '</div>' : '<p class="mut pad">No hay citas próximas.</p>';
    if (past.length) {
      h += '<button class="link" data-act="togglePast">' + (S.showPast ? 'Ocultar' : 'Ver') + ' citas pasadas (' + past.length + ')</button>';
      if (S.showPast) h += '<div class="list">' + past.map(function (c) { return citaRow(c, true); }).join('') + '</div>';
    }
    return h + '</div>';
  }

  /* ---------- valoración orientativa del peso (tablas OMS) ---------- */
  function weightStatus() {
    var lw = lastWeight(); if (!lw || !birth()) return null;
    var L = lw.w, kind = L.birth || L.rec.tipo === 'consulta' ? 'consulta' : 'farmacia', ser = weights(kind).filter(function (x) { return x.fecha <= L.fecha && x.id !== L.id; });
    var dL = ageDays(L.fecha), zL = R.zOf(dL, L.g / 1000), pL = R.percentile(dL, L.g / 1000);
    // punto de comparación: el de la misma báscula más cercano a 2 semanas antes (mínimo 6 días)
    var base = null; ser.forEach(function (x) { var g = days(x.fecha, L.fecha); if (g >= 6 && (!base || Math.abs(g - 14) < Math.abs(days(base.fecha, L.fecha) - 14))) base = x; });
    var o = { p: pL, level: 'ok', lines: [], kind: kind };
    if (base) {
      var dB = ageDays(base.fecha), zB = R.zOf(dB, base.g / 1000), span = dL - dB, gain = L.g - base.g;
      o.wk = Math.round(gain / span * 7);
      o.expWk = Math.round((R.weightAt(dL, zB) - R.weightAt(dB, zB)) * 1000 / span * 7);
      o.pB = R.percentile(dB, base.g / 1000); o.ratio = o.expWk > 0 ? o.wk / o.expWk : 1;
      o.lines.push('Ha ganado <b>' + gain + ' g en ' + span + ' días</b>, unos ' + o.wk + ' g por semana. Siguiendo su curva se esperarían unos ' + o.expWk + ' g por semana.');
      if (Math.abs(o.pB - pL) >= 5) o.lines.push('Ha pasado del percentil ' + o.pB + ' al <b>' + pL + '</b>' + (pL > o.pB ? ': va cogiendo ritmo.' : '.'));
      if (gain < 0 && dL > 10) { o.level = 'watch'; o.title = 'Ha perdido algo de peso'; o.tip = 'Coméntalo con la pediatra.'; }
      else if (o.ratio < 0.5 && dL > 14) { o.level = 'watch'; o.title = 'Gana menos de lo que marca su curva'; o.tip = 'Coméntalo con la pediatra en la próxima revisión.'; }
    }
    if (o.level === 'ok' && pL < 3) { o.level = 'watch'; o.title = 'Está por debajo de lo habitual'; o.tip = 'Coméntalo con la pediatra.'; }
    else if (o.level === 'ok' && pL > 97) { o.level = 'info'; o.title = 'Está por encima de lo habitual'; o.tip = 'Suele no tener importancia; coméntalo en la revisión.'; }
    if (!o.title) o.title = o.ratio >= 1.25 ? 'Va de lujo, ganando con ganas' : 'Va de lujo, siguiendo su curva';
    o.lines.unshift('Pesa más que <b>' + pL + ' de cada 100</b> bebés de su edad.');
    // recuperó el peso de nacimiento
    var bw = perfil().peso;
    if (bw) {
      var rec = weights('farmacia').concat(weights('consulta')).filter(function (x) { return !x.birth && x.g >= bw; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; })[0];
      if (rec && ageDays(rec.fecha) <= 21) o.lines.push('Ya había recuperado su peso de nacimiento a los ' + ageDays(rec.fecha) + ' días (lo habitual es hacerlo antes de los 10–14).');
    }
    // hacia dónde va
    for (var m = 1; m <= 24; m++) { var dm = addMonths(birth(), m); if (dm > today()) { o.proj = { m: m, fecha: dm, kg: R.weightAt(days(birth(), dm), zL) }; break; } }
    o.z = zL; o.dL = dL; o.last = L;
    return o;
  }
  function statusCard() {
    var o = weightStatus(); if (!o) return '';
    var ico = o.level === 'ok' ? ICON.check : '<b>!</b>';
    return '<div class="card stat s-' + o.level + '"><div class="sth"><span class="sti">' + ico + '</span><div><p class="lbl">Cómo va</p><h3>' + esc(o.title) + '</h3></div></div>' +
      '<div class="mini"><div><b>' + o.p + '</b><span>percentil' + (o.pB && o.pB !== o.p ? ' (antes ' + o.pB + ')' : '') + '</span></div>' +
      (o.wk != null ? '<div><b>' + (o.wk > 0 ? '+' : '') + o.wk + ' g</b><span>por semana</span></div><div><b>' + o.expWk + ' g</b><span>pide su curva</span></div>' : '') + '</div>' +
      '<ul class="why">' + o.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + (o.tip ? '<li><b>' + esc(o.tip) + '</b></li>' : '') + '</ul>' +
      (o.proj ? '<p class="proj">Si sigue en su curva, rondará los <b>' + dec(o.proj.kg.toFixed(1)) + ' kg</b> al cumplir ' + plural(o.proj.m, 'mes', 'meses') + ' (' + fd(o.proj.fecha) + ').</p>' : '') +
      '<p class="mut sm">Orientativo, con las tablas de la OMS. Quien lo valora es la pediatra. <button class="link sm" data-act="pcInfo" data-p="' + o.p + '">¿Qué es el percentil?</button></p></div>';
  }

  /* ---------- PESO ---------- */
  function vPeso() {
    var k = S.seg.peso, list = weights(k);
    var h = head('Peso', '', '<button class="add" data-act="' + (k === 'farmacia' ? 'addPeso' : 'addCons') + '" aria-label="Añadir">' + ICON.plus + '</button>');
    h += statusCard() + '<div class="card chart">' + chart() + '<div class="legend"><span><i class="lf"></i>Farmacia</span><span><i class="lc"></i>Consulta</span><span><i class="lb"></i>OMS</span><span><i class="lp"></i>Su curva</span></div></div>';
    h += seg('peso', [['farmacia', 'Farmacia'], ['consulta', 'Consulta']]);
    if (!list.length) return h + empty(k === 'farmacia' ? 'Apunta aquí la pesada semanal de la farmacia.' : 'Aquí van peso, talla y perímetro de las consultas.', k === 'farmacia' ? 'addPeso' : 'addCons', 'Añadir');
    return h + '<div class="list">' + list.slice().reverse().map(function (w, i, arr) {
      var prev = arr[i + 1], r = w.rec, d = r ? r.d : perfil(), pc = R.percentile(ageDays(w.fecha), w.g / 1000);
      var sub = [pc ? 'Percentil ' + pc : '', k === 'consulta' && d.talla ? dec(d.talla) + ' cm' : '', k === 'consulta' && d.pc ? 'PC ' + dec(d.pc) + ' cm' : ''].filter(Boolean).join(' · ');
      var where = w.birth ? 'Nacimiento' : (r.d.ped ? pedName(r.d.ped).replace(/^Dra?\.\s*/, '').split(' ')[0] : '') || r.d.lugar || '';
      return '<div class="lrow" ' + (r ? 'data-act="' + (k === 'farmacia' ? 'editPeso' : 'editCons') + '" data-id="' + r.id + '"' : 'data-act="perfil"') + '><div class="wd"><b>' + fd(w.fecha) + '</b><span>' + esc(where || plural(ageDays(w.fecha), 'día', 'días')) + '</span></div>' +
        '<div class="lm"><p class="kg">' + kg(w.g) + '<small> kg</small></p><p class="mut sm">' + sub + '</p></div>' +
        (prev ? '<div class="gain ' + (w.g - prev.g >= 0 ? 'up' : 'dn') + '">' + signed(w.g - prev.g) + '<small>en ' + plural(days(prev.fecha, w.fecha), 'día', 'días') + '</small></div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function chart() {
    var W = 340, H = 168, L = 30, B = 22, T = 8, Rr = 30;
    var pts = function (k) { return weights(k).map(function (w) { return { x: ageDays(w.fecha), y: w.g / 1000 }; }).filter(function (p) { return p.x != null && p.x >= 0; }); };
    var pf = pts('farmacia'), pcn = pts('consulta'), xs = pf.concat(pcn).map(function (p) { return p.x; });
    var xmax = Math.max(56, (xs.length ? Math.max.apply(null, xs) : 0) + 21, (ageDays() || 0) + 7); xmax = Math.min(xmax, 731);
    var lo = R.weightAt(0, R.Z.p3), hi = R.weightAt(xmax, R.Z.p97);
    pf.concat(pcn).forEach(function (p) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); });
    lo = Math.floor((lo - 0.2) * 2) / 2; hi = Math.ceil((hi + 0.1) * 2) / 2;
    var X = function (d) { return L + (W - L - Rr) * d / xmax; }, Y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var step = xmax / 48, curve = function (z) { var a = []; for (var d = 0; d <= xmax + 0.01; d += step) a.push([X(d), Y(R.weightAt(d, z))]); return a; };
    var poly = function (a, b) { return a.concat(b.slice().reverse()).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    var line = function (a) { return a.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(''); };
    var c3 = curve(R.Z.p3), c15 = curve(R.Z.p15), c50 = curve(R.Z.p50), c85 = curve(R.Z.p85), c97 = curve(R.Z.p97);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="wchart" role="img" aria-label="Gráfica de peso con percentiles OMS">';
    var yst = hi - lo > 4 ? 1 : 0.5;
    for (var v = lo; v <= hi + 1e-6; v += yst) s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="gl"/><text x="' + (L - 5) + '" y="' + (Y(v) + 3) + '" class="ax" text-anchor="end">' + dec(v) + '</text>';
    var weeks = xmax <= 98, tick = weeks ? 7 : R.DPM * (xmax > 400 ? 3 : 1);
    for (var t = tick, n = 1; t < xmax; t += tick, n++) s += '<text x="' + X(t) + '" y="' + (H - 6) + '" class="ax" text-anchor="middle">' + (weeks ? n + 's' : Math.round(t / R.DPM) + 'm') + '</text>';
    s += '<polygon points="' + poly(c3, c97) + '" class="b1"/><polygon points="' + poly(c15, c85) + '" class="b2"/><path d="' + line(c50) + '" class="p50"/>';
    [['P97', c97], ['P85', c85], ['P50', c50], ['P15', c15], ['P3', c3]].forEach(function (q) { var e = q[1][q[1].length - 1]; s += '<text x="' + (e[0] + 3) + '" y="' + (e[1] + 3) + '" class="pl">' + q[0] + '</text>'; });
    var ser = function (a, cls) { if (!a.length) return ''; var o = a.length > 1 ? '<path d="' + line(a.map(function (p) { return [X(p.x), Y(p.y)]; })) + '" class="sl ' + cls + '"/>' : ''; return o + a.map(function (p) { return '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="4.5" class="dot ' + cls + '"/>'; }).join(''); };
    var st = weightStatus();
    if (st && st.dL < xmax) { var pr = []; for (var dd = st.dL; dd <= xmax + 0.01; dd += step) pr.push([X(dd), Y(R.weightAt(dd, st.z))]); s += '<path d="' + line(pr) + '" class="proj"/>'; }
    s += ser(pcn, 'c') + ser(pf, 'f');
    if (st) { var lx = X(st.dL), ly = Y(st.last.g / 1000), tx = 'P' + st.p, wdt = tx.length * 6 + 10; s += '<rect x="' + (lx - wdt / 2) + '" y="' + (ly - 26) + '" width="' + wdt + '" height="16" rx="8" class="lab"/><text x="' + lx + '" y="' + (ly - 14.5) + '" class="labt" text-anchor="middle">' + tx + '</text>'; }
    var td = ageDays(); if (td != null && td >= 0 && td <= xmax) s += '<line x1="' + X(td) + '" x2="' + X(td) + '" y1="' + T + '" y2="' + (H - B) + '" class="now"/>';
    return s + '</svg>';
  }

  /* ---------- VACUNAS ---------- */
  function vchip(x) { return '<span class="vc' + (x.rec ? ' rec' : '') + '" title="' + esc(R.VNAMES[x.code]) + '">' + esc(R.vacLabel(x)) + (x.rec ? '<i>rec.</i>' : '') + '</span>'; }
  function givenFor(key) { return live('vacuna').filter(function (v) { return v.d.grupo === key; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); }
  function citaFor(key) { return live('cita').filter(function (c) { return c.d.vac === key && c.fecha >= today(); }).sort(cmpCita)[0]; }
  function nextVac() {
    for (var i = 0; i < R.VACCINES.length; i++) { var g = R.VACCINES[i]; if (!givenFor(g.key).length) return { g: g, due: addMonths(birth(), g.months), cita: citaFor(g.key) }; }
    return null;
  }
  function vVacunas() {
    var h = head('Vacunas', centroVac() ? 'Se ponen en ' + esc(centroVac()) : '', '<button class="add" data-act="addVacExtra" aria-label="Añadir otra vacuna">' + ICON.plus + '</button>') + '<div class="list">';
    live('vacuna').filter(function (v) { return !v.d.grupo; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).forEach(function (v) {
      h += '<div class="lrow" data-act="editVac" data-id="' + v.id + '"><span class="vd done">' + ICON.check + '</span><div class="lm"><p class="strong">' + esc(v.d.nombre) + '</p><p class="mut sm">Puesta el ' + fd(v.fecha) + (v.d.lote ? ' · lote ' + esc(v.d.lote) : '') + '</p></div></div>';
    });
    var nv = nextVac();
    R.VACCINES.forEach(function (g) {
      var given = givenFor(g.key), due = birth() ? parseD(addMonths(birth(), g.months)) : null;
      if (nv && nv.g.key === g.key) {
        h += '<div class="vnext" data-act="vacGroup" data-k="' + g.key + '"><div class="vh"><span class="vd next"></span><p class="strong">Vacunas de los ' + g.label + '</p></div><p class="mut sm">Desde el ' + fd(nv.due, true) + '</p>' +
          (nv.cita ? '<p class="citav">' + ICON.cal + 'Cita el ' + fd(nv.cita.fecha, true) + (nv.cita.d.hora ? ' a las ' + esc(nv.cita.d.hora) : '') + '</p>' : '') + '<div class="chips">' + g.vacs.map(vchip).join('') + '</div></div>';
        return;
      }
      h += '<div class="lrow" data-act="vacGroup" data-k="' + g.key + '"><span class="vd' + (given.length ? ' done' : '') + '">' + (given.length ? ICON.check : '') + '</span><div class="lm"><p class="strong">' + g.label + '</p><p class="mut sm">' +
        g.vacs.map(function (x) { return x.code; }).join(', ') + '</p></div><span class="st' + (given.length ? ' ok' : '') + '">' + (given.length ? 'Puesta ' + fd(given[0].fecha) : due ? MES[due.getMonth()] + ' ' + due.getFullYear() : '') + '</span></div>';
    });
    return h + '</div><p class="foot">Calendario de la cartilla; «rec.» es recomendada. Toca un grupo para ver el detalle o marcarlo. Confirma siempre con la pediatra.</p>';
  }

  /* ---------- DIARIO ---------- */
  var DTYPES = { tratamiento: 'Tratamiento', nota: 'Nota', pendiente: 'Pendiente' };
  function vDiario() {
    var f = S.seg.diario;
    var h = head('Diario', 'Tratamientos, notas y cosas pendientes', '<button class="add" data-act="addDiario" aria-label="Añadir">' + ICON.plus + '</button>') + seg('diario', [['todo', 'Todo'], ['tratamiento', 'Tratamientos'], ['nota', 'Notas'], ['pendiente', 'Pendientes']]) + '<div class="stack">';
    var list = S.recs.filter(function (r) { return !r.borrado && DTYPES[r.tipo] && (f === 'todo' || r.tipo === f); });
    if (!list.length) return h + empty('Aquí no hay ná todavía.', 'addDiario', 'Añadir') + '</div>';
    list.sort(function (a, b) {
      var pa = a.tipo === 'pendiente' && !a.d.hecho, pb = b.tipo === 'pendiente' && !b.d.hecho; if (pa !== pb) return pa ? -1 : 1;
      return (b.fecha || '') < (a.fecha || '') ? -1 : (b.fecha || '') > (a.fecha || '') ? 1 : (b.creado < a.creado ? -1 : 1);
    });
    return h + list.map(function (r) {
      var d = r.d, act = r.tipo === 'tratamiento' && activeTreat().indexOf(r) >= 0;
      var body = r.tipo === 'tratamiento' ? '<p class="strong">' + esc(d.nombre) + (act ? ' <span class="tag sm">En curso</span>' : '') + '</p><p class="mut">' + esc(d.pauta || '') + '</p><p class="mut sm">' + (d.desde ? 'Desde el ' + fd(d.desde) : '') + (d.hasta ? ' hasta el ' + fd(d.hasta) : '') + '</p>' + (d.notas ? '<p class="note">' + esc(d.notas) + '</p>' : '')
        : r.tipo === 'pendiente' ? '<div class="todo"><button class="cb' + (d.hecho ? ' on' : '') + '" data-act="toggleTodo" data-id="' + r.id + '" data-stop aria-label="Hecho">' + ICON.check + '</button><div><p class="' + (d.hecho ? 'struck' : 'strong') + '">' + esc(d.texto) + '</p>' + (d.limite ? '<p class="mut sm">Para el ' + fd(d.limite) + '</p>' : '') + '</div></div>'
        : '<p class="txt">' + esc(d.texto) + '</p>';
      return '<div class="card dr t-' + r.tipo + '" data-act="editDiario" data-id="' + r.id + '"><div class="lbl">' + DTYPES[r.tipo] + (r.fecha ? ' · ' + fd(r.fecha) : '') + by(r) + '</div>' + body + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- formularios ---------- */
  function fld(type, name, label, val, extra) {
    extra = extra || {};
    if (type === 'area') return '<label class="f"><span>' + label + '</span><textarea name="' + name + '" rows="' + (extra.rows || 3) + '" placeholder="' + esc(extra.ph || '') + '">' + esc(val) + '</textarea></label>';
    if (type === 'select') return '<label class="f"><span>' + label + '</span><select name="' + name + '">' + extra.opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === (val || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    return '<label class="f"><span>' + label + '</span><input name="' + name + '" type="' + type + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(extra.ph || '') + '"' + (extra.im ? ' inputmode="' + extra.im + '"' : '') + (extra.req ? ' required' : '') + '></label>';
  }
  function form(title, fields, rec, onSave, opts) {
    opts = opts || {};
    openSheet('<form class="sheetf"><h2>' + title + '</h2>' + fields + (rec && rec.creado ? '<p class="meta">Apuntado por ' + esc(rec.autor || '—') + ' el ' + fd(rec.creado.slice(0, 10)) + (rec.mod ? ' · editado' + (rec.modAutor ? ' por ' + esc(rec.modAutor) : '') : '') + '</p>' : '') +
      '<div class="actions">' + (rec && rec.id && !opts.noDelete ? '<button type="button" class="btn ghost danger" data-act="del">Borrar</button>' : '') + '<button type="submit" class="btn">' + (opts.cta || 'Guardar') + '</button></div></form>');
    var f = layer.querySelector('form');
    f.onsubmit = function (e) { e.preventDefault(); var o = {}; new FormData(f).forEach(function (v, k) { o[k] = typeof v === 'string' ? v.trim() : v; }); o._all = new FormData(f).getAll('codes'); onSave(o); };
    var del = f.querySelector('[data-act=del]'); if (del) del.onclick = function (e) { e.stopPropagation(); if (confirm('¿Lo borramos? También desaparece pa tu pareja.')) remove(rec); };
  }
  function pedOpts() { return [['', '—']].concat(live('pediatra').map(function (p) { return [p.id, p.d.nombre + (p.d.centro ? ' · ' + p.d.centro : '')]; })); }
  function vacOpts() { return [['', 'No']].concat(R.VACCINES.map(function (g) { return [g.key, 'Vacunas de los ' + g.label]; })); }
  function need(cond, msg) { if (!cond) { toast(msg); return false; } return true; }

  function citaForm(c) {
    c = c || { tipo: 'cita', fecha: '', d: {} };
    form(c.id ? 'Cita' : 'Nueva cita', fld('text', 'titulo', 'Qué', c.d.titulo, { ph: 'Revisión, vacunas…', req: 1 }) + '<div class="two">' + fld('date', 'fecha', 'Día', c.fecha, { req: 1 }) + fld('time', 'hora', 'Hora', c.d.hora) + '</div>' +
      fld('select', 'ped', 'Pediatra', c.d.ped, { opts: pedOpts() }) + fld('text', 'lugar', 'Lugar (si no es el de la pediatra)', c.d.lugar) + fld('select', 'vac', '¿Es de vacunas?', c.d.vac, { opts: vacOpts() }) + fld('area', 'notas', 'Notas', c.d.notas, { rows: 2 }), c.id ? c : null, function (o) {
      if (!need(o.titulo && o.fecha, 'Pon qué es y el día')) return;
      save(Object.assign({}, c, { fecha: o.fecha, d: { titulo: o.titulo, hora: o.hora, ped: o.ped, lugar: o.lugar, vac: o.vac, notas: o.notas, dur: c.d.dur } }), '¡Cita apuntá!');
    });
  }
  function pedForm(p) {
    p = p || { tipo: 'pediatra', d: {} };
    form(p.id ? 'Pediatra' : 'Nueva pediatra', fld('text', 'nombre', 'Nombre', p.d.nombre, { req: 1 }) + fld('text', 'centro', 'Centro', p.d.centro) + fld('text', 'direccion', 'Dirección', p.d.direccion) +
      '<div class="two">' + fld('tel', 'tel', 'Teléfono', p.d.tel) + fld('text', 'web', 'Web', p.d.web) + '</div><div class="two">' + fld('tel', 'tel2', 'Otro teléfono', p.d.tel2) + fld('text', 'tel2Label', 'Para qué', p.d.tel2Label, { ph: 'Curas…' }) + '</div>' + fld('area', 'notas', 'Notas', p.d.notas, { rows: 2 }), p.id ? p : null, function (o) {
      if (!need(o.nombre, 'Pon el nombre')) return; delete o._all; save(Object.assign({}, p, { d: o }), '¡Apuntao!');
    });
  }
  function pesoForm(r) {
    r = r || { tipo: 'peso', fecha: today(), d: {} };
    form(r.id ? 'Pesada de farmacia' : 'Pesada de farmacia', '<div class="two">' + fld('date', 'fecha', 'Día', r.fecha, { req: 1 }) + fld('text', 'g', 'Peso (g o kg)', r.d.g ? r.d.g : '', { im: 'decimal', ph: '3650', req: 1 }) + '</div>' + fld('text', 'lugar', 'Farmacia', r.d.lugar || lastVal('peso', 'lugar')) + fld('area', 'notas', 'Notas', r.d.notas, { rows: 2 }), r.id ? r : null, function (o) {
      var g = grams(o.g); if (!need(o.fecha && g && g > 1000 && g < 30000, 'Revisa el peso')) return;
      save(Object.assign({}, r, { fecha: o.fecha, d: { g: g, lugar: o.lugar, notas: o.notas } }), '¡Apuntá! ' + kg(g) + ' kg');
    });
  }
  function consForm(r) {
    r = r || { tipo: 'consulta', fecha: today(), d: {} };
    form('Medidas de consulta', '<div class="two">' + fld('date', 'fecha', 'Día', r.fecha, { req: 1 }) + fld('select', 'ped', 'Pediatra', r.d.ped, { opts: pedOpts() }) + '</div><div class="three">' + fld('text', 'g', 'Peso (g o kg)', r.d.g || '', { im: 'decimal' }) + fld('text', 'talla', 'Talla (cm)', dec(r.d.talla), { im: 'decimal' }) + fld('text', 'pc', 'PC (cm)', dec(r.d.pc), { im: 'decimal' }) + '</div>' +
      fld('text', 'lugar', 'Lugar (si no hay pediatra)', r.d.lugar) + fld('area', 'notas', 'Notas', r.d.notas, { rows: 2 }), r.id ? r : null, function (o) {
      var g = grams(o.g); if (!need(o.fecha && (g || num(o.talla) || num(o.pc)), 'Pon al menos una medida')) return;
      save(Object.assign({}, r, { fecha: o.fecha, d: { g: g, talla: num(o.talla), pc: num(o.pc), ped: o.ped, lugar: o.lugar, notas: o.notas } }), 'Medidas apuntás');
    });
  }
  function lastVal(t, k) { var l = live(t).filter(function (r) { return r.d[k]; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).pop(); return l ? l.d[k] : ''; }
  function vacForm(key, r) {
    var g = R.VACCINES.find(function (x) { return x.key === key; });
    r = r || { tipo: 'vacuna', fecha: today(), d: { grupo: key, centro: centroVac(), codes: g ? g.vacs.filter(function (x) { return !x.rec; }).map(R.vacLabel) : [] } };
    var checks = g ? '<div class="f"><span>Qué se le ha puesto</span><div class="checks">' + g.vacs.map(function (x) { var l = R.vacLabel(x); return '<label class="ck"><input type="checkbox" name="codes" value="' + esc(l) + '"' + ((r.d.codes || []).indexOf(l) >= 0 ? ' checked' : '') + '><b>' + esc(l) + '</b> ' + esc(R.VNAMES[x.code]) + (x.rec ? ' <i>rec.</i>' : '') + '</label>'; }).join('') + '</div></div>' : fld('text', 'nombre', 'Vacuna', r.d.nombre, { req: 1 });
    form(g ? 'Vacunas de los ' + g.label : (r.id ? 'Vacuna' : 'Otra vacuna'), fld('date', 'fecha', 'Día', r.fecha, { req: 1 }) + checks + '<div class="two">' + fld('text', 'lote', 'Lote', r.d.lote) + fld('text', 'centro', 'Dónde', r.d.centro) + '</div>' + fld('area', 'notas', 'Notas', r.d.notas, { rows: 2 }), r.id ? r : null, function (o) {
      if (!need(o.fecha && (g ? o._all.length : o.nombre), g ? 'Marca qué se le ha puesto' : 'Pon el nombre de la vacuna')) return;
      save(Object.assign({}, r, { fecha: o.fecha, d: { grupo: g ? key : '', nombre: g ? '' : o.nombre, codes: g ? o._all : [], lote: o.lote, centro: o.centro, notas: o.notas } }), '¡Vacunas puestas, valiente!');
    }, { cta: r.id ? 'Guardar' : 'Marcar como puesta' });
  }
  function vacGroupSheet(key) {
    var g = R.VACCINES.find(function (x) { return x.key === key; }), given = givenFor(key);
    if (given.length) return vacForm(key, given[0]);
    var due = birth() ? addMonths(birth(), g.months) : '', cita = citaFor(key);
    openSheet('<div class="sheetf"><h2>Vacunas de los ' + g.label + '</h2>' + (due ? '<p class="mut">A partir del ' + fd(due, true) + '</p>' : '') +
      '<ul class="vlist">' + g.vacs.map(function (x) { return '<li><b>' + esc(R.vacLabel(x)) + '</b> ' + esc(R.VNAMES[x.code]) + (x.rec ? ' <span class="tag sm">recomendada</span>' : '') + '</li>'; }).join('') + '</ul>' +
      '<div class="actions col">' + (cita ? '<button class="btn ghost" data-act="editCita" data-id="' + cita.id + '">' + ICON.cal + 'Ver la cita del ' + fd(cita.fecha) + '</button>' : '<button class="btn ghost" data-act="citaVac" data-k="' + key + '">' + ICON.cal + 'Apuntar la cita</button>') +
      '<button class="btn" data-act="markVac" data-k="' + key + '">' + ICON.check + 'Marcar como puesta</button></div></div>');
  }
  function diarioForm(r, tipo) {
    tipo = (r && r.tipo) || tipo;
    if (!tipo) return openSheet('<div class="sheetf"><h2>¿Qué quieres apuntar?</h2><div class="actions col"><button class="btn ghost" data-act="newD" data-t="nota">Una nota</button><button class="btn ghost" data-act="newD" data-t="pendiente">Algo pendiente</button><button class="btn ghost" data-act="newD" data-t="tratamiento">Un tratamiento</button></div></div>');
    r = r || { tipo: tipo, fecha: today(), d: {} };
    var f = tipo === 'tratamiento' ? fld('text', 'nombre', 'Medicamento', r.d.nombre, { req: 1 }) + fld('text', 'pauta', 'Cómo se da', r.d.pauta, { ph: '2 gotas al día' }) + '<div class="two">' + fld('date', 'desde', 'Desde', r.d.desde || today()) + fld('date', 'hasta', 'Hasta', r.d.hasta) + '</div>' + fld('area', 'notas', 'Notas', r.d.notas, { rows: 2 })
      : tipo === 'pendiente' ? fld('area', 'texto', 'Qué hay que hacer', r.d.texto, { rows: 2 }) + fld('date', 'limite', 'Para cuándo (opcional)', r.d.limite)
      : fld('date', 'fecha', 'Día', r.fecha) + fld('area', 'texto', 'Nota', r.d.texto, { rows: 5 });
    form(DTYPES[tipo], f, r.id ? r : null, function (o) {
      delete o._all;
      if (tipo === 'tratamiento') { if (!need(o.nombre, 'Pon el medicamento')) return; save(Object.assign({}, r, { fecha: o.desde || r.fecha, d: o }), '¡Apuntao!'); }
      else { if (!need(o.texto, 'Escribe algo')) return; save(Object.assign({}, r, { fecha: o.fecha || r.fecha, d: Object.assign({}, r.d, { texto: o.texto, limite: o.limite }) }), '¡Apuntao!'); }
    });
  }
  function perfilForm() {
    var cur = live('perfil').pop(), p = perfil();
    form('Datos de nacimiento', fld('text', 'nombre', 'Nombre', p.nombre || 'Noah') + '<div class="two">' + fld('date', 'nacimiento', 'Nació el', p.nacimiento) + fld('time', 'hora', 'Hora', p.hora) + '</div>' +
      '<div class="three">' + fld('text', 'peso', 'Peso (g)', p.peso, { im: 'decimal' }) + fld('text', 'talla', 'Talla (cm)', dec(p.talla), { im: 'decimal' }) + fld('text', 'pc', 'PC (cm)', dec(p.pc), { im: 'decimal' }) + '</div>' +
      fld('text', 'eg', 'Semanas de gestación', p.eg, { ph: '38+2' }) + fld('text', 'alergias', 'Alergias', p.alergias) + fld('text', 'centroVacunas', 'Dónde se ponen las vacunas', p.centroVacunas), cur && cur.id ? cur : null, function (o) {
      delete o._all; o.peso = grams(o.peso); o.talla = num(o.talla); o.pc = num(o.pc);
      save(Object.assign({}, cur || { tipo: 'perfil' }, { fecha: o.nacimiento, d: o }), '¡Apuntao!');
    }, { noDelete: true });
  }

  /* ---------- ajustes, compartir, importar ---------- */
  function settings() {
    openSheet('<div class="sheetf"><h2>Ajustes</h2><p class="mut">Has entrado como <b>' + esc(S.me ? S.me.email : '') + '</b></p>' +
      '<div class="box"><h3>Compartir con tu pareja</h3><p class="mut sm">Escribe su Gmail. Le llegará un correo; después abre la app, entra con ese correo y pulsa «Me han invitado».</p>' +
      '<form id="shf" class="inl"><input name="email" type="email" placeholder="correo@gmail.com" required><button class="btn sm">Invitar</button></form><div id="people" class="mut sm"></div></div>' +
      '<div class="actions col"><button class="btn ghost" data-act="photo">' + (foto() ? 'Cambiar la foto' : 'Poner una foto') + '</button><button class="btn ghost" data-act="perfil">Datos de nacimiento</button><button class="btn ghost" data-act="import">Importar datos</button><button class="btn ghost" data-act="reload">Actualizar datos</button><button class="btn ghost danger" data-act="logout">Cerrar sesión</button></div>' +
      '<p class="ver">Noah APP 🦖 · versión ' + esc(root.APP_VERSION) + '</p></div>');
    var f = $('#shf');
    f.onsubmit = function (e) {
      e.preventDefault(); var em = f.email.value.trim(), b = f.querySelector('button'); b.disabled = true; b.textContent = 'Enviando…';
      API.share(em).then(function () { toast('Invitación enviada a ' + em); f.reset(); listPeople(); }).catch(function (er) { toast('No se ha podido invitar: ' + er.message); }).then(function () { b.disabled = false; b.textContent = 'Invitar'; });
    };
    listPeople();
  }
  function listPeople() {
    var el = $('#people'); if (!el) return;
    API.people().then(function (ps) {
      el.innerHTML = ps.length ? 'Con acceso: ' + ps.map(function (p) { return esc(p.displayName || p.emailAddress) + (p.role === 'owner' ? ' (creó el archivo)' : ''); }).join(', ') : '';
    }).catch(function () { el.textContent = ''; });
  }
  function importSheet() {
    openSheet('<form class="sheetf"><h2>Importar datos</h2><p class="mut sm">Pega aquí el texto de importación completo. Lo que ya esté importado no se duplica.</p><textarea name="t" rows="8" placeholder="{&quot;noah&quot;:1, …}"></textarea><div class="actions"><button class="btn">Importar</button></div></form>');
    var f = layer.querySelector('form');
    f.onsubmit = function (e) {
      e.preventDefault(); var data;
      try { data = JSON.parse(f.t.value.trim().replace(/^```\w*|```$/g, '')); } catch (er) { return toast('El texto no está completo. Cópialo entero otra vez.'); }
      var recs = importRecs(data); if (!recs) return toast('Ese texto no es de Noah APP');
      var have = {}; S.recs.forEach(function (r) { have[r.id] = 1; });
      recs = recs.filter(function (r) { return !have[r.id]; });
      if (!recs.length) { closeSheet(); return toast('Ya estaba todo importado'); }
      addMany(recs); closeSheet(); render(); toast('Importado: ' + recs.length + ' datos');
    };
  }
  function importRecs(o) {
    if (!o || o.noah !== 1) return null;
    var out = [], mk = function (id, tipo, fecha, d) { out.push({ id: 'imp-' + id, tipo: tipo, fecha: fecha || '', d: d }); };
    if (o.perfil) mk('perfil', 'perfil', o.perfil.nacimiento, o.perfil);
    (o.pediatras || []).forEach(function (p) { mk('ped-' + p.ref, 'pediatra', '', p.d); });
    (o.citas || []).forEach(function (c, i) { c.d.ped = c.d.ped ? 'imp-ped-' + c.d.ped : ''; mk('cita-' + c.fecha + '-' + i, 'cita', c.fecha, c.d); });
    (o.consultas || []).forEach(function (c) { c.d.ped = c.d.ped ? 'imp-ped-' + c.d.ped : ''; mk('cons-' + c.fecha, 'consulta', c.fecha, c.d); });
    (o.pesos || []).forEach(function (c) { mk('peso-' + c.fecha, 'peso', c.fecha, c.d); });
    (o.vacunas || []).forEach(function (c, i) { mk('vac-' + c.fecha + '-' + i, 'vacuna', c.fecha, c.d); });
    (o.diario || []).forEach(function (c, i) { mk('dia-' + c.tipo + '-' + i, c.tipo, c.fecha, c.d); });
    return out;
  }

  /* ---------- capas, avisos ---------- */
  function openSheet(html) {
    layer.innerHTML = '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true"><button class="x" data-act="close" aria-label="Cerrar">×</button>' + html + '</div>';
    requestAnimationFrame(function () { layer.classList.add('open'); });
  }
  function closeSheet() { layer.classList.remove('open'); layer.innerHTML = ''; }
  function toast(m) {
    document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 2600);
  }

  /* ---------- acciones ---------- */
  var ACT = {
    go: function (d) { S.view = d.v; closeSheet(); render(); scrollTo(0, 0); },
    seg: function (d) { S.seg[d.k] = d.v; render(); },
    close: closeSheet,
    settings: settings, perfil: perfilForm, import: importSheet,
    photo: function () { $('#phin').click(); },
    fab: function () { openSheet('<div class="sheetf"><h2>¿Qué apuntamos?</h2><div class="fabg">' + [['addPeso', '⚖️', 'Pesada farmacia'], ['addCons', '🩺', 'Medidas consulta'], ['addCita', '📅', 'Cita'], ['newD', '📝', 'Nota', 'nota'], ['newD', '✅', 'Pendiente', 'pendiente'], ['addVacExtra', '💉', 'Vacuna']].map(function (x) { return '<button data-act="' + x[0] + '"' + (x[3] ? ' data-t="' + x[3] + '"' : '') + '><i>' + x[1] + '</i>' + x[2] + '</button>'; }).join('') + '</div></div>'); },
    reload: function () { closeSheet(); toast('Actualizando…'); refresh().then(function () { toast('Al día'); }); },
    logout: function () { if (!confirm('¿Cerrar sesión en este móvil?')) return; API.signOut(); location.reload(); },
    addCita: function () { citaForm(); }, editCita: function (d) { citaForm(byId(d.id)); },
    citaVac: function (d) { var g = R.VACCINES.find(function (x) { return x.key === d.k; }), cv = centroVac(); var ped = live('pediatra').find(function (p) { return cv && p.d.centro && cv.indexOf(p.d.centro.split(' ')[0]) >= 0; }); citaForm({ tipo: 'cita', fecha: addMonths(birth(), g.months), d: { titulo: 'Vacunas de los ' + g.label, vac: d.k, ped: ped ? ped.id : '' } }); },
    addPed: function () { pedForm(); }, editPed: function (d) { pedForm(byId(d.id)); },
    addPeso: function () { pesoForm(); }, editPeso: function (d) { pesoForm(byId(d.id)); },
    addCons: function () { consForm(); }, editCons: function (d) { consForm(byId(d.id)); },
    vacGroup: function (d) { vacGroupSheet(d.k); }, markVac: function (d) { vacForm(d.k); },
    addVacExtra: function () { vacForm(''); }, editVac: function (d) { var r = byId(d.id); vacForm(r.d.grupo, r); },
    addDiario: function () { diarioForm(null, S.seg.diario !== 'todo' ? S.seg.diario : null); }, newD: function (d) { diarioForm(null, d.t); },
    editDiario: function (d) { diarioForm(byId(d.id)); },
    toggleTodo: function (d) { var r = byId(d.id); save(Object.assign({}, r, { d: Object.assign({}, r.d, { hecho: !r.d.hecho }) }), r.d.hecho ? 'Pendiente otra vez' : '¡Hecho, una cosa menos!'); },
    pcInfo: function (d) {
      var p = d.p ? +d.p : null;
      openSheet('<div class="sheetf"><h2>¿Qué es el percentil?</h2>' + (p ? '<p class="pcbig">Percentil ' + p + '</p><p>De cada 100 bebés de su misma edad, <b>' + p + '</b> pesan menos que ' + esc(perfil().nombre || 'Noah') + ' y <b>' + (100 - p) + '</b> pesan más.</p>' : '<p>Compara su peso con el de bebés de su misma edad.</p>') +
        '<p class="mut">No es una nota: un percentil 30 es tan normal como uno 70. Entre el 3 y el 97 se considera dentro de lo habitual. Lo que más importa es que vaya siguiendo su curva con el tiempo.</p><p class="mut sm">Se calcula con las tablas de la OMS para niños. Es orientativo: quien lo valora es la pediatra.</p></div>');
    },
    togglePast: function () { S.showPast = !S.showPast; render(); },
    sync: function () { flush(); refresh(); },
    login: function () { API.signIn({ prompt: 'select_account' }); },
    create: function (d, el) { el.disabled = true; el.textContent = 'Preparando…'; API.createFile().then(function () { S.recs = []; persist(); boot(); }).catch(fail(el, 'Empezar desde cero')); },
    joined: function (d, el) { API.pickFile().then(function () { el.textContent = 'Cargando…'; return refresh(); }).then(boot).catch(function (e) { if (e.message !== 'CANCEL') fail(el, 'Me han invitado')(e); }); }
  };
  function fail(el, label) { return function (e) { if (e.auth) return API.signIn(); el.disabled = false; el.textContent = label; toast(e.message); }; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    if (e.target.closest('a[href]')) return; // los enlaces (Calendar, llamar, mapas) funcionan solos
    var fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.form && el.type === 'submit') return;
    e.preventDefault(); fn(el.dataset, el);
  });

  /* ---------- foto de portada: se comprime y se guarda en vuestro Drive ---------- */
  var phin = document.createElement('input'); phin.type = 'file'; phin.accept = 'image/*'; phin.id = 'phin'; phin.hidden = true; document.body.appendChild(phin);
  phin.addEventListener('change', function () {
    var f = phin.files && phin.files[0]; if (!f) return; closeSheet(); toast('Preparando la foto…');
    var im = new Image(), url = URL.createObjectURL(f);
    im.onload = function () {
      var w = 720, q = 0.78, out = '';
      for (var k = 0; k < 8; k++) {
        var sc = Math.min(1, w / im.width), cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); out = cv.toDataURL('image/jpeg', q);
        if (out.length < 46000) break; if (q > 0.55) q -= 0.08; else w = Math.round(w * 0.85);
      }
      URL.revokeObjectURL(url); phin.value = '';
      live('foto').forEach(function (o) { S.recs[S.recs.indexOf(o)] = Object.assign({}, o, { borrado: true }); S.queue.push({ op: 'upd', rec: Object.assign({}, o, { borrado: true, d: {} }) }); });
      save({ tipo: 'foto', fecha: today(), d: { img: out } }, '¡Qué guapo! Foto puesta');
    };
    im.onerror = function () { toast('No he podido leer esa foto'); };
    im.src = url;
  });

  /* ---------- render ---------- */
  var VIEWS = { home: vHome, citas: vCitas, peso: vPeso, vacunas: vVacunas, diario: vDiario };
  function render() {
    if (!S.ready) return;
    app.innerHTML = '<button id="sync" class="sync" data-act="sync" hidden></button>' + VIEWS[S.view]();
    var fb = $('#fab'); if (fb) fb.hidden = false;
    nav.hidden = false; nav.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === S.view); });
    paintSync();
  }
  nav.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ACT.go({ v: b.dataset.v }); });
  function screen(html) { nav.hidden = true; app.innerHTML = '<section class="welcome">' + DINO + html + '</section>'; }

  function boot() {
    if (!API.token() && !S.me) return screen('<h1>Noah APP</h1><p>Citas, vacunas, peso y diario de Noah. Lo que apunta uno, lo ve el otro al momento.</p><button class="btn big" data-act="login">Entrar con Google</button><p class="mut sm">Cada uno entra con su propia cuenta.</p>');
    if (!API.token()) { if (API.fileId() && S.recs.length) { S.ready = true; render(); } return reauth(); }
    var who = S.me ? Promise.resolve(S.me) : API.whoami();
    who.then(function (me) {
      S.me = me;
      if (API.fileId()) return start();
      return API.findFile().then(function (id) {
        if (id) return start();
        screen('<h1>¡Buenas, ' + esc(me.name) + '!</h1><p>Vamos a dejarlo todo listo pa Noah.</p><button class="btn big" data-act="create">Empezar desde cero</button><button class="btn big ghost" data-act="joined">Me han invitado</button><p class="mut sm">Si tu pareja ya lo ha creado y te ha invitado, pulsa «Me han invitado» y elige «Noah APP · datos».</p><p class="mut sm">¿Te sale «No se puede acceder a tu cuenta de Google»? En Ajustes del iPhone → Apps → Safari, desactiva un momento «Impedir seguimiento entre sitios», vuelve aquí y pulsa otra vez. Luego ya lo puedes volver a activar.</p>');
      });
    }).catch(function (e) { if (e.auth) return reauth(); if (S.recs.length) { S.ready = true; render(); } toast(e.message); });
  }
  function start() { S.ready = true; render(); return refresh(true); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.ready) refresh(true); });
  setInterval(function () { if (!document.hidden && S.ready && !layer.innerHTML) refresh(true); }, 60000);
  root.addEventListener('online', function () { flush(); });
  root.NoahUI = { importRecs: importRecs };
  boot();
})(window);
