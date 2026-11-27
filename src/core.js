/* Doorstep — core: data, storage, money math, chores, checks */
const KEY = 'doorstep.v1';
const GUIDELINE = { 2026: 2.1, 2027: 1.9 }; // Ontario rent increase guideline, % (ontario.ca)
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n, d = 0) => (n < 0 ? '−' : '') + '$' + Math.abs(n || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => isFinite(n) ? (n * 100).toFixed(1) + '%' : '—';
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => iso(new Date());
const pDate = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const nice = s => s ? pDate(s).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysBetween = (a, b) => Math.round((pDate(b) - pDate(a)) / 864e5);
const monthKey = (d = new Date()) => iso(d).slice(0, 7);

let S;

function seed() {
  const P = 'pf1', A = 'prA', H = 'prH', f1 = 'flr1', f2 = 'flr2';
  const T = [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 'tn' + i, name: 'Tenant ' + i, email: '', phone: '', leaseStart: '2026-0' + (i + 1) + '-01', deposit: 0, lastIncrease: '' }));
  const rents = [950, 1000, 1100, 900, 1050, 1150];
  return {
    v: 1, sample: true,
    settings: { landlord: '', email: '', phone: '', pin: '', lastBackup: '' },
    ui: { view: 'home', pf: P, open: H, month: monthKey(), tenant: '' },
    portfolios: [{ id: P, name: 'Our family properties', kind: 'owned', feePct: 8, owner: '' }],
    properties: [
      { id: A, pf: P, name: 'Richmond Hill apartment', address: 'Richmond Hill, ON', value: 650000, invested: 150000,
        mortgage: { balance: 300000, rate: 4.9, years: 25, payment: 0 },
        expenses: [{ id: uid(), name: 'Property tax', amount: 280, per: 'm' }, { id: uid(), name: 'Condo / maintenance fee', amount: 550, per: 'm' }, { id: uid(), name: 'Insurance', amount: 420, per: 'y' }],
        floors: [], camera: false, wasteDay: 2, wasteFlip: false, choreStart: '2026-01-05', compliance: {} },
      { id: H, pf: P, name: 'North York house', address: 'North York, Toronto, ON', value: 1400000, invested: 350000,
        mortgage: { balance: 550000, rate: 5.1, years: 25, payment: 0 },
        expenses: [{ id: uid(), name: 'Property tax', amount: 600, per: 'm' }, { id: uid(), name: 'Insurance', amount: 2200, per: 'y' }, { id: uid(), name: 'Hydro, gas, water', amount: 450, per: 'm' }, { id: uid(), name: 'Internet', amount: 90, per: 'm' }, { id: uid(), name: 'Repairs set-aside', amount: 250, per: 'm' }],
        floors: [
          { id: f1, name: 'Main floor', tasks: 'Kitchen: counters, stove top, sink, microwave, table\nKitchen: wipe fridge shelves, throw out old food\nWashroom: toilet, sink, shower/tub, mirror\nFront entrance and corridor: sweep, tidy shoes, shake mats\nVacuum all shared floors\nMop kitchen and washroom floors\nEmpty kitchen and washroom bins into the outdoor bins\nWipe door handles and light switches' },
          { id: f2, name: 'Upper floor', tasks: 'Washroom: toilet, sink, shower/tub, mirror\nKitchen or kitchenette (if on this floor): counters, sink, stove top\nStairs and landing: vacuum, wipe the handrail\nCorridor: vacuum and tidy\nMop washroom floor\nLaundry area: wipe machines, empty lint trap\nEmpty shared bins into the outdoor bins\nWipe door handles and light switches' }],
        camera: true, wasteDay: 2, wasteFlip: false, choreStart: '2026-01-05', compliance: {} }
    ],
    units: [{ id: 'unA', prop: A, name: 'Whole apartment', floor: '', rent: 2600, market: 2700, tenant: 'tn7', desc: '2 bedroom apartment, bright, parking included' }]
      .concat(rents.map((r, i) => ({ id: 'un' + (i + 1), prop: H, name: 'Room ' + (i + 1), floor: i < 3 ? f1 : f2, rent: r, market: r + (i % 2 ? 50 : 0), tenant: i === 4 ? '' : 'tn' + (i + 1), desc: 'Furnished private room, shared kitchen and washroom, Wi-Fi and utilities included' }))),
    tenants: T.filter(t => t.id !== 'tn5'),
    payments: {}, // "2026-11": { tenantId: "2026-11-01" }
    renos: [],
    ads: {}, // unitId -> { title, body, avail, ch: { chId: { posted, leads, spent } } }
    docs: [],
    chores: {}, // "propId|floorId|mondayISO" -> true (done)
    usage: { views: {}, days: {}, first: today() },
    qc: { last: '', reports: [] }
  };
}

function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.v) S = seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

/* ---------- lookups ---------- */
const byId = (list, id) => list.find(x => x.id === id);
const propsOf = pf => S.properties.filter(p => p.pf === pf);
const unitsOf = pid => S.units.filter(u => u.prop === pid);
const curPf = () => byId(S.portfolios, S.ui.pf) || S.portfolios[0];
const tenantUnit = tid => S.units.find(u => u.tenant === tid);
const pfTenants = pf => S.tenants.filter(t => { const u = tenantUnit(t.id); return u && byId(S.properties, u.prop).pf === pf; });

/* ---------- money math ---------- */
// Canadian fixed mortgages compound twice a year.
const mRate = annualPct => Math.pow(1 + (annualPct || 0) / 200, 1 / 6) - 1;
function mortgagePay(bal, ratePct, years) {
  const i = mRate(ratePct), n = (years || 25) * 12;
  if (!bal) return 0;
  return i ? bal * i / (1 - Math.pow(1 + i, -n)) : bal / n;
}
const perMonth = e => e.per === 'y' ? (e.amount || 0) / 12 : (e.amount || 0);
function propFin(p) {
  const us = unitsOf(p.id);
  const potential = us.reduce((a, u) => a + (u.rent || 0), 0);
  const rent = us.filter(u => u.tenant).reduce((a, u) => a + (u.rent || 0), 0);
  const opex = p.expenses.reduce((a, e) => a + perMonth(e), 0);
  const m = p.mortgage || {};
  const pay = m.payment > 0 ? m.payment : mortgagePay(m.balance, m.rate, m.years);
  const interest = Math.min(pay, (m.balance || 0) * mRate(m.rate));
  const principal = Math.max(0, pay - interest);
  const noi = rent - opex, cash = noi - pay;
  return { potential, rent, vacancy: potential - rent, opex, pay, interest, principal, noi, cash,
    value: p.value || 0, equity: (p.value || 0) - (m.balance || 0), invested: p.invested || 0,
    cap: p.value ? noi * 12 / p.value : NaN, coc: p.invested ? cash * 12 / p.invested : NaN,
    roi: p.invested ? (cash + principal) * 12 / p.invested : NaN,
    rooms: us.length, empty: us.filter(u => !u.tenant).length };
}
function pfFin(pf) {
  const keys = ['potential', 'rent', 'vacancy', 'opex', 'pay', 'interest', 'principal', 'noi', 'cash', 'value', 'equity', 'invested', 'rooms', 'empty'];
  const t = Object.fromEntries(keys.map(k => [k, 0]));
  propsOf(pf.id).forEach(p => { const f = propFin(p); keys.forEach(k => t[k] += f[k]); });
  t.cap = t.value ? t.noi * 12 / t.value : NaN;
  t.coc = t.invested ? t.cash * 12 / t.invested : NaN;
  t.roi = t.invested ? (t.cash + t.principal) * 12 / t.invested : NaN;
  t.fee = pf.kind === 'managed' ? t.rent * (pf.feePct || 0) / 100 : 0;
  return t;
}
function renoCalc(r) {
  const total = (r.cost || 0) + (r.lost || 0);
  const yearly = (r.rentUp || 0) * 12;
  const loanPay = r.financed ? mortgagePay(r.cost, r.rate, r.years) * 12 : 0;
  const payback = yearly > 0 ? total / yearly : Infinity;
  const roi = total ? yearly / total : NaN;
  let interest5 = 0;
  if (r.financed) { let bal = r.cost || 0; const i = mRate(r.rate), pm = loanPay / 12; for (let k = 0; k < 60 && bal > 0; k++) { const it = bal * i; interest5 += it; bal -= pm - it; } }
  const five = yearly * 5 + (r.valueUp || 0) - total - interest5;
  let verdict = ['b', 'Probably not worth it for the rent alone'];
  if (payback <= 3) verdict = ['g', 'Strong — pays for itself in ' + payback.toFixed(1) + ' years'];
  else if (payback <= 6) verdict = ['w', 'Okay — pays for itself in ' + payback.toFixed(1) + ' years'];
  else if (isFinite(payback)) verdict = ['b', 'Slow — takes ' + payback.toFixed(1) + ' years to pay back'];
  return { total, yearly, loanPay, payback, roi, five, verdict };
}

/* ---------- cleaning and garbage rotation ---------- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekIdx(p, date) { return Math.round((mondayOf(date) - mondayOf(pDate(p.choreStart || '2026-01-05'))) / 6048e5); }
const mod = (a, n) => ((a % n) + n) % n;
function floorTenants(p, fid) { return unitsOf(p.id).filter(u => u.floor === fid && u.tenant).map(u => byId(S.tenants, u.tenant)).filter(Boolean); }
function cleanerFor(p, fid, w) { const l = floorTenants(p, fid); return l.length ? l[mod(w, l.length)] : null; }
// Garbage rotates through everyone in the house, arranged so nobody gets cleaning and garbage in the same week.
function garbageOrder(p) {
  const pool = [];
  p.floors.forEach(f => { const l = floorTenants(p, f.id); l.forEach((t, i) => pool.push({ t, i, n: l.length, f: f.id })); });
  const out = []; let lastF = null;
  for (let pos = 0; pos < pool.length; pos++) {
    const free = pool.filter(x => !out.includes(x));
    const ok = free.filter(x => x.n < 2 || mod(pos, x.n) !== x.i);
    const pick = (ok.find(x => x.f !== lastF) || ok[0] || free[0]);
    out.push(pick); lastF = pick.f;
  }
  return out.map(x => x.t);
}
function garbageFor(p, w) {
  const l = garbageOrder(p); if (!l.length) return null;
  if (w < 0) return l[mod(w, l.length)];
  // Each week: among people who are not cleaning, pick whoever has done garbage least (then longest ago). Keeps it fair even when a room is empty.
  const cnt = new Map(l.map(t => [t, 0])), last = new Map(l.map((t, i) => [t, i - 100])); let pick;
  for (let k = 0; k <= w; k++) {
    const busy = p.floors.map(f => cleanerFor(p, f.id, k)), free = l.filter(t => !busy.includes(t)), pool = free.length ? free : l;
    pick = pool.reduce((a, b) => (cnt.get(b) < cnt.get(a) || (cnt.get(b) === cnt.get(a) && last.get(b) < last.get(a))) ? b : a);
    cnt.set(pick, cnt.get(pick) + 1); last.set(pick, k);
  }
  return pick;
}
const wasteType = (p, w) => (mod(w, 2) === 0) !== !!p.wasteFlip ? 'Garbage' : 'Recycling';
const addDays = (s, n) => { const d = pDate(s); d.setDate(d.getDate() + n); return iso(d); };
const dn = s => pDate(s).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const cityCal = p => (typeof CITY !== 'undefined' && p.cityCal && CITY.cal[p.cityCal]) || null;
const wasteDayOf = p => cityCal(p) ? DAYS.indexOf(p.cityCal.replace(/\d+$/, '')) : (p.wasteDay ?? 2);
// What the truck takes in the week starting monIso. Uses the City of Toronto's published dates when a calendar is chosen.
function pickupFor(p, monIso, w) {
  const cal = cityCal(p), day = wasteDayOf(p), guess = addDays(monIso, mod(day - 1, 7));
  if (!cal) return { date: guess, waste: wasteType(p, w), extra: '', official: false };
  for (let i = 0; i < 7; i++) { const d = addDays(monIso, i), f = cal[d];
    if (f !== undefined) return { date: d, waste: f.includes('G') ? 'Garbage' : 'Recycling', extra: (f.includes('Y') ? ' + yard waste' : '') + (f.includes('X') ? ' + Christmas trees' : ''), official: true }; }
  // Past the last date the City has published: keep alternating from the last known week.
  const last = Object.keys(cal).sort().pop(), weeks = Math.round((pDate(monIso) - mondayOf(pDate(last))) / 6048e5);
  const g = (mod(weeks, 2) === 0) === cal[last].includes('G');
  return { date: guess, waste: g !== !!p.wasteFlip ? 'Garbage' : 'Recycling', extra: '', official: false };
}
function schedule(p, weeks = 8, from = new Date()) {
  const w0 = weekIdx(p, from), m0 = mondayOf(from), rows = [];
  for (let k = 0; k < weeks; k++) {
    const mon = new Date(m0); mon.setDate(mon.getDate() + k * 7);
    const pk = pickupFor(p, iso(mon), w0 + k);
    rows.push({ mon: iso(mon), pickup: pk.date, w: w0 + k, waste: pk.waste, bins: pk.waste + ' + green bin' + pk.extra, official: pk.official, garbage: garbageFor(p, w0 + k),
      clean: p.floors.map(f => ({ f, t: cleanerFor(p, f.id, w0 + k) })) });
  }
  return rows;
}

/* ---------- rent rules ---------- */
function increaseInfo(t) {
  const u = tenantUnit(t.id); if (!u || !t.leaseStart) return null;
  const base = t.lastIncrease || t.leaseStart;
  const next = pDate(base); next.setFullYear(next.getFullYear() + 1);
  const g = GUIDELINE[next.getFullYear()] ?? GUIDELINE[2027];
  const notice = new Date(next); notice.setDate(notice.getDate() - 90);
  return { next: iso(next), noticeBy: iso(notice), g, up: Math.round(u.rent * g) / 100, daysToNotice: daysBetween(today(), iso(notice)) };
}

/* ---------- things that need attention (used by Home and the weekly check-up) ---------- */
function findings(pf) {
  const out = [], add = (sev, text, view, tip) => out.push({ sev, text, view, tip });
  const mk = monthKey(), paid = S.payments[mk] || {}, dom = new Date().getDate();
  if (S.sample) add('med', 'The app still has example numbers. Replace them with your real rents, mortgage and bills.', 'properties');
  propsOf(pf.id).forEach(p => {
    const f = propFin(p);
    unitsOf(p.id).forEach(u => {
      if (!u.tenant) {
        add('high', `${u.name} at ${p.name} is empty — that costs about ${money(u.rent / 30)} every day.`, 'market');
        const ad = S.ads[u.id], posts = ad ? Object.values(ad.ch || {}).filter(c => c.posted) : [];
        if (!posts.length) add('high', `No ad is posted yet for ${u.name}.`, 'market');
        else if (posts.every(c => daysBetween(c.posted, today()) > 7)) add('med', `The ads for ${u.name} are more than a week old. Refresh them so they go back to the top.`, 'market');
      } else if (u.market > u.rent * 1.05) add('low', `${u.name} rents for ${money(u.rent)} but similar rooms get about ${money(u.market)}. Use the higher price when the next tenant moves in.`, 'properties');
    });
    if (f.cash < 0 && pf.kind === 'owned') add('high', `${p.name} loses ${money(-f.cash)} a month after the mortgage and bills.`, 'money');
    if (f.rent && f.opex / f.rent > 0.5) add('low', `Bills at ${p.name} take ${pct(f.opex / f.rent)} of the rent. Worth checking insurance and utility prices.`, 'properties');
    if (unitsOf(p.id).length >= 4 && /toronto|north york|scarborough|etobicoke/i.test(p.address) && !(p.compliance || {}).licence)
      add('high', `${p.name} has 4 or more rented rooms. Toronto requires a multi-tenant house licence — tick it off once you have it.`, 'contracts');
  });
  propsOf(pf.id).forEach(p => { if (p.floors.length && /toronto|north york|scarborough|etobicoke/i.test(p.address) && !cityCal(p)) add('low', `Choose the City pickup calendar for ${p.name} so garbage weeks and holiday changes are always right.`, 'chores'); });
  pfTenants(pf.id).forEach(t => {
    const u = tenantUnit(t.id), p = byId(S.properties, u.prop);
    if (dom > 3 && !paid[t.id]) add('high', `${t.name} (${u.name}) has not been marked as paid for this month.`, 'money');
    if (!t.email) add('low', `${t.name} has no email saved, so documents cannot be sent.`, 'people');
    const docs = S.docs.filter(d => d.tenant === t.id);
    if (p.camera && !docs.some(d => d.kind === 'camera' && d.status === 'signed')) add('med', `${t.name} has not signed the outdoor camera notice.`, 'contracts');
    if (p.floors.length && !docs.some(d => d.kind === 'rules' && d.status === 'signed')) add('low', `${t.name} has not signed the house rules and cleaning agreement.`, 'contracts');
    const inc = increaseInfo(t);
    if (inc && inc.daysToNotice <= 30) add('med', `${t.name}: you can raise the rent by up to ${inc.g}% (${money(inc.up, 2)} a month) from ${nice(inc.next)}. Form N1 must be given by ${nice(inc.noticeBy)}.`, 'contracts');
  });
  const lb = S.settings.lastBackup;
  if (!lb || daysBetween(lb, today()) > 7) add('low', 'No backup saved in the last week. Save one so your numbers are never lost.', 'settings');
  return out;
}
function qcScore(list) { return Math.max(0, 100 - list.reduce((a, f) => a + ({ high: 12, med: 6, low: 2 }[f.sev]), 0)); }

/* ---------- private tenant links (packed into the link itself) ---------- */
async function pack(obj) {
  let bytes = new TextEncoder().encode(JSON.stringify(obj)), z = '0';
  if (window.CompressionStream) { bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); z = '1'; }
  let b = ''; bytes.forEach(c => b += String.fromCharCode(c));
  return z + btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpack(s) {
  let bytes = Uint8Array.from(atob(s.slice(1).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  if (s[0] === '1') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(bytes));
}
function tenantPayload(t) {
  const u = tenantUnit(t.id), p = byId(S.properties, u.prop), fl = byId(p.floors, u.floor);
  const first = x => x ? x.name : '—';
  return { n: t.name, u: u.name, p: p.name, a: p.address, ll: S.settings.landlord, le: S.settings.email, lp: S.settings.phone, rent: u.rent,
    made: today(), fl: fl ? fl.name : '', tasks: fl ? fl.tasks : '', day: DAYS[wasteDayOf(p)],
    sch: fl ? schedule(p, 12).map(r => ({ m: r.mon, pk: r.pickup, w: r.bins, g: first(r.garbage), c: first((r.clean.find(c => c.f.id === fl.id) || {}).t) })) : [],
    docs: S.docs.filter(d => d.tenant === t.id && d.status !== 'draft').map(d => ({ t: d.title, b: d.body, s: d.status })) };
}
const isHosted = () => /^https?:/.test(location.protocol);
async function tenantLink(t) { return location.href.split('#')[0] + '#t=' + await pack(tenantPayload(t)); }

/* ---------- small UI helpers ---------- */
function toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
async function copy(text) { try { await navigator.clipboard.writeText(text); } catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }
function resolve(path) {
  const segs = path.split('.'); let o = S;
  for (let i = 0; i < segs.length - 1; i++) {
    const [k, id] = segs[i].split(':');
    o = id !== undefined ? o[k].find(x => x.id === id) : (o[k] ??= {});
  }
  return [o, segs[segs.length - 1]];
}
const num = (path, val, w) => `<input class="in" type="number" step="any" data-bind="${path}" data-type="num" value="${val ?? ''}"${w ? ` style="width:${w}px"` : ''} aria-label="${esc(path.split('.').pop())}">`;
const txt = (path, val, ph = '', type = 'text') => `<input class="in" type="${type}" data-bind="${path}" value="${esc(val)}" placeholder="${esc(ph)}">`;
const field = (label, html) => `<label class="f">${esc(label)}${html}</label>`;
const sel = (path, val, opts, type = '') => `<select data-bind="${path}" data-type="${type}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
