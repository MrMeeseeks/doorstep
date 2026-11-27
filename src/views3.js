/* Doorstep — Records & documents, past renovations, "where you stand" */

/* ---------- uploaded files live in the browser's file store (IndexedDB), not in the small settings store ---------- */
const fdb = () => new Promise((res, rej) => { const r = indexedDB.open('doorstep-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const fop = async (mode, fn) => { const db = await fdb(); return new Promise((res, rej) => { const tx = db.transaction('f', mode), q = fn(tx.objectStore('f')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); };
const fput = (id, blob) => fop('readwrite', s => s.put(blob, id));
const fget = id => fop('readonly', s => s.get(id));
const fdel = id => fop('readwrite', s => s.delete(id));
async function allFileData() { const o = {}; for (const f of S.files) { const b = await fget(f.id); if (b) o[f.id] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } return o; }
async function restoreFiles(o) { for (const [id, u] of Object.entries(o)) await fput(id, await (await fetch(u)).blob()); }
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

const FCAT = ['Lease or contract', 'Mortgage', 'Insurance', 'Property tax', 'Licence or permit', 'Receipt or invoice', 'Renovation', 'Bank statement', 'Other'];
const LCAT = ['Rent', 'Other income', 'Mortgage payment', 'Property tax', 'Insurance', 'Utilities', 'Repairs', 'Renovation', 'Management or legal fees', 'Other cost'];
const isIncome = c => c === 'Rent' || c === 'Other income';

/* ---------- where she stands ---------- */
function standing(pf) {
  const pids = propsOf(pf.id).map(p => p.id), years = {}, Y = y => (years[y] ??= { inc: 0, out: 0, reno: 0 });
  S.ledger.filter(l => l.pf === pf.id).forEach(l => { const y = Y((l.date || today()).slice(0, 4)); if (isIncome(l.cat)) y.inc += l.amount || 0; else y.out += l.amount || 0; });
  S.pastRenos.filter(r => pids.includes(r.prop)).forEach(r => { Y((r.date || today()).slice(0, 4)).reno += r.cost || 0; });
  const tids = pfTenants(pf.id).map(t => t.id); let paid = 0;
  Object.entries(S.payments).forEach(([m, o]) => Object.keys(o).forEach(tid => { if (tids.includes(tid)) { const r = tenantUnit(tid).rent || 0; Y(m.slice(0, 4)).inc += r; paid += r; } }));
  const t = Object.values(years).reduce((a, y) => ({ inc: a.inc + y.inc, out: a.out + y.out, reno: a.reno + y.reno }), { inc: 0, out: 0, reno: 0 });
  return { years, ...t, paid, net: t.inc - t.out - t.reno };
}

V.records = pf => {
  const st = standing(pf), f = pfFin(pf), ps = propsOf(pf.id), led = S.ledger.filter(l => l.pf === pf.id).sort((a, b) => (b.date || '').localeCompare(a.date || '')), files = S.files.filter(x => x.pf === pf.id);
  const yrs = Object.keys(st.years).sort().reverse(), cat = S.ui.fileCat || FCAT[0];
  return `<h1>Records & documents</h1><div class="sub">Keep the paperwork and the past numbers in one place. The more you record, the truer the picture.</div>
  <div class="card"><h2>Where you stand</h2>
  <div class="grid"><div class="stat"><div class="l">Money that came in</div><div class="v pos">${money(st.inc)}</div><div class="h">everything recorded so far</div></div>
  <div class="stat"><div class="l">Money that went out</div><div class="v">${money(st.out + st.reno)}</div><div class="h">${money(st.out)} costs + ${money(st.reno)} renovations</div></div>
  <div class="stat"><div class="l">Ahead or behind so far</div><div class="v ${st.net >= 0 ? 'pos' : 'neg'}">${money(st.net)}</div><div class="h">in minus out, from your records</div></div>
  <div class="stat"><div class="l">Your share of the properties today</div><div class="v">${money(f.equity)}</div><div class="h">worth ${money(f.value)} − ${money(f.value - f.equity)} owed</div></div></div>
  ${yrs.length ? `<div class="tw"><table><tr><th>Year</th><th class="n">Came in</th><th class="n">Costs</th><th class="n">Renovations</th><th class="n">Left over</th></tr>${yrs.map(y => { const x = st.years[y], n = x.inc - x.out - x.reno; return `<tr><td>${y}</td><td class="n">${money(x.inc)}</td><td class="n">${money(x.out)}</td><td class="n">${money(x.reno)}</td><td class="n ${n >= 0 ? 'pos' : 'neg'}"><b>${money(n)}</b></td></tr>`; }).join('')}</table></div>` : '<p>Nothing recorded yet. Add past rent, bills and renovations below and this fills in.</p>'}
  <div class="note"><b>In plain words:</b> you put in <b>${money(f.invested)}</b> of your own cash. Today the properties leave you <b class="${f.cash >= 0 ? 'pos' : 'neg'}">${money(f.cash)}</b> a month and your share is <b>${money(f.equity)}</b>.${st.reno && f.cash > 0 ? ` At today’s pace the ${money(st.reno)} of renovations you recorded is earned back in about <b>${(st.reno / (f.cash * 12)).toFixed(1)} years</b>.` : ''}
  <div class="small" style="margin-top:.3rem">“Came in” includes rent you marked as paid on the Money screen (${money(st.paid)}) plus the records below. This is only as complete as what you enter — it is a guide, not a tax return.</div></div></div>

  <div class="card"><h2>Past money in and out</h2><p>For bookkeeping: add old rent, bills or anything from earlier years. One line can be a whole year (for example “Rent 2024 — $58,000”).</p>
  <div class="row"><button class="btn" data-act="addLedger">＋ Add a record</button><label class="btn sec" style="cursor:pointer">⬆️ Bring in a spreadsheet (CSV)<input type="file" accept=".csv,text/csv" hidden data-csv="1"></label></div>
  <p class="small">A spreadsheet needs three columns: date, description, amount. Money out can be a minus number.</p>
  ${led.length ? `<div class="tw"><table><tr><th>Date</th><th>What</th><th>Property</th><th class="n">Amount ($)</th><th>Note</th><th></th></tr>${led.map(l => { const b = `ledger:${l.id}`; return `<tr><td>${txt(b + '.date', l.date, '', 'date')}</td><td>${sel(b + '.cat', l.cat, LCAT.map(c => [c, (isIncome(c) ? '＋ ' : '− ') + c]))}</td><td>${sel(b + '.prop', l.prop, [['', 'All'], ...ps.map(p => [p.id, p.name])])}</td><td class="n">${num(b + '.amount', l.amount, 110)}</td><td>${txt(b + '.note', l.note, 'optional')}</td><td><button class="btn del" data-act="delLedger" data-arg="${l.id}" aria-label="Remove record">Remove</button></td></tr>`; }).join('')}</table></div>` : ''}</div>

  <div class="card"><h2>Documents</h2><p>Keep contracts, mortgage papers, insurance, tax bills, licences and receipts here. Photos of paper documents work too.</p>
  <div class="row">${field('Kind of document', sel('ui.fileCat', cat, FCAT.map(c => [c, c])))}<label class="btn" style="cursor:pointer;align-self:flex-end">⬆️ Upload documents<input type="file" multiple hidden data-files="1"></label></div>
  ${files.length ? `<div class="tw" style="margin-top:.8rem"><table><tr><th>Name</th><th>Kind</th><th>For</th><th>Added</th><th></th></tr>${files.map(x => { const b = `files:${x.id}`; return `<tr><td>${txt(b + '.name', x.name)}<div class="small">${kb(x.size)}</div></td><td>${sel(b + '.cat', x.cat, FCAT.map(c => [c, c]))}</td><td>${sel(b + '.who', x.who || '', [['', 'General'], ...ps.map(p => ['p:' + p.id, p.name]), ...pfTenants(pf.id).map(t => ['t:' + t.id, t.name])])}</td><td>${nice(x.date)}</td><td><button class="btn sm" data-act="openFile" data-arg="${x.id}">Open</button> <button class="btn del" data-act="delFile" data-arg="${x.id}" data-confirm="1">Delete</button></td></tr>`; }).join('')}</table></div>` : '<p class="small" style="margin-top:.8rem">No documents yet.</p>'}
  <p class="small">Documents stay on this device and are included in the backup file (Settings). The app stores them; it does not read the numbers inside them, so type the amounts into the records above.</p></div>`;
};
A.addLedger = () => { S.ledger.push({ id: uid(), pf: curPf().id, date: today(), cat: 'Rent', prop: '', amount: 0, note: '' }); };
A.delLedger = id => { S.ledger = S.ledger.filter(l => l.id !== id); };
A.openFile = async id => { const w = window.open('', '_blank'), b = await fget(id); if (!b) { if (w) w.close(); toast('That file is not on this device'); return; } const u = URL.createObjectURL(b); if (w) w.location.href = u; else location.href = u; };
A.delFile = async id => { await fdel(id); S.files = S.files.filter(x => x.id !== id); };
function csvRows(text) { return text.split(/\r?\n/).filter(l => l.trim()).map(l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim())).map(r => { while (r.length && r[r.length - 1] === '') r.pop(); return r; }); }
function csvDate(s) { let m; if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/))) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; const d = new Date(s); return isNaN(d) ? '' : iso(d); }
document.addEventListener('change', async e => {
  const el = e.target; if (!el.dataset) return;
  if (el.dataset.files) {
    let n = 0, big = 0;
    for (const f of el.files) { if (f.size > 30 * 1048576) { big++; continue; } const id = uid(); try { await fput(id, f); S.files.unshift({ id, pf: curPf().id, name: f.name, cat: S.ui.fileCat || FCAT[0], who: '', date: today(), size: f.size }); n++; } catch (x) { big++; } }
    save(); render(); toast(`${n} document${n === 1 ? '' : 's'} saved${big ? ` · ${big} could not be saved (30 MB each at most)` : ''}`);
  }
  if (el.dataset.csv && el.files[0]) {
    let n = 0;
    csvRows(await el.files[0].text()).forEach(r => { const date = csvDate(r[0] || ''), amt = parseFloat(String(r[r.length - 1]).replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1')); if (!date || isNaN(amt)) return; const note = r.slice(1, -1).join(' ');
      const cat = amt < 0 ? (LCAT.find(c => !isIncome(c) && new RegExp(c.split(' ')[0], 'i').test(note)) || 'Other cost') : (/rent/i.test(note) ? 'Rent' : 'Other income');
      S.ledger.push({ id: uid(), pf: curPf().id, date, cat, prop: '', amount: Math.abs(amt), note }); n++; });
    save(); render(); toast(n ? `${n} records added. Check the “What” column for each.` : 'No rows with a date and an amount were found');
  }
});

/* ---------- renovations already done (shown under Renovations) ---------- */
const _renoIdeas = V.reno;
V.reno = pf => {
  const ps = propsOf(pf.id), list = S.pastRenos.filter(r => ps.some(p => p.id === r.prop)), tot = list.reduce((a, r) => a + (r.cost || 0), 0);
  return _renoIdeas(pf) + `<div class="card"><div class="row sp"><h2 style="margin:0">Renovations already done</h2><button class="btn" data-act="addPast">＋ Add a past renovation</button></div>
  <p>Record what you have already spent, and what extra rent it brought. The app shows how much of each one has been earned back.</p>
  ${list.map(r => { const b = `pastRenos:${r.id}`, months = r.date ? Math.max(0, daysBetween(r.date, today()) / 30.44) : 0, back = (r.rentUp || 0) * months, p = r.cost ? Math.min(1, back / r.cost) : 0, left = r.rentUp > 0 ? Math.max(0, (r.cost - back) / r.rentUp) : Infinity;
    return `<div style="border-top:1px solid var(--line);padding-top:.8rem;margin-top:.8rem"><div class="form">${field('What was done', txt(b + '.name', r.name))}${field('Property', sel(b + '.prop', r.prop, ps.map(x => [x.id, x.name])))}${field('Finished on', txt(b + '.date', r.date, '', 'date'))}${field('What it cost ($)', num(b + '.cost', r.cost))}${field('Extra rent it brought each month ($)', num(b + '.rentUp', r.rentUp))}${field('Note (contractor, warranty…)', txt(b + '.note', r.note))}</div>
    <div class="bar" style="height:16px;background:#eee" role="img" aria-label="${pct(p)} earned back"><div style="background:var(--good);flex:${p}"></div><div style="flex:${1 - p}"></div></div>
    <div class="row sp"><span>${r.rentUp > 0 ? `Earned back <b>${money(back)}</b> of ${money(r.cost)} (${pct(p)}). ${p >= 1 ? 'It has paid for itself ✓' : isFinite(left) ? `Fully paid back in about ${left < 12 ? Math.ceil(left) + ' months' : (left / 12).toFixed(1) + ' years'}.` : ''}` : 'Add the extra monthly rent to see when it pays for itself. Leave 0 if it was a repair that brought no extra rent.'}</span><button class="btn del" data-act="delPast" data-arg="${r.id}" data-confirm="1">Remove</button></div></div>`; }).join('')}
  ${list.length ? `<p style="margin-top:1rem"><b>Total spent on renovations: ${money(tot)}.</b> <span class="small">Make sure “Cash we put in” under Properties includes this amount, so your return is calculated correctly.</span></p>` : ''}</div>`;
};
A.addPast = () => { const pr = propsOf(curPf().id); if (!pr.length) { toast('Add a property first'); return false; } S.pastRenos.unshift({ id: uid(), prop: pr[pr.length - 1].id, name: 'Renovation', date: today(), cost: 0, rentUp: 0, note: '' }); };
A.delPast = id => { S.pastRenos = S.pastRenos.filter(r => r.id !== id); };

/* ---------- quick set-up: the address, and whether it is rented whole or room by room ---------- */
const FLOORN = ['Main floor', 'Upper floor', 'Third floor', 'Basement'];
const FLOORTASKS = 'Kitchen: counters, stove top, sink, microwave\nWashroom: toilet, sink, shower/tub, mirror\nCorridor and stairs: vacuum and tidy\nMop kitchen and washroom floors\nEmpty shared bins into the outdoor bins\nWipe door handles and light switches';
const addrInput = (path, val) => `<input class="in" data-bind="${path}" data-addr="1" list="addrs" value="${esc(val)}" placeholder="Start typing, e.g. 25 Main St" autocomplete="off">`;
let addrTimer;
document.addEventListener('input', e => {
  const el = e.target; if (!el.dataset || !el.dataset.addr || el.value.trim().length < 4) return;
  clearTimeout(addrTimer);
  addrTimer = setTimeout(async () => { try {
    const j = await (await fetch('https://map.toronto.ca/cotgeocoder/rest/geocoder/suggest?f=json&addressOnly=0&retRowLimit=6&searchString=' + encodeURIComponent(el.value.trim()))).json();
    let dl = $('#addrs'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'addrs'; document.body.appendChild(dl); }
    dl.innerHTML = ((j.result || {}).rows || []).map(r => `<option value="${esc(r.ADDRESS + ', Toronto, ON')}">`).join('');
  } catch (x) { } }, 350);
});
function setupCard(p) {
  const us = unitsOf(p.id), b = `properties:${p.id}`;
  const w = (p.wz ??= { mode: us.length > 1 ? 'rooms' : 'whole', rooms: Math.max(us.length, 2), floors: Math.max(p.floors.length, 1), rent: us[0] ? us[0].rent : 0 });
  const n = Math.max(1, Math.round(w.rooms || 1)), fl = Math.min(4, Math.max(1, Math.round(w.floors || 1)));
  return `<div class="card" style="border:2px solid var(--brand)"><h2>${us.length ? 'Change this property' : 'Set up the new property'}</h2>
  <div class="form">${field('Address', addrInput(b + '.address', p.address))}${field('A short name for it', txt(b + '.name', p.name))}${field('How is it rented?', sel(b + '.wz.mode', w.mode, [['whole', 'The whole place, to one household'], ['rooms', 'Room by room']]))}</div>
  <div class="form">${w.mode === 'rooms' ? field('How many rooms are rented?', num(b + '.wz.rooms', w.rooms)) + field('On how many floors?', num(b + '.wz.floors', w.floors)) + field('Usual rent for one room ($ a month)', num(b + '.wz.rent', w.rent)) : field('Rent for the whole place ($ a month)', num(b + '.wz.rent', w.rent))}</div>
  <div class="note">${w.mode === 'rooms' ? `This makes <b>${n} room${n > 1 ? 's' : ''}</b> on <b>${fl} floor${fl > 1 ? 's' : ''}</b>${fl > 1 ? ` (about ${Math.ceil(n / fl)} per floor)` : ''}, each with its own rent, tenant, contract and place in the cleaning rota. You can rename rooms and change each rent afterwards.${n > 6 && /north york|scarborough|etobicoke/i.test(p.address) ? ' <b>Note: North York, Scarborough and Etobicoke allow at most 6 rented rooms in a house.</b>' : n >= 4 && /toronto/i.test(p.address) ? ' With 4 or more rooms, Toronto requires a multi-tenant house licence.' : ''}` : 'This makes <b>one unit</b> with one rent and one contract. No cleaning rota is needed.'}${us.length ? ' Rooms that have a tenant are never removed.' : ''}</div>
  <div class="row"><button class="btn" data-act="applySetup" data-arg="${p.id}">Save and continue</button>${us.length ? `<button class="btn sec" data-act="cancelSetup" data-arg="${p.id}">Cancel</button>` : `<button class="btn del" data-act="delProp" data-arg="${p.id}">Cancel</button>`}</div>
  <p class="small">Toronto addresses are suggested as you type; the letters you type are sent to the City of Toronto’s address finder. Outside Toronto, just type the full address.</p></div>`;
}
A.reSetup = pid => { byId(S.properties, pid).setup = true; };
A.cancelSetup = pid => { const p = byId(S.properties, pid); p.setup = false; delete p.wz; };
A.applySetup = pid => {
  const p = byId(S.properties, pid), w = p.wz || { mode: 'whole', rent: 0 }, rent = w.rent || 0;
  let us = unitsOf(pid);
  const dropEmpty = keep => { for (let i = us.length - 1; i >= 0 && us.length > keep; i--) if (!us[i].tenant) { A.delUnit(us[i].id); us = unitsOf(pid); } };
  if (w.mode === 'whole') {
    dropEmpty(1);
    if (!us.length) S.units.push({ id: uid(), prop: pid, name: 'Whole place', floor: '', rent, market: rent, tenant: '', desc: '' });
    else if (us.length === 1) { us[0].name = /^room \d+$/i.test(us[0].name) ? 'Whole place' : us[0].name; us[0].floor = ''; if (rent) us[0].rent = rent; }
    if (unitsOf(pid).length === 1) p.floors = [];
  } else {
    const n = Math.max(1, Math.round(w.rooms || 1)), fl = Math.min(4, Math.max(1, Math.round(w.floors || 1)));
    while (p.floors.length < fl) p.floors.push({ id: uid(), name: FLOORN[p.floors.length], tasks: FLOORTASKS });
    if (p.floors.length > fl) { const gone = p.floors.slice(fl).map(f => f.id); p.floors = p.floors.slice(0, fl); us.forEach(u => { if (gone.includes(u.floor)) u.floor = ''; }); }
    dropEmpty(n);
    if (us.length === 1 && /whole/i.test(us[0].name)) us[0].name = 'Room 1';
    for (let k = us.length; k < n; k++) S.units.push({ id: uid(), prop: pid, name: 'Room ' + (k + 1), floor: '', rent, market: rent, tenant: '', desc: 'Private room, shared kitchen and washroom' });
    const per = Math.ceil(n / fl); unitsOf(pid).forEach((u, i) => { if (!u.floor) u.floor = p.floors[Math.min(fl - 1, Math.floor(i / per))].id; });
  }
  if (p.name === 'New property' && p.address) p.name = p.address.split(',')[0];
  p.setup = false; delete p.wz; S.ui.open = pid;
  toast('Saved. Now fill in the mortgage and bills below.');
};
