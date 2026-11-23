/* Noah APP — datos de referencia (públicos, sin datos personales).
   Curvas de peso: OMS 2006, niños, peso para la edad (parámetros LMS por mes, 0–24 meses).
   Vacunas: calendario de la cartilla. Siempre manda lo que diga la pediatra. */
(function (root) {
  'use strict';
  // [mes, L, M, S]
  var LMS = [
    [0, 0.3487, 3.3464, 0.14602], [1, 0.2297, 4.4709, 0.13395], [2, 0.1970, 5.5675, 0.12385], [3, 0.1738, 6.3762, 0.11727],
    [4, 0.1553, 7.0023, 0.11316], [5, 0.1395, 7.5105, 0.11080], [6, 0.1257, 7.9340, 0.10958], [7, 0.1134, 8.2970, 0.10902],
    [8, 0.1021, 8.6151, 0.10882], [9, 0.0917, 8.9014, 0.10881], [10, 0.0820, 9.1649, 0.10891], [11, 0.0730, 9.4122, 0.10906],
    [12, 0.0644, 9.6479, 0.10925], [13, 0.0563, 9.8749, 0.10949], [14, 0.0487, 10.0953, 0.10976], [15, 0.0413, 10.3108, 0.11007],
    [16, 0.0343, 10.5228, 0.11041], [17, 0.0275, 10.7319, 0.11079], [18, 0.0211, 10.9385, 0.11119], [19, 0.0148, 11.1430, 0.11164],
    [20, 0.0087, 11.3462, 0.11211], [21, 0.0029, 11.5486, 0.11261], [22, -0.0028, 11.7504, 0.11314], [23, -0.0083, 11.9514, 0.11369],
    [24, -0.0137, 12.1515, 0.11426]
  ];
  var DAYS_PER_MONTH = 30.4375;

  function lmsAt(days) {
    var m = Math.max(0, Math.min(24, days / DAYS_PER_MONTH)), i = Math.min(23, Math.floor(m)), f = m - i, a = LMS[i], b = LMS[i + 1];
    return { L: a[1] + (b[1] - a[1]) * f, M: a[2] + (b[2] - a[2]) * f, S: a[3] + (b[3] - a[3]) * f };
  }
  function weightAt(days, z) { var p = lmsAt(days); return Math.abs(p.L) < 1e-6 ? p.M * Math.exp(p.S * z) : p.M * Math.pow(1 + p.L * p.S * z, 1 / p.L); }
  function zOf(days, kg) { var p = lmsAt(days); return Math.abs(p.L) < 1e-6 ? Math.log(kg / p.M) / p.S : (Math.pow(kg / p.M, p.L) - 1) / (p.L * p.S); }
  function cdf(z) { // aproximación de la normal (Abramowitz-Stegun)
    var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  function percentile(days, kg) {
    if (days < 0 || days > 731 || !kg) return null;
    var p = Math.round(cdf(zOf(days, kg)) * 100); return Math.max(1, Math.min(99, p));
  }
  var Z = { p3: -1.881, p15: -1.036, p50: 0, p85: 1.036, p97: 1.881 };

  /* Calendario de vacunas (cartilla). rec = recomendada (no incluida en el calendario financiado) */
  var NAMES = {
    HB: 'Hepatitis B', DTPa: 'Difteria, tétanos y tosferina', VPI: 'Polio', Hib: 'Haemophilus influenzae b',
    VNC: 'Neumococo', MenB: 'Meningococo B', RV: 'Rotavirus', MenACWY: 'Meningococo ACWY', Gripe: 'Gripe (cada año desde los 6 meses)',
    TV: 'Triple vírica (sarampión, rubeola, paperas)', HA: 'Hepatitis A (2 dosis desde los 12 meses)', VVZ: 'Varicela', VPH: 'Papiloma humano', Td: 'Tétanos y difteria'
  };
  function v(code, dose, rec) { return { code: code, dose: dose || 0, rec: !!rec }; }
  var VACCINES = [
    { key: '2m', months: 2, label: '2 meses', vacs: [v('HB', 1), v('DTPa', 1), v('VPI', 1), v('Hib', 1), v('VNC', 1), v('MenB', 1), v('RV', 0, true)] },
    { key: '4m', months: 4, label: '4 meses', vacs: [v('HB', 2), v('DTPa', 2), v('VPI', 2), v('Hib', 2), v('MenACWY'), v('VNC', 2), v('MenB', 2), v('RV', 0, true)] },
    { key: '6m', months: 6, label: '6 meses', vacs: [v('VNC', 3), v('RV', 0, true), v('Gripe', 0, true)] },
    { key: '11m', months: 11, label: '11 meses', vacs: [v('HB', 3), v('DTPa', 3), v('VPI', 3), v('Hib', 3), v('VNC', 4)] },
    { key: '12m', months: 12, label: '12 meses', vacs: [v('MenACWY'), v('TV', 1), v('HA', 0, true)] },
    { key: '15m', months: 15, label: '15 meses', vacs: [v('VVZ', 1), v('MenB', 3)] },
    { key: '3a', months: 36, label: '3 años', vacs: [v('TV', 2), v('VVZ', 2)] },
    { key: '6a', months: 72, label: '6 años', vacs: [v('DTPa', 4), v('VPI', 4)] },
    { key: '12a', months: 144, label: '12 años', vacs: [v('MenACWY'), v('VPH')] },
    { key: '14a', months: 168, label: '14 años', vacs: [v('Td')] }
  ];
  function vacLabel(x) { return x.code + (x.dose ? ' ' + x.dose + 'ª' : ''); }

  root.REF = { lmsAt: lmsAt, weightAt: weightAt, zOf: zOf, percentile: percentile, Z: Z, VACCINES: VACCINES, VNAMES: NAMES, vacLabel: vacLabel, DPM: DAYS_PER_MONTH };
})(window);
