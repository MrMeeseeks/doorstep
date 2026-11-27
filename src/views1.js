/* Doorstep — shell, Home, Properties, Money, Renovations */
const NAV = [['home', '🏠', 'Home'], ['properties', '🏘️', 'Properties'], ['money', '💵', 'Money'], ['reno', '🔨', 'Renovations'], ['records', '📁', 'Records & documents'], ['market', '📣', 'Find tenants'], ['contracts', '📄', 'Contracts & rules'], ['chores', '🧹', 'Cleaning & garbage'], ['people', '👥', 'Tenants & links'], ['qc', '✅', 'Weekly check-up'], ['settings', '⚙️', 'Settings']];
const V = {}, A = {};
let unlocked = false;

function render() {
  S.files ??= []; S.ledger ??= []; S.pastRenos ??= [];
  if (S.settings.pin && !unlocked) {
    $('#app').innerHTML = `<main><div class="card lock"><h1>🏠 Doorstep</h1><p>Enter your PIN</p><input class="in" id="pin" type="password" inputmode="numeric" autofocus style="text-align:center;font-size:1.4rem;width:10rem"><p><button class="btn" data-act="unlock">Open</button></p></div></main>`;
    return;
  }
  const y = scrollY, fb = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.bind : null;
  const pf = curPf(), urgent = findings(pf).filter(f => f.sev === 'high').length, v = V[S.ui.view] ? S.ui.view : 'home';
  $('#app').innerHTML = `<nav aria-label="Main menu"><div class="logo">🏠 Doorstep</div>${NAV.map(([id, ic, l]) => `<button class="${id === v ? 'on' : ''}" data-act="nav" data-arg="${id}"${id === v ? ' aria-current="page"' : ''}><span aria-hidden="true">${ic}</span>${l}${id === 'qc' && urgent ? `<span class="badge" title="${urgent} urgent items">${urgent}</span>` : ''}</button>`).join('')}</nav>
  <main><div class="top"><label class="small" for="pfsel">Showing</label>${sel('ui.pf', S.ui.pf, S.portfolios.map(p => [p.id, p.name + (p.kind === 'managed' ? ' (managed for a client)' : '')])).replace('<select', '<select id="pfsel"')}</div>
  ${S.sample ? `<div class="banner"><span>👋 These are <b>example numbers</b>. Open <b>Properties</b> and type your real rents, mortgage and bills over them.</span><button class="btn sm sec" data-act="clearSample">I've entered my real numbers</button></div>` : ''}
  ${V[v](pf)}</main>`;
  scrollTo(0, y);
  if (fb) { const el = document.querySelector(`[data-bind="${fb}"]`); if (el) el.focus(); }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (TP) { A[el.dataset.act](el.dataset.arg, el); return; }
  if (el.dataset.confirm && !el._armed) { const old = el.textContent; el._armed = 1; el.textContent = 'Tap again to confirm'; setTimeout(() => { if (el.isConnected) { el._armed = 0; el.textContent = old; } }, 3500); return; }
  const r = A[el.dataset.act](el.dataset.arg, el);
  if (r instanceof Promise) r.then(() => { save(); render(); }); else if (r !== false) { save(); render(); }
});
document.addEventListener('change', e => {
  const el = e.target; if (!el.dataset || !el.dataset.bind) return;
  const [o, k] = resolve(el.dataset.bind);
  o[k] = el.type === 'checkbox' ? el.checked : el.dataset.type === 'num' ? (parseFloat(el.value) || 0) : el.value;
  save(); render();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pin') A.unlock(); });

function track(view) { const u = S.usage; (u.views[view] ??= { n: 0, last: '' }).n++; u.views[view].last = today(); u.days[today()] = 1; }
A.nav = v => { S.ui.view = v; track(v); save(); render(); scrollTo(0, 0); return false; };
A.unlock = () => { if ($('#pin').value === S.settings.pin) { unlocked = true; render(); } else toast('That PIN is not right'); return false; };
A.clearSample = () => { S.sample = false; };

/* ---------------- Home ---------------- */
V.home = pf => {
  const f = pfFin(pf), fs = findings(pf), managed = pf.kind === 'managed';
  const used = Object.entries(S.usage.views).filter(([k]) => k !== 'home' && V[k]).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([k]) => k);
  const quick = [...new Set([...used, 'money', 'market', 'chores', 'contracts'])].slice(0, 4);
  const h = new Date().getHours(), hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const stats = managed ? [
    ['Rent collected each month', money(f.rent), `${f.rooms - f.empty} of ${f.rooms} rooms rented`],
    ['Your management fee', money(f.fee), `${pf.feePct}% of the rent`, 'pos'],
    ["Owner's money left over", money(f.cash - f.fee), 'after bills, mortgage and your fee', f.cash - f.fee >= 0 ? 'pos' : 'neg'],
    ["Owner's return", pct(f.invested ? (f.cash - f.fee + f.principal) * 12 / f.invested : NaN), 'per year on the cash they put in']
  ] : [
    ['Rent coming in each month', money(f.rent), f.vacancy ? `${money(f.vacancy)} more if every room is rented` : 'every room is rented 🎉'],
    ['Going out each month', money(f.opex + f.pay), `${money(f.pay)} mortgage + ${money(f.opex)} bills`],
    ['Left in your pocket', money(f.cash), `${money(f.cash * 12)} a year`, f.cash >= 0 ? 'pos' : 'neg'],
    ['Return on your money', pct(f.roi), `${pct(f.coc)} cash + mortgage paid down`, f.roi >= 0 ? 'pos' : 'neg']
  ];
  return `<h1>${hi}${S.settings.landlord ? ', ' + esc(S.settings.landlord.split(' ')[0]) : ''}</h1><div class="sub">${esc(pf.name)} — ${nice(today())}</div>
  <div class="grid">${stats.map(([l, v, hint, c]) => `<div class="stat"><div class="l">${l}</div><div class="v ${c || ''}">${v}</div><div class="h">${hint}</div></div>`).join('')}</div>
  <div class="card"><h2>What needs your attention</h2>${fs.length ? fs.slice(0, 6).map(todoRow).join('') + (fs.length > 6 ? `<p><button class="btn ghost" data-act="nav" data-arg="qc">See all ${fs.length} items →</button></p>` : '') : '<p>Nothing right now. Everything is in good shape. 🌿</p>'}</div>
  <div class="card"><h2>Your shortcuts</h2><p class="small">These change over time to match what you use most.</p><div class="row">${quick.map(k => { const n = NAV.find(x => x[0] === k); return `<button class="btn sec" data-act="nav" data-arg="${k}">${n[1]} ${n[2]}</button>`; }).join('')}</div></div>
  <div class="card"><h2>Each property this month</h2><div class="tw"><table><tr><th>Property</th><th class="n">Rent in</th><th class="n">Bills</th><th class="n">Mortgage</th><th class="n">Left over</th><th>Rooms</th></tr>
  ${propsOf(pf.id).map(p => { const x = propFin(p); return `<tr><td><b>${esc(p.name)}</b></td><td class="n">${money(x.rent)}</td><td class="n">${money(x.opex)}</td><td class="n">${money(x.pay)}</td><td class="n ${x.cash >= 0 ? 'pos' : 'neg'}"><b>${money(x.cash)}</b></td><td>${x.empty ? `<span class="chip b">${x.empty} empty</span>` : '<span class="chip g">Full</span>'}</td></tr>`; }).join('') || '<tr><td colspan="6">No properties yet. Add one under Properties.</td></tr>'}</table></div></div>`;
};
const todoRow = f => `<div class="todo"><span class="dot ${f.sev}" title="${f.sev === 'high' ? 'Urgent' : f.sev === 'med' ? 'Soon' : 'When you have time'}"></span><span class="t">${esc(f.text)}</span><button class="btn sm sec" data-act="nav" data-arg="${f.view}">Open</button></div>`;

/* ---------------- Properties ---------------- */
V.properties = pf => `<h1>Properties</h1><div class="sub">Type your real numbers here. Everything else in the app is worked out from them.</div>
  <div class="card"><h2>This group: ${esc(pf.name)}</h2><p class="small">A group keeps one owner's properties and money separate. Make a new group for each client you manage for.</p>
  <div class="form">${field('Group name', txt(`portfolios:${pf.id}.name`, pf.name))}${field('Whose is it?', sel(`portfolios:${pf.id}.kind`, pf.kind, [['owned', 'Ours'], ['managed', 'I manage it for a client']]))}
  ${pf.kind === 'managed' ? field('Client name', txt(`portfolios:${pf.id}.owner`, pf.owner)) + field('My fee (% of rent)', num(`portfolios:${pf.id}.feePct`, pf.feePct)) : ''}</div>
  <div class="row"><button class="btn sec" data-act="addPf">＋ New group (for a client)</button>${S.portfolios.length > 1 ? `<button class="btn del" data-act="delPf" data-arg="${pf.id}" data-confirm="1">Delete this group</button>` : ''}</div></div>
  ${propsOf(pf.id).map(propCard).join('')}
  <button class="btn" data-act="addProp">＋ Add a property</button>`;

function propCard(p) {
  const f = propFin(p), open = S.ui.open === p.id, b = `properties:${p.id}`;
  const free = S.tenants.filter(t => !tenantUnit(t.id));
  const head = `<div class="row sp"><div><h2 style="margin:0">${esc(p.name)}</h2><span class="small">${esc(p.address)} · ${f.rooms} unit${f.rooms === 1 ? '' : 's'} · ${money(f.rent)} rent · <b class="${f.cash >= 0 ? 'pos' : 'neg'}">${money(f.cash)} left over</b> a month</span></div><button class="btn sec" data-act="openProp" data-arg="${p.id}" aria-expanded="${open}">${open ? 'Close' : 'Open and edit'}</button></div>`;
  if (!open) return `<div class="card">${head}</div>`;
  return `<div class="card">${head}
  <h3>The basics</h3><div class="form">${field('Name', txt(b + '.name', p.name))}${field('Address', txt(b + '.address', p.address))}${field('What it is worth today ($)', num(b + '.value', p.value))}${field('Cash we put in ($) — down payment + renovations', num(b + '.invested', p.invested))}</div>
  <h3>Mortgage</h3><div class="form">${field('Amount still owed ($)', num(b + '.mortgage.balance', p.mortgage.balance))}${field('Interest rate (%)', num(b + '.mortgage.rate', p.mortgage.rate))}${field('Years left to pay', num(b + '.mortgage.years', p.mortgage.years))}${field('Monthly payment ($) — leave 0 to calculate', num(b + '.mortgage.payment', p.mortgage.payment))}</div>
  <div class="note">Payment <b>${money(f.pay)}</b> a month. Of that, <b>${money(f.interest)}</b> is interest (gone) and <b>${money(f.principal)}</b> pays down the loan (you keep it as equity).</div>
  <h3>Bills and expenses</h3><div class="tw"><table><tr><th>What</th><th class="n">Amount ($)</th><th>How often</th><th></th></tr>
  ${p.expenses.map(e => `<tr><td>${txt(`${b}.expenses:${e.id}.name`, e.name)}</td><td class="n">${num(`${b}.expenses:${e.id}.amount`, e.amount)}</td><td>${sel(`${b}.expenses:${e.id}.per`, e.per, [['m', 'every month'], ['y', 'once a year']])}</td><td><button class="btn del" data-act="delExp" data-arg="${p.id}|${e.id}" aria-label="Remove ${esc(e.name)}">Remove</button></td></tr>`).join('')}
  <tr><td colspan="4"><button class="btn ghost" data-act="addExp" data-arg="${p.id}">＋ Add a bill</button> <span class="small">Total: ${money(f.opex)} a month</span></td></tr></table></div>
  <h3>Rooms / units</h3><div class="tw"><table><tr><th>Name</th>${p.floors.length ? '<th>Floor</th>' : ''}<th class="n">Rent now ($)</th><th class="n">Market rent ($)</th><th>Who lives there</th><th></th></tr>
  ${unitsOf(p.id).map(u => `<tr><td>${txt(`units:${u.id}.name`, u.name)}</td>${p.floors.length ? `<td>${sel(`units:${u.id}.floor`, u.floor, [['', '—'], ...p.floors.map(x => [x.id, x.name])])}</td>` : ''}<td class="n">${num(`units:${u.id}.rent`, u.rent, 100)}</td><td class="n">${num(`units:${u.id}.market`, u.market, 100)}</td><td>${sel(`units:${u.id}.tenant`, u.tenant, [['', '— empty —'], ...S.tenants.filter(t => t.id === u.tenant || free.includes(t)).map(t => [t.id, t.name])])}</td><td><button class="btn del" data-act="delUnit" data-arg="${u.id}" data-confirm="1">Remove</button></td></tr>`).join('')}
  <tr><td colspan="6"><button class="btn ghost" data-act="addUnit" data-arg="${p.id}">＋ Add a room</button> <button class="btn ghost" data-act="addFloor" data-arg="${p.id}">＋ Add a floor</button> <span class="small">Add new people under “Tenants & links”, then pick them here.</span></td></tr></table></div>
  <h3>Room photos</h3>${unitsOf(p.id).map(u => `<div><b>${esc(u.name)}</b>${photoStrip(u)}</div>`).join('')}
  <h3>Other</h3><label class="row"><input type="checkbox" data-bind="${b}.camera" ${p.camera ? 'checked' : ''}> There is a security camera outside this property</label>
  <p style="margin-top:1rem"><button class="btn del" data-act="delProp" data-arg="${p.id}" data-confirm="1">Delete this property</button></p></div>`;
}
A.openProp = id => { S.ui.open = S.ui.open === id ? '' : id; };
A.addPf = () => { const id = uid(); S.portfolios.push({ id, name: 'New client', kind: 'managed', feePct: 8, owner: '' }); S.ui.pf = id; toast('New group made. Give it a name.'); };
A.delPf = id => { propsOf(id).forEach(p => A.delProp(p.id)); S.portfolios = S.portfolios.filter(p => p.id !== id); S.ui.pf = S.portfolios[0].id; };
A.addProp = () => { const id = uid(); S.properties.push({ id, pf: curPf().id, name: 'New property', address: '', value: 0, invested: 0, mortgage: { balance: 0, rate: 5, years: 25, payment: 0 }, expenses: [], floors: [], camera: false, wasteDay: 2, wasteFlip: false, choreStart: '2026-01-05', compliance: {} }); S.units.push({ id: uid(), prop: id, name: 'Unit 1', floor: '', rent: 0, market: 0, tenant: '', desc: '' }); S.ui.open = id; };
A.delProp = id => { S.units = S.units.filter(u => u.prop !== id); S.properties = S.properties.filter(p => p.id !== id); S.renos = S.renos.filter(r => r.prop !== id); };
A.addExp = pid => { byId(S.properties, pid).expenses.push({ id: uid(), name: 'New bill', amount: 0, per: 'm' }); };
A.delExp = arg => { const [pid, eid] = arg.split('|'), p = byId(S.properties, pid); p.expenses = p.expenses.filter(e => e.id !== eid); };
A.addUnit = pid => { const p = byId(S.properties, pid); S.units.push({ id: uid(), prop: pid, name: 'Room ' + (unitsOf(pid).length + 1), floor: p.floors[0] ? p.floors[0].id : '', rent: 0, market: 0, tenant: '', desc: '' }); };
A.delUnit = id => { S.units = S.units.filter(u => u.id !== id); delete S.ads[id]; delete PH[id]; savePhotos(); };
A.addFloor = pid => { const p = byId(S.properties, pid); p.floors.push({ id: uid(), name: 'Floor ' + (p.floors.length + 1), tasks: 'Kitchen\nWashroom\nCorridor\nVacuum and mop\nEmpty bins' }); toast('Floor added. Rename it under Cleaning & garbage.'); };

/* ---------------- Money ---------------- */
V.money = pf => {
  const f = pfFin(pf), mk = S.ui.month || monthKey(), paid = S.payments[mk] || {}, ts = pfTenants(pf.id);
  const expected = ts.reduce((a, t) => a + tenantUnit(t.id).rent, 0), got = ts.filter(t => paid[t.id]).reduce((a, t) => a + tenantUnit(t.id).rent, 0);
  const parts = [['Bills', f.opex, '#c9803a'], ['Mortgage interest', f.interest, '#b3261e'], ['Mortgage paid down (yours)', f.principal, '#5b8fd9'], ['Left in your pocket', Math.max(0, f.cash), '#1a7f4b']];
  const tot = parts.reduce((a, x) => a + x[1], 0) || 1;
  const mName = pDate(mk + '-01').toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  return `<h1>Money</h1><div class="sub">${esc(pf.name)}</div>
  <div class="card"><div class="row sp"><h2 style="margin:0">Rent for ${mName}</h2><div class="row"><button class="btn sm sec" data-act="month" data-arg="-1">← Earlier</button><button class="btn sm sec" data-act="month" data-arg="1">Later →</button></div></div>
  <p><b>${money(got)}</b> received of ${money(expected)} expected.</p>
  <div class="tw"><table><tr><th>Tenant</th><th>Room</th><th class="n">Rent</th><th>Status</th><th></th></tr>${ts.map(t => { const u = tenantUnit(t.id); return `<tr><td>${esc(t.name)}</td><td>${esc(u.name)}</td><td class="n">${money(u.rent)}</td><td>${paid[t.id] ? `<span class="chip g">Paid ${nice(paid[t.id])}</span>` : '<span class="chip w">Not yet</span>'}</td><td><button class="btn sm ${paid[t.id] ? 'ghost' : ''}" data-act="pay" data-arg="${t.id}">${paid[t.id] ? 'Undo' : 'Mark as paid'}</button></td></tr>`; }).join('') || '<tr><td colspan="5">No tenants yet.</td></tr>'}</table></div></div>
  <div class="card"><h2>Where each month's rent goes</h2>
  <div class="bar" role="img" aria-label="Split of monthly rent">${parts.map(([l, v, c]) => `<div style="background:${c};flex:${v / tot}" title="${l}: ${money(v)}"></div>`).join('')}</div>
  <div class="legend">${parts.map(([l, v, c]) => `<span><i style="background:${c}"></i>${l}: <b>${money(v)}</b></span>`).join('')}</div>
  ${f.cash < 0 ? `<div class="note b">Right now the rent does not cover everything. You are short ${money(-f.cash)} a month.</div>` : ''}</div>
  <div class="card"><h2>The full picture</h2><div class="tw"><table><tr><th></th>${propsOf(pf.id).map(p => `<th class="n">${esc(p.name)}</th>`).join('')}<th class="n">Total</th></tr>
  ${[['Rent coming in (month)', 'rent'], ['Lost to empty rooms', 'vacancy'], ['Bills', 'opex'], ['Mortgage payment', 'pay'], ['— interest part', 'interest'], ['— paid down (yours)', 'principal'], ['Left in your pocket (month)', 'cash'], ['Left in your pocket (year)', 'cash', 12], ['Your share if sold (equity)', 'equity']].map(([l, k, m = 1]) => `<tr><td>${l}</td>${propsOf(pf.id).map(p => `<td class="n">${money(propFin(p)[k] * m)}</td>`).join('')}<td class="n"><b>${money(f[k] * m)}</b></td></tr>`).join('')}
  ${[['Return on the cash you put in', 'coc'], ['Return including loan paid down', 'roi'], ['Return on the property value (cap rate)', 'cap']].map(([l, k]) => `<tr><td>${l}</td>${propsOf(pf.id).map(p => `<td class="n">${pct(propFin(p)[k])}</td>`).join('')}<td class="n"><b>${pct(f[k])}</b></td></tr>`).join('')}
  ${pf.kind === 'managed' ? `<tr><td>My management fee (${pf.feePct}%)</td>${propsOf(pf.id).map(p => `<td class="n">${money(propFin(p).rent * pf.feePct / 100)}</td>`).join('')}<td class="n"><b>${money(f.fee)}</b></td></tr>` : ''}</table></div>
  <p class="noprint"><button class="btn sec" data-act="print">🖨️ Print or save as PDF${pf.kind === 'managed' ? ' for the owner' : ''}</button></p></div>
  <div class="card noprint"><h2>What these words mean</h2><ul class="tight">
  <li><b>Left in your pocket</b> — rent minus bills minus the mortgage payment. This is real cash.</li>
  <li><b>Return on the cash you put in</b> — yearly cash left over ÷ your down payment and renovation money. A savings account pays about 3%, so compare with that.</li>
  <li><b>Return including loan paid down</b> — the same, plus the part of the mortgage payment that reduces what you owe. This is the truest “how is my investment doing” number.</li>
  <li><b>Cap rate</b> — how the building performs ignoring the mortgage. Useful when comparing two buildings.</li>
  <li>House price growth is <b>not</b> counted in any of these. It is a bonus on top.</li></ul></div>`;
};
A.pay = tid => { const m = (S.payments[S.ui.month || monthKey()] ??= {}); if (m[tid]) delete m[tid]; else m[tid] = today(); };
A.month = d => { const x = pDate((S.ui.month || monthKey()) + '-01'); x.setMonth(x.getMonth() + Number(d)); S.ui.month = monthKey(x); };
A.print = () => { window.print(); return false; };

/* ---------------- Renovations ---------------- */
const PRESETS = [
  ['Fresh paint, better lighting, deep clean', 4500, 150, 5000], ['Furnish a room (bed, desk, wardrobe)', 1200, 100, 0], ['Add a second washroom', 18000, 300, 20000],
  ['Keypad locks on every door', 1500, 60, 0], ['New kitchen counters and appliances', 15000, 240, 15000], ['Heat pump or insulation (lower bills)', 9000, 120, 6000]];
V.reno = pf => {
  const ps = propsOf(pf.id), list = S.renos.filter(r => ps.some(p => p.id === r.prop));
  return `<h1>Renovations</h1><div class="sub">Thinking about a project? Put in the cost and the extra rent. The app tells you if it is worth it.</div>
  <div class="card"><h2>Start a new idea</h2><div class="row"><button class="btn" data-act="addReno">＋ Blank project</button>${PRESETS.map((p, i) => `<button class="btn sec sm" data-act="addReno" data-arg="${i}">${p[0]}</button>`).join('')}</div>
  <p class="small">The ready-made ideas use rough Toronto guesses. Replace them with real quotes from a contractor.</p></div>
  ${list.map(r => {
    const c = renoCalc(r), b = `renos:${r.id}`, p = byId(S.properties, r.prop), f = propFin(p);
    const newCoc = (f.cash * 12 + c.yearly - c.loanPay) / ((f.invested || 0) + (r.financed ? (r.lost || 0) : c.total) || 1);
    return `<div class="card"><div class="row sp"><h2 style="margin:0">${esc(r.name)}</h2><span class="chip ${c.verdict[0]}">${c.verdict[1]}</span></div>
    <div class="form">${field('Project name', txt(b + '.name', r.name))}${field('Which property', sel(b + '.prop', r.prop, ps.map(x => [x.id, x.name])))}${field('Cost of the work ($)', num(b + '.cost', r.cost))}${field('Extra rent or savings each month ($)', num(b + '.rentUp', r.rentUp))}${field('Rent lost while work is done ($)', num(b + '.lost', r.lost))}${field('Added to the property value ($)', num(b + '.valueUp', r.valueUp))}</div>
    <label class="row"><input type="checkbox" data-bind="${b}.financed" ${r.financed ? 'checked' : ''}> I would borrow the money for this</label>
    ${r.financed ? `<div class="form">${field('Loan interest rate (%)', num(b + '.rate', r.rate))}${field('Years to pay it back', num(b + '.years', r.years))}</div>` : ''}
    <div class="grid" style="margin-top:.8rem">
      <div class="stat"><div class="l">Total you spend</div><div class="v">${money(c.total)}</div><div class="h">work + lost rent</div></div>
      <div class="stat"><div class="l">Extra money each year</div><div class="v pos">${money(c.yearly)}</div><div class="h">${r.financed ? `loan costs ${money(c.loanPay)} a year` : 'from higher rent or lower bills'}</div></div>
      <div class="stat"><div class="l">Return each year</div><div class="v">${pct(c.roi)}</div><div class="h">pays back in ${isFinite(c.payback) ? c.payback.toFixed(1) + ' years' : '—'}</div></div>
      <div class="stat"><div class="l">After 5 years you are ahead by</div><div class="v ${c.five >= 0 ? 'pos' : 'neg'}">${money(c.five)}</div><div class="h">including added value</div></div>
    </div>
    <p>For <b>${esc(p.name)}</b>, the return on your cash would go from <b>${pct(f.coc)}</b> to about <b>${pct(newCoc)}</b>.</p>
    <button class="btn del" data-act="delReno" data-arg="${r.id}" data-confirm="1">Delete this project</button></div>`;
  }).join('')}
  <div class="note w"><b>Two Ontario rules to keep in mind</b><ul class="tight"><li>A renovation does not let you raise the rent of a tenant who already lives there beyond the yearly guideline (${GUIDELINE[2026]}% in 2026, ${GUIDELINE[2027]}% in 2027). The extra rent comes when a new tenant moves in, or through a Landlord and Tenant Board “above guideline increase” for major work.</li><li>In North York a house can have at most 6 rented rooms, so adding a 7th room is not allowed without City approval.</li></ul></div>`;
};
A.addReno = i => { const p = PRESETS[i], pr = propsOf(curPf().id)[propsOf(curPf().id).length - 1]; if (!pr) { toast('Add a property first'); return false; } S.renos.unshift({ id: uid(), prop: pr.id, name: p ? p[0] : 'New project', cost: p ? p[1] : 0, rentUp: p ? p[2] : 0, valueUp: p ? p[3] : 0, lost: 0, financed: false, rate: 7, years: 5 }); };
A.delReno = id => { S.renos = S.renos.filter(r => r.id !== id); };
