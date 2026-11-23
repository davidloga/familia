/* Noah APP — conexión con Google.
   Permiso único drive.file: la app solo ve el archivo que ella misma crea (o el que te comparten y eliges).
   Los datos viven en un archivo de Google en el Drive de quien lo crea, compartido con la pareja. Nunca hace falta abrirlo. */
(function (root) {
  'use strict';
  var CFG = root.APP_CONFIG || {};
  var SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
  var SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/';
  var DRIVE = 'https://www.googleapis.com/drive/v3/files';
  var TAB = 'Registros';
  var HEAD = ['id', 'tipo', 'fecha', 'datos', 'autor', 'creado', 'modificado', 'borrado'];

  function ls(k, v) { k = 'noah.' + k; try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function appUrl() { return location.origin + location.pathname; }

  /* ---------- Autorización (redirección: funciona en la app instalada del iPhone) ---------- */
  function captureToken() {
    if (!/access_token=/.test(location.hash)) return;
    var p = new URLSearchParams(location.hash.slice(1)), st = ls('oauth_state');
    if (st && p.get('state') !== st) { history.replaceState(null, '', appUrl()); return; }
    ls('tok', { t: p.get('access_token'), exp: Date.now() + (parseInt(p.get('expires_in'), 10) || 3600) * 1000 - 60000 });
    ls('oauth_state', null);
    history.replaceState(null, '', appUrl());
  }
  function token() { var t = ls('tok'); return t && t.exp > Date.now() ? t.t : null; }
  function signIn(opts) {
    var st = Math.random().toString(36).slice(2); ls('oauth_state', st);
    var qy = { client_id: CFG.CLIENT_ID, redirect_uri: appUrl(), response_type: 'token', scope: SCOPES, include_granted_scopes: 'true', state: st };
    var me = ls('me'); if (me && me.email) qy.login_hint = me.email;
    if (opts && opts.prompt) qy.prompt = opts.prompt;
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams(qy).toString();
    return new Promise(function () {});
  }
  function signOut() { ['tok', 'me', 'file', 'cache', 'queue'].forEach(function (k) { ls(k, null); }); }
  function authErr() { var e = new Error('AUTH'); e.auth = true; return e; }

  function api(url, opt) {
    opt = opt || {};
    var t = token(); if (!t) return Promise.reject(authErr());
    var h = { Authorization: 'Bearer ' + t };
    if (opt.json !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(opt.json); }
    return fetch(url, { method: opt.method || 'GET', headers: h, body: opt.body }).then(function (r) {
      if (r.status === 401) { ls('tok', null); throw authErr(); }
      if (!r.ok) return r.text().then(function (txt) { var m = txt; try { m = JSON.parse(txt).error.message; } catch (e) {} var er = new Error(m || ('Error ' + r.status)); er.status = r.status; throw er; });
      return r.status === 204 ? null : r.json();
    });
  }
  function q(s) { return encodeURIComponent(s); }

  /* ---------- El archivo de la familia ---------- */
  function fileId() { return ls('file'); }
  function findFile() {
    var query = "appProperties has { key='noahApp' and value='data' } and trashed=false";
    return api(DRIVE + '?q=' + q(query) + '&fields=files(id,name)&spaces=drive').then(function (r) {
      var f = r.files && r.files[0]; if (f) ls('file', f.id); return f ? f.id : null;
    });
  }
  function createFile() {
    return api(DRIVE, { method: 'POST', json: { name: 'Noah APP · datos (no editar a mano)', mimeType: 'application/vnd.google-apps.spreadsheet', appProperties: { noahApp: 'data' } } }).then(function (f) {
      return api(SHEETS + f.id).then(function (ss) {
        return api(SHEETS + f.id + ':batchUpdate', { method: 'POST', json: { requests: [{ updateSheetProperties: { properties: { sheetId: ss.sheets[0].properties.sheetId, title: TAB, gridProperties: { frozenRowCount: 1 } }, fields: 'title,gridProperties.frozenRowCount' } }] } });
      }).then(function () {
        return api(SHEETS + f.id + '/values/' + q(TAB + '!A1:H1') + '?valueInputOption=RAW', { method: 'PUT', json: { values: [HEAD] } });
      }).then(function () { ls('file', f.id); return f.id; });
    });
  }
  function checkFile(id) {
    return api(SHEETS + id + '?fields=' + q('properties(title),sheets(properties(title))')).then(function (ss) {
      if (!ss.sheets.some(function (s) { return s.properties.title === TAB; })) throw new Error('Ese archivo no es el de Noah APP. Busca el que se llama "Noah APP · datos".');
      return id;
    });
  }

  function toRow(r) { return [r.id, r.tipo, r.fecha || '', JSON.stringify(r.d || {}), r.autor || '', r.creado || '', r.mod || '', r.borrado ? '1' : '']; }
  function fromRow(x) {
    var d = {}; try { d = JSON.parse(x[3] || '{}'); } catch (e) {}
    return { id: x[0], tipo: x[1], fecha: x[2] || '', d: d, autor: x[4] || '', creado: x[5] || '', mod: x[6] || '', borrado: x[7] === '1' };
  }
  function readAll(id) {
    return api(SHEETS + id + '/values/' + q(TAB + '!A2:H5000')).then(function (r) {
      return (r.values || []).filter(function (x) { return x[0]; }).map(fromRow);
    });
  }
  function rowOf(id, recId) {
    return api(SHEETS + id + '/values/' + q(TAB + '!A2:A5000')).then(function (r) {
      var i = (r.values || []).findIndex(function (x) { return x[0] === recId; }); return i < 0 ? 0 : i + 2;
    });
  }

  /* ---------- Selector de Google: para elegir el archivo que te han compartido ---------- */
  var pickerLoaded = null;
  function loadPicker() {
    if (pickerLoaded) return pickerLoaded;
    pickerLoaded = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js';
      s.onload = function () { root.gapi.load('picker', { callback: res, onerror: rej }); };
      s.onerror = function () { pickerLoaded = null; rej(new Error('No se ha podido abrir el selector de Google. Revisa la conexión.')); };
      document.head.appendChild(s);
    });
    return pickerLoaded;
  }
  function pick() {
    var t = token(); if (!t) return Promise.reject(authErr());
    return loadPicker().then(function () {
      return new Promise(function (res, rej) {
        var P = root.google.picker;
        var view = new P.DocsView(P.ViewId.SPREADSHEETS).setMode(P.DocsViewMode.LIST).setIncludeFolders(false).setQuery('Noah APP');
        new P.PickerBuilder().addView(view).setOAuthToken(t).setDeveloperKey(CFG.API_KEY).setAppId(CFG.APP_ID)
          .setLocale('es').setTitle('Elige "Noah APP · datos"').enableFeature(P.Feature.NAV_HIDDEN)
          .setCallback(function (d) {
            if (d.action === P.Action.PICKED) res(d.docs[0].id);
            else if (d.action === P.Action.CANCEL) rej(new Error('CANCEL'));
          }).build().setVisible(true);
      });
    });
  }

  root.GAPI = {
    signIn: signIn, signOut: signOut, token: token, ls: ls,
    whoami: function () {
      return api('https://openidconnect.googleapis.com/v1/userinfo').then(function (u) {
        var me = { email: u.email, name: u.given_name || (u.name || u.email).split(/[ @]/)[0] }; ls('me', me); return me;
      });
    },
    fileId: fileId,
    findFile: findFile,
    createFile: createFile,
    pickFile: function () { return pick().then(checkFile).then(function (id) { ls('file', id); return id; }); },
    load: function () { var id = fileId(); return id ? readAll(id) : Promise.reject(new Error('NOFILE')); },
    add: function (recs) {
      return api(SHEETS + fileId() + '/values/' + q(TAB + '!A:H') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', json: { values: recs.map(toRow) } });
    },
    update: function (rec) {
      var id = fileId();
      return rowOf(id, rec.id).then(function (n) {
        if (!n) return root.GAPI.add([rec]);
        return api(SHEETS + id + '/values/' + q(TAB + '!A' + n + ':H' + n) + '?valueInputOption=RAW', { method: 'PUT', json: { values: [toRow(rec)] } });
      });
    },
    share: function (email) {
      var msg = 'Te invito a Noah APP 🦖. Abre ' + appUrl() + ' en el iPhone, entra con este correo y pulsa "Me han invitado".';
      return api(DRIVE + '/' + fileId() + '/permissions?sendNotificationEmail=true&emailMessage=' + q(msg), { method: 'POST', json: { role: 'writer', type: 'user', emailAddress: email } });
    },
    people: function () {
      return api(DRIVE + '/' + fileId() + '/permissions?fields=' + q('permissions(emailAddress,displayName,role)')).then(function (r) { return r.permissions || []; });
    }
  };
  captureToken();
})(window);
