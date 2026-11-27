/* Doorstep — Find tenants, Contracts, Chores, People, Weekly check-up, Settings, tenant page */

/* ---------------- Find tenants ---------------- */
const CH = [
  ['fb', 'Facebook Marketplace', 'Free', 'https://www.facebook.com/marketplace/create/rental', 'The busiest place for rooms in Toronto. Answer messages fast — speed wins.'],
  ['kijiji', 'Kijiji', 'Free (paid boost optional)', 'https://www.kijiji.ca/p-select-category.html', 'Use the “Room Rentals & Roommates” category for rooms. Re-post weekly.'],
  ['fbg', 'Facebook housing groups', 'Free', 'https://www.facebook.com/search/groups/?q=toronto%20rooms%20for%20rent', 'Join 3–4 Toronto / North York / York University housing groups and post there.'],
  ['cl', 'Craigslist Toronto', 'Free', 'https://post.craigslist.org/c/tor', 'Smaller audience, but takes two minutes.'],
  ['zumper', 'Zumper + PadMapper', 'Free', 'https://www.zumper.com/', 'One post shows on both. Better for the whole apartment.'],
  ['liv', 'liv.rent', 'Free', 'https://liv.rent/', 'Verified renters. Better for the whole apartment.'],
  ['roomies', 'Roomies.ca', 'Free (paid upgrade optional)', 'https://www.roomies.ca/', 'Made for rooms in shared houses.'],
  ['p4s', 'Places4Students / college housing boards', 'Paid (small fee)', 'https://www.places4students.com/', 'Reaches York University and Seneca students near North York.'],
  ['rentals', 'Rentals.ca', 'Paid', 'https://rentals.ca/', 'Big audience for whole apartments. Check the current price first.'],
  ['kboost', 'Kijiji “Top Ad” boost', 'Paid (about $15–$35 a week)', 'https://www.kijiji.ca/', 'Keeps the ad at the top of the list for 7 days.'],
  ['meta', 'Instagram + Facebook paid ad', 'Paid (you choose the budget)', 'https://www.facebook.com/business/ads', 'See the cost planner below.'],
  ['agent', 'Real estate agent (MLS / Realtor.ca)', 'Paid (often one month of rent)', 'https://www.realtor.ca/', 'Only makes sense for the whole apartment.']
];
const RISKY = [
  [/\b(fe)?males?\s+only\b|\b(girls?|boys?|wom[ae]n|m[ae]n|ladies)\s+only\b/i, '“Female only / male only” — not allowed in Ontario unless the owner lives in the home and shares the kitchen or washroom.'],
  [/students?\s+only|professionals?\s+only|adults?\s+only|no\s+(kids|children|famil)/i, '“Students only”, “professionals only”, “no children” — these can be discrimination (age, family status). Describe the home instead of the person.'],
  [/citizens?\s+only|canadians?\s+only|no\s+(odsp|ow\b|welfare|social assistance)/i, 'You cannot refuse people because of citizenship or because they receive public assistance.'],
  [/(damage|security)\s+deposit/i, 'Damage or security deposits are illegal in Ontario. You may only take last month’s rent and a refundable key deposit.']
];
function makeAd(u) {
  const p = byId(S.properties, u.prop), s = S.settings;
  return { avail: today(), ch: {}, title: `${money(u.rent)} – ${u.desc ? u.desc.split(/[,.]/)[0] : u.name} in ${p.address.split(',')[0]}`,
    body: `${u.desc || u.name}.\n\nRent: ${money(u.rent)} per month. First and last month required.\nAvailable: ${nice(today())}\nArea: ${p.address}\n\n` +
      (p.floors.length ? `About the house:\n- Quiet, respectful home with ${unitsOf(p.id).length} private rooms\n- Shared kitchen and washroom, cleaned every week on a fair rotation\n- Security camera at the outside entrance\n\n` : '') +
      `To apply, please send:\n- A few words about yourself and your work or studies\n- Your move-in date and how long you plan to stay\n\nViewings by appointment. Proof of income and references are asked from every applicant.\n\nContact: ${[s.landlord, s.phone].filter(Boolean).join(' · ') || '(add your name and phone in Settings)'}` };
}
V.market = pf => {
  const empty = propsOf(pf.id).flatMap(p => unitsOf(p.id).filter(u => !u.tenant));
  const pl = (S.ui.plan ??= { daily: 8, days: 7, cpc: 1.2, rate: 6, rent: 0 });
  const rent = pl.rent || (empty[0] ? empty[0].rent : 1000), spend = pl.daily * pl.days, clicks = pl.cpc ? spend / pl.cpc : 0, inq = clicks * pl.rate / 100, perDay = rent / 30;
  const tot = {}; Object.values(S.ads).forEach(a => Object.entries(a.ch || {}).forEach(([k, c]) => { (tot[k] ??= { leads: 0, spent: 0 }); tot[k].leads += c.leads || 0; tot[k].spent += c.spent || 0; }));
  const ranked = Object.entries(tot).filter(([, v]) => v.leads || v.spent).sort((a, b) => b[1].leads - a[1].leads);
  return `<h1>Find tenants</h1><div class="sub">The app writes the ad. You post it in a few taps and record who replies, so you learn which place works best.</div>
  ${empty.length ? '' : '<div class="card"><h2>Every room is rented 🎉</h2><p>When a room becomes empty, it will show up here with a ready-made ad.</p></div>'}
  ${empty.map(u => {
    const p = byId(S.properties, u.prop), ad = S.ads[u.id], b = `ads.${u.id}`;
    if (!ad) return `<div class="card"><h2>${esc(u.name)} — ${esc(p.name)}</h2><p>Empty. Costs about <b>${money(u.rent / 30)}</b> a day.</p>${field('Describe the room in one line', txt(`units:${u.id}.desc`, u.desc, 'Furnished room, shared kitchen…'))}<p style="margin-top:.8rem"><button class="btn" data-act="makeAd" data-arg="${u.id}">✍️ Write the ad for me</button></p></div>`;
    const warn = RISKY.filter(([re]) => re.test(ad.title + ' ' + ad.body));
    return `<div class="card"><div class="row sp"><h2 style="margin:0">${esc(u.name)} — ${esc(p.name)}</h2><span class="chip b">Empty · ${money(u.rent / 30)} a day</span></div>
    <h3>1. Check the ad</h3>${field('Headline', txt(b + '.title', ad.title))}<label class="f" style="margin-top:.6rem">Ad text<textarea data-bind="${b}.body">${esc(ad.body)}</textarea></label>
    ${warn.map(w => `<div class="note b">⚠️ ${w[1]}</div>`).join('') || '<div class="note">✓ No risky wording found. Add 8 or more bright photos — ads with good photos get far more replies.</div>'}
    <div class="row"><button class="btn" data-act="copyAd" data-arg="${u.id}">📋 Copy the ad</button><button class="btn ghost" data-act="makeAd" data-arg="${u.id}" data-confirm="1">Start the ad over</button></div>
    <h3>2. Photos for the ad</h3><p class="small">Add photos here once and keep them with the room. Tap a photo to save it to this device, then upload it on each site.</p>${photoStrip(u)}
    <h3>3. Post it — free places first</h3><div class="tw"><table><tr><th>Where</th><th>Cost</th><th>Status</th><th class="n">Replies</th><th class="n">Spent ($)</th><th></th></tr>
    ${CH.map(([id, name, cost, url, tip]) => { const c = (ad.ch || {})[id] || {}, age = c.posted ? daysBetween(c.posted, today()) : null;
      return `<tr><td><b>${name}</b><div class="small">${tip}</div></td><td><span class="chip ${cost.startsWith('Free') ? 'g' : 'w'}">${cost}</span></td>
      <td>${age === null ? '<span class="chip">Not posted</span>' : age > 7 ? `<span class="chip w">Posted ${age} days ago — refresh</span>` : `<span class="chip g">Posted ${age ? age + ' days ago' : 'today'}</span>`}</td>
      <td class="n"><button class="btn sm sec" data-act="lead" data-arg="${u.id}|${id}" aria-label="Add one reply for ${name}">＋1</button> <b>${c.leads || 0}</b></td>
      <td class="n">${cost.startsWith('Paid') || c.spent ? num(`${b}.ch.${id}.spent`, c.spent, 80) : '—'}</td>
      <td><button class="btn sm" data-act="post" data-arg="${u.id}|${id}">Copy ad & open</button> <button class="btn sm ghost" data-act="posted" data-arg="${u.id}|${id}">${age === null ? 'I posted it' : 'Posted again'}</button></td></tr>`; }).join('')}</table></div>
    <h3>4. Found someone?</h3><p>Add the person under <b>Tenants & links</b>, then choose them for this room under <b>Properties</b>. The ad leaves this list.</p></div>`;
  }).join('')}
  <div class="card"><h2>Which place works best for you</h2>${ranked.length ? `<div class="tw"><table><tr><th>Place</th><th class="n">Replies</th><th class="n">Spent</th><th class="n">Cost per reply</th></tr>${ranked.map(([k, v]) => `<tr><td>${(CH.find(c => c[0] === k) || [0, k])[1]}</td><td class="n">${v.leads}</td><td class="n">${money(v.spent)}</td><td class="n">${v.leads ? money(v.spent / v.leads, 2) : '—'}</td></tr>`).join('')}</table></div>` : '<p>Press <b>＋1</b> each time someone replies to an ad. After a few weeks this table shows where your tenants really come from, so you stop wasting time and money on the others.</p>'}</div>
  <div class="card"><h2>Paid ads: what would it cost?</h2><p>For Instagram and Facebook ads. Change the numbers to try different budgets.</p>
  <div class="form">${field('Budget per day ($)', num('ui.plan.daily', pl.daily))}${field('How many days', num('ui.plan.days', pl.days))}${field('Cost per click ($) — Canada is usually $0.70–$2', num('ui.plan.cpc', pl.cpc))}${field('Clickers who message you (%)', num('ui.plan.rate', pl.rate))}${field('Rent of the empty room ($)', num('ui.plan.rent', rent))}</div>
  <div class="grid"><div class="stat"><div class="l">You spend</div><div class="v">${money(spend)}</div><div class="h">${pl.days} days</div></div><div class="stat"><div class="l">People who click</div><div class="v">${Math.round(clicks)}</div></div><div class="stat"><div class="l">People who message you</div><div class="v">${inq.toFixed(0)}</div><div class="h">about ${inq ? money(spend / inq, 2) : '—'} each</div></div><div class="stat"><div class="l">Worth it if the room fills</div><div class="v">${Math.ceil(spend / perDay)} days sooner</div><div class="h">an empty room costs ${money(perDay)} a day</div></div></div>
  <div class="note"><b>Cheapest plan that usually works</b><ol class="tight"><li><b>Days 1–7:</b> post on all the free places. Reply within the hour. Most rooms fill here for $0.</li><li><b>Day 8:</b> still empty? Refresh every ad, improve the photos, and pay for one Kijiji Top Ad.</li><li><b>Day 14:</b> still empty? Run a small Instagram + Facebook ad ($5–$10 a day for a week) or lower the rent by $25–$50. Lowering rent by $50 costs $600 a year; one empty month costs ${money(rent)}.</li></ol>
  Meta treats rental ads as a “housing” special category: you cannot target by age or gender, and the area must be at least a 25 km circle. Pick “Messages” as the goal so people write to you directly.</div></div>
  <div class="card"><h2>Choosing a tenant fairly</h2><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:240px"><b>You may ask for</b><ul class="tight"><li>Proof of income (pay stubs, job letter)</li><li>A credit check, with their written consent</li><li>References from past landlords</li><li>ID to confirm who they are</li><li>Move-in date and how many people will live there</li></ul></div><div style="flex:1;min-width:240px"><b>Do not ask about</b><ul class="tight"><li>Religion, race, country of origin, citizenship</li><li>Age, marriage, children, pregnancy</li><li>Disability or health</li><li>Whether they receive public assistance</li></ul></div></div><p class="small">Use the same questions for every applicant and keep short notes on why you chose someone. That is your protection if anyone complains.</p></div>`;
};
A.makeAd = uid_ => { S.ads[uid_] = makeAd(byId(S.units, uid_)); };
const chOf = arg => { const [u, c] = arg.split('|'); return ((S.ads[u].ch ??= {})[c] ??= {}); };
A.copyAd = u => { copy(S.ads[u].title + '\n\n' + S.ads[u].body); toast('Ad copied. Paste it into the site.'); return false; };
A.post = arg => { const [u, c] = arg.split('|'); A.copyAd(u); window.open(CH.find(x => x[0] === c)[3], '_blank', 'noopener'); return false; };
A.posted = arg => { chOf(arg).posted = today(); };
A.lead = arg => { const c = chOf(arg); c.leads = (c.leads || 0) + 1; };

/* ---------------- Contracts & rules ---------------- */
const DOCK = { lease: 'Lease details sheet', rules: 'House rules and cleaning agreement', camera: 'Outdoor camera notice', welcome: 'Welcome letter', custom: 'My own contract' };
function docTpl(kind, t) {
  const u = tenantUnit(t.id), p = byId(S.properties, u.prop), s = S.settings, fl = byId(p.floors, u.floor), LL = s.landlord || '[LANDLORD NAME]';
  const sign = `\n\nLandlord: ${LL}\nTenant: ${t.name}\nDate: ${nice(today())}\n\nTenant signature: ______________________`;
  const fill = x => x.replace(/\[TENANT\]/g, t.name).replace(/\[ROOM\]/g, u.name).replace(/\[ADDRESS\]/g, p.address).replace(/\[RENT\]/g, money(u.rent)).replace(/\[LANDLORD\]/g, LL).replace(/\[DATE\]/g, nice(today()));
  const B = {
    lease: `LEASE DETAILS — to copy into the Ontario Standard Lease (Form 2229E)\n\nOntario law requires the government's Standard Lease form for this tenancy. Use these details to fill it in, then attach the house rules and camera notice as "Additional Terms" (Section 15).\n\nLandlord: ${LL}\nTenant: ${t.name}\nRental unit: ${u.name}, ${p.address}\nStart date: ${nice(t.leaseStart)}\nRent: ${money(u.rent)} per month, due on the 1st\nLast month's rent deposit: ${money(t.deposit || u.rent)} (interest is paid on this every year)\nKey deposit: refundable, no more than the cost of replacing the key\nIncluded: heat, hydro, water, internet, use of shared kitchen and washroom\nSmoking: not allowed inside the home\nTenant insurance: required` + sign,
    rules: `HOUSE RULES AND CLEANING AGREEMENT\n${p.address} — ${u.name}\n\nThese rules are Additional Terms to the lease. They do not take away any right under the Residential Tenancies Act.\n\n1. CLEANING ROTATION\nEach week, one tenant on ${fl ? 'the ' + fl.name.toLowerCase() : 'each floor'} cleans all shared areas of that floor. Turns rotate so everyone does the same amount. The week runs Monday to Sunday and cleaning must be finished by Sunday 8 pm. The current schedule is always on your private tenant page.\n\nWhat the weekly clean includes:\n${(fl ? fl.tasks : '').split('\n').filter(Boolean).map(x => '  - ' + x).join('\n')}\n\n2. GARBAGE\nOne tenant each week takes the bins to the curb the evening before pickup (${DAYS[p.wasteDay ?? 2]}) and brings them back the same day. Green bin goes out every week. Garbage and recycling alternate.\n\n3. EVERY DAY\n  - Wash your own dishes the same day\n  - Wipe the stove and counter after cooking\n  - Leave the washroom dry and clear of your things\n  - Quiet hours 10 pm to 7 am\n  - No smoking or vaping inside\n  - Overnight guests: tell your housemates; no more than a few nights a month\n\n4. SWAPPING A TURN\nYou may swap with another tenant if you both agree and tell the landlord.\n\n5. IF A TURN IS MISSED\nThe landlord will remind the tenant once. If shared areas are still left unclean, the landlord may hire a cleaner and will discuss the cost with the tenant responsible.` + sign,
    camera: `NOTICE AND ACKNOWLEDGEMENT — OUTDOOR SECURITY CAMERA\n${p.address}\n\n1. There is a security camera on the OUTSIDE of the building. It covers the entrance, driveway and yard only.\n2. There are NO cameras inside the home, in any bedroom, washroom, kitchen or hallway.\n3. The camera does not point into any window or private room.\n4. Purpose: safety of tenants and the property (break-ins, package theft, damage). It is not used to watch tenants' daily comings and goings.\n5. Sound recording is turned off.\n6. Recordings are kept for no more than 30 days and then erased, unless needed for a police report, insurance claim or legal matter.\n7. Only the landlord can see recordings. They are shared only with police, insurers or a tribunal when required.\n8. A tenant may ask to see footage of themselves by writing to the landlord.\n\nBy signing, the tenant confirms they have been told about the outdoor camera and understand how it is used. This is a notice, not a waiver: it does not remove any privacy right the tenant has under Ontario law.` + sign,
    welcome: `Welcome, ${t.name}!\n\nHere is what you need for ${u.name} at ${p.address}.\n\nRent: ${money(u.rent)} on the 1st of each month.\nGarbage day: ${DAYS[p.wasteDay ?? 2]}.\nCleaning: one person cleans the shared areas each week, in turns. Your turns are on your private tenant page.\nRepairs or problems: contact ${LL}${s.phone ? ' at ' + s.phone : ''}${s.email ? ' or ' + s.email : ''}. For emergencies (no heat, water leak, fire), call right away.\n\nThank you for helping keep this a clean, quiet and friendly home.\n\n${LL}`,
    custom: fill(s.customTpl || 'Paste your own contract under “My own contract wording” below, then make this document again.')
  };
  return { id: uid(), tenant: t.id, kind, title: DOCK[kind], body: B[kind], status: 'draft' };
}
const STAT = { draft: ['', 'Draft — only you can see it'], approved: ['i', 'Approved — ready to send'], sent: ['w', 'Sent — waiting for signature'], signed: ['g', 'Signed'] };
V.contracts = pf => {
  const ts = pfTenants(pf.id); if (!ts.some(t => t.id === S.ui.tenant)) S.ui.tenant = ts[0] ? ts[0].id : '';
  const t = byId(S.tenants, S.ui.tenant), docs = t ? S.docs.filter(d => d.tenant === t.id) : [];
  const CK = [['licence', 'Toronto multi-tenant house licence (needed for 4 or more rented rooms; North York allows up to 6)'], ['fire', 'Fire safety plan, working smoke and CO alarms on every floor, clear exits'], ['insure', 'Landlord insurance that knows rooms are rented separately'], ['lease', 'Every tenant has the Ontario Standard Lease (Form 2229E)'], ['info', 'Every tenant got the LTB “Information for New Tenants” page'], ['deposit', 'Only last month’s rent + refundable key deposit taken (no damage deposit)'], ['tinsure', 'Tenants asked to carry tenant insurance']];
  return `<h1>Contracts & rules</h1><div class="sub">Make a document, read it, approve it, send it. Nothing reaches a tenant until you approve it.</div>
  <div class="card"><h2>Documents for one tenant</h2>${ts.length ? `<div class="row">${field('Tenant', sel('ui.tenant', S.ui.tenant, ts.map(x => [x.id, x.name + ' — ' + tenantUnit(x.id).name])))}</div>
  <p style="margin-top:.8rem">Make a new one:</p><div class="row">${Object.entries(DOCK).map(([k, l]) => `<button class="btn sec sm" data-act="newDoc" data-arg="${k}">＋ ${l}</button>`).join('')}</div>` : '<p>Add tenants first under Tenants & links.</p>'}
  ${docs.map(d => `<div style="border-top:1px solid var(--line);margin-top:1rem;padding-top:1rem"><div class="row sp">${d.status === 'draft' ? txt(`docs:${d.id}.title`, d.title) : `<b>${esc(d.title)}</b>`}<span class="chip ${STAT[d.status][0]}">${STAT[d.status][1]}</span></div>
    ${d.status === 'draft' ? `<textarea style="min-height:14rem;margin-top:.5rem" data-bind="docs:${d.id}.body" aria-label="Document text">${esc(d.body)}</textarea>` : `<div class="doc" style="margin-top:.5rem">${esc(d.body)}</div>`}
    <div class="row" style="margin-top:.6rem">${d.status === 'draft' ? `<button class="btn" data-act="docStatus" data-arg="${d.id}|approved">✓ I approve this</button>` : ''}${d.status === 'approved' ? `<button class="btn" data-act="sendDoc" data-arg="${d.id}">✉️ Send to ${esc(t.name)}</button>` : ''}${d.status === 'sent' ? `<button class="btn" data-act="docStatus" data-arg="${d.id}|signed">Tenant has signed</button><button class="btn sec" data-act="sendDoc" data-arg="${d.id}">Send again</button>` : ''}${d.status !== 'draft' ? `<button class="btn ghost" data-act="docStatus" data-arg="${d.id}|draft">Edit again</button>` : ''}<button class="btn ghost" data-act="printDoc" data-arg="${d.id}">🖨️ Print / PDF</button><button class="btn del" data-act="delDoc" data-arg="${d.id}" data-confirm="1">Delete</button></div></div>`).join('')}</div>
  <div class="card"><h2>Do it for everyone at once</h2><p>Makes a draft for every tenant who does not have one yet. You still approve each one.</p><div class="row"><button class="btn sec" data-act="bulkDoc" data-arg="camera">Camera notice for all</button><button class="btn sec" data-act="bulkDoc" data-arg="rules">House rules for all</button><button class="btn sec" data-act="bulkApprove">Approve all drafts</button></div></div>
  <div class="card"><h2>My own contract wording</h2><p class="small">Paste your contract here. Write [TENANT], [ROOM], [ADDRESS], [RENT], [LANDLORD] and [DATE] where those should appear, and the app fills them in for each person.</p><textarea data-bind="settings.customTpl" aria-label="My own contract wording">${esc(S.settings.customTpl || '')}</textarea></div>
  ${propsOf(pf.id).map(p => `<div class="card"><h2>Safety checklist — ${esc(p.name)}</h2>${CK.filter(c => c[0] !== 'licence' || unitsOf(p.id).length >= 4).map(([k, l]) => `<label class="todo"><input type="checkbox" data-bind="properties:${p.id}.compliance.${k}" ${(p.compliance || {})[k] ? 'checked' : ''}><span class="t">${l}</span></label>`).join('')}</div>`).join('')}
  <div class="card"><h2>Rent increases</h2><div class="tw"><table><tr><th>Tenant</th><th class="n">Rent</th><th>Earliest new rent date</th><th class="n">Most you can add</th><th>Give Form N1 by</th></tr>${ts.map(x => { const i = increaseInfo(x); return i ? `<tr><td>${esc(x.name)}</td><td class="n">${money(tenantUnit(x.id).rent)}</td><td>${nice(i.next)}</td><td class="n">${money(i.up, 2)} (${i.g}%)</td><td>${nice(i.noticeBy)} ${i.daysToNotice <= 30 ? '<span class="chip w">soon</span>' : ''}</td></tr>` : ''; }).join('')}</table></div><p class="small">Rent can go up once every 12 months, with 90 days’ written notice on Form N1. Homes first lived in after 15 Nov 2018 are not limited by the guideline.</p></div>
  <div class="card"><h2>Landlord and Tenant Board (LTB) — quick guide</h2><div class="tw"><table><tr><th>Situation</th><th>Form</th><th>Notice</th></tr>
  ${[['Raise the rent', 'N1', '90 days'], ['Tenant has not paid rent', 'N4, then L1 to apply', '14 days to pay'], ['Tenant disturbs others or causes damage', 'N5, then L2', '20 days (7 to fix it)'], ['Tenant is always late with rent', 'N8, then L2', '60 days'], ['You or close family will move in', 'N12, then L2', '60 days + one month’s rent paid to tenant'], ['Tenant wants to leave', 'N9 (tenant gives it)', '60 days'], ['You both agree to end it', 'N11', 'any date you agree'], ['Enter the room for repairs or viewing', 'Written note', '24 hours, between 8 am and 8 pm']].map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>
  <p><a href="https://tribunalsontario.ca/ltb/forms/" target="_blank" rel="noopener">All LTB forms</a> · <a href="https://www.ontario.ca/page/guide-ontarios-standard-lease" target="_blank" rel="noopener">Standard Lease guide</a> · <a href="https://www.toronto.ca/community-people/housing-shelter/rental-housing-rights-information/multi-tenant-rooming-houses/multi-tenant-house-owners-operators/" target="_blank" rel="noopener">Toronto multi-tenant house licence</a></p>
  <p class="small">You can never change the locks, remove belongings or cut services yourself. Only the LTB can end a tenancy. This page is a plain-language guide, not legal advice — for a dispute, speak to a licensed paralegal.</p></div>`;
};
A.newDoc = k => { S.docs.unshift(docTpl(k, byId(S.tenants, S.ui.tenant))); };
A.bulkDoc = k => { let n = 0; pfTenants(curPf().id).forEach(t => { if (!S.docs.some(d => d.tenant === t.id && d.kind === k)) { S.docs.unshift(docTpl(k, t)); n++; } }); toast(n ? `${n} draft${n > 1 ? 's' : ''} made` : 'Everyone already has one'); };
A.bulkApprove = () => { const ids = pfTenants(curPf().id).map(t => t.id); let n = 0; S.docs.forEach(d => { if (d.status === 'draft' && ids.includes(d.tenant)) { d.status = 'approved'; n++; } }); toast(`${n} approved`); };
A.docStatus = arg => { const [id, st] = arg.split('|'); byId(S.docs, id).status = st; byId(S.docs, id)[st + 'At'] = today(); };
A.delDoc = id => { S.docs = S.docs.filter(d => d.id !== id); };
A.printDoc = id => { const d = byId(S.docs, id), w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return false; } w.document.write(`<title>${esc(d.title)}</title><pre style="white-space:pre-wrap;font:15px/1.5 Georgia,serif;max-width:720px;margin:40px auto">${esc(d.body)}</pre>`); w.document.close(); w.print(); return false; };
A.sendDoc = async id => {
  const d = byId(S.docs, id), t = byId(S.tenants, d.tenant);
  if (!t.email) { toast(`Add an email for ${t.name} under Tenants & links first`); return; }
  d.status = 'sent'; d.sentAt = today();
  let body = `Hello ${t.name},\n\nPlease read "${d.title}". `;
  if (isHosted()) { const link = await tenantLink(t); await copy(link); body += `Open your private page to read and sign it:\n${link.length < 1500 ? link : '(the link is copied — paste it here)'}\n`; }
  else body += `Reply to this email with "I agree" and your full name to sign.\n\n-----\n${d.body.slice(0, 1400)}${d.body.length > 1400 ? '\n… (full copy attached)' : ''}\n-----\n`;
  body += `\nThank you,\n${S.settings.landlord || ''}`;
  location.href = `mailto:${encodeURIComponent(t.email)}?subject=${encodeURIComponent(d.title)}&body=${encodeURIComponent(body)}`;
  toast('Your email opened with the message ready. Press Send there.');
};

/* ---------------- Cleaning & garbage ---------------- */
V.chores = pf => {
  const ps = propsOf(pf.id).filter(p => p.floors.length);
  return `<h1>Cleaning & garbage</h1><div class="sub">One person cleans their whole floor each week, in turns. Garbage duty rotates through the whole house, and never lands on the same person’s cleaning week.</div>
  ${ps.length ? '' : '<div class="card"><p>This is for shared houses. Add floors to a property (under Properties) to get a schedule.</p></div>'}
  ${ps.map(p => { const rows = schedule(p, 8), b = `properties:${p.id}`;
    return `<div class="card"><div class="row sp"><h2 style="margin:0">${esc(p.name)}</h2><div class="row noprint"><button class="btn sec sm" data-act="copyWeek" data-arg="${p.id}">📋 Copy this week’s reminder</button><button class="btn sec sm" data-act="print">🖨️ Print</button></div></div>
    <div class="week small"><b>Week of</b><b>Garbage to the curb</b><b>Cleaning</b></div>
    ${rows.map((r, i) => `<div class="week ${i ? '' : 'now'}"><div><b>${nice(r.mon).replace(/, \d{4}/, '')}</b>${i ? '' : ' <span class="chip i">this week</span>'}</div>
      <div>${r.garbage ? esc(r.garbage.name) : '—'}<div class="small">${r.waste} + green bin · out by ${DAYS[mod((p.wasteDay ?? 2) - 1, 7)]} night</div></div>
      <div>${r.clean.map(c => { const k = `${p.id}|${c.f.id}|${r.mon}`; return `<label class="row" style="gap:.4rem">${i < 2 ? `<input type="checkbox" data-act="choreDone" data-arg="${k}" ${S.chores[k] ? 'checked' : ''} aria-label="Done">` : ''}<span><b>${esc(c.f.name)}:</b> ${c.t ? esc(c.t.name) : '<i>nobody yet</i>'}</span></label>`; }).join('')}</div></div>`).join('')}
    <div class="noprint"><h3>Garbage settings</h3><div class="form">${field('Pickup day', sel(b + '.wasteDay', p.wasteDay ?? 2, DAYS.map((d, i) => [i, d]), 'num'))}<div class="f">This week the truck takes<div class="row"><b style="color:var(--ink)">${rows[0].waste}</b><button class="btn sm sec" data-act="flipWaste" data-arg="${p.id}">No, it is ${rows[0].waste === 'Garbage' ? 'recycling' : 'garbage'} week</button></div></div></div>
    <p class="small">Check your street’s day on the City of Toronto <a href="https://www.toronto.ca/services-payments/recycling-organics-garbage/houses/collection-schedule/" target="_blank" rel="noopener">collection schedule</a>. Bins must be at the curb before 7 am on pickup day.</p>
    <h3>What “cleaning the floor” means</h3>${p.floors.map(f => `<div class="form">${field('Floor name', txt(`${b}.floors:${f.id}.name`, f.name))}<label class="f" style="grid-column:1/-1">Tasks — one per line<textarea data-bind="${b}.floors:${f.id}.tasks">${esc(f.tasks)}</textarea></label></div>`).join('')}</div></div>`; }).join('')}
  <div class="card noprint"><h2>What makes a cleaning rota actually work</h2><ul class="tight"><li><b>One clear owner each week.</b> “Everyone cleans a bit” fails; one named person does not.</li><li><b>A written checklist.</b> People disagree about what “clean” means. The task list ends the argument.</li><li><b>A fixed deadline</b> (Sunday 8 pm) and a tick-box, so a missed week is obvious early.</li><li><b>Supplies provided by you.</b> Spray, cloths, vacuum and bags cost about $15 a month and remove the most common excuse.</li><li><b>Swaps allowed</b> when both people agree.</li><li><b>A paid deep clean every 3 months</b> keeps standards from sliding.</li></ul></div>`;
};
A.choreDone = k => { if (S.chores[k]) delete S.chores[k]; else S.chores[k] = today(); };
A.copyWeek = pid => { const p = byId(S.properties, pid), r = schedule(p, 1)[0];
  copy(`🏠 ${p.name} — week of ${nice(r.mon)}\n\n🗑️ ${r.waste} + green bin: ${r.garbage ? r.garbage.name : '—'} (to the curb ${DAYS[mod((p.wasteDay ?? 2) - 1, 7)]} night)\n${r.clean.map(c => `🧹 ${c.f.name} cleaning: ${c.t ? c.t.name : '—'} (done by Sunday 8 pm)`).join('\n')}\n\nThank you!`);
  toast('Copied. Paste it into your house group chat.'); return false; };

/* ---------------- Tenants & links ---------------- */
V.people = pf => {
  const ts = S.tenants.filter(t => { const u = tenantUnit(t.id); return !u || byId(S.properties, u.prop).pf === pf.id; });
  return `<h1>Tenants & links</h1><div class="sub">Each tenant gets a private page with only their own documents and their own floor’s schedule. They cannot see anyone else’s contract or any of your money.</div>
  ${isHosted() ? '' : `<div class="note w"><b>One step left before links work for tenants:</b> right now the app lives only on this computer, so a link would only open here. Once the app is put online (free), “Copy private link” gives a link you can send by text or email. Until then, use <b>Preview</b> to see their page and <b>Print / PDF</b> for documents.</div>`}
  ${ts.map(t => { const u = tenantUnit(t.id), b = `tenants:${t.id}`;
    return `<div class="card"><div class="row sp"><h2 style="margin:0">${esc(t.name)}</h2>${u ? `<span class="chip i">${esc(u.name)} · ${money(u.rent)}</span>` : '<span class="chip w">No room yet — choose one under Properties</span>'}</div>
    <div class="form">${field('Full name', txt(b + '.name', t.name))}${field('Email', txt(b + '.email', t.email, 'name@example.com', 'email'))}${field('Phone', txt(b + '.phone', t.phone, '', 'tel'))}${field('Moved in', txt(b + '.leaseStart', t.leaseStart, '', 'date'))}${field('Last rent increase', txt(b + '.lastIncrease', t.lastIncrease, '', 'date'))}${field('Last month’s rent held ($)', num(b + '.deposit', t.deposit))}</div>
    <div class="row">${u ? `<button class="btn" data-act="tLink" data-arg="${t.id}">🔗 Copy private link</button><button class="btn sec" data-act="tPreview" data-arg="${t.id}">Preview their page</button>` : ''}<button class="btn del" data-act="delTenant" data-arg="${t.id}" data-confirm="1">Remove tenant</button></div>
    ${t.deposit ? `<p class="small">Deposit interest owed this year: ${money(t.deposit * (GUIDELINE[new Date().getFullYear()] ?? 1.9) / 100, 2)} (same % as the rent guideline).</p>` : ''}</div>`; }).join('')}
  <button class="btn" data-act="addTenant">＋ Add a tenant</button>
  <div class="card" style="margin-top:1rem"><h2>Who can see what</h2><div class="tw"><table><tr><th></th><th>You (admin)</th><th>A tenant with their link</th></tr>${[['Rent, mortgage, bills, returns', '✓', '✗'], ['Their own contract and notices', '✓', '✓'], ['Other tenants’ contracts', '✓', '✗'], ['Cleaning and garbage turns for their floor', '✓', '✓ (with housemates’ names)'], ['Change anything', '✓', '✗']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div><p class="small">A tenant link carries only that tenant’s information inside it. If you change a document or the schedule, send them a fresh link.</p></div>`;
};
A.addTenant = () => { S.tenants.push({ id: uid(), name: 'New tenant', email: '', phone: '', leaseStart: today(), deposit: 0, lastIncrease: '' }); };
A.delTenant = id => { S.units.forEach(u => { if (u.tenant === id) u.tenant = ''; }); S.tenants = S.tenants.filter(t => t.id !== id); S.docs = S.docs.filter(d => d.tenant !== id); };
A.tLink = async id => { await copy(await tenantLink(byId(S.tenants, id))); toast(isHosted() ? 'Private link copied. Paste it in a text or email.' : 'Copied — but it only opens on this computer until the app is online.'); };
A.tPreview = async id => { const w = window.open('', '_blank'), l = await tenantLink(byId(S.tenants, id)); if (w) w.location.href = l; else location.href = l; };

/* ---------------- Weekly check-up ---------------- */
function habitTips() {
  const u = S.usage, tips = [], last14 = Object.keys(u.days).filter(d => daysBetween(d, today()) < 14).length;
  const HINT = { money: 'mark rent as paid so late payers stand out', market: 'get a ready-made ad for an empty room', reno: 'test a renovation idea before spending', chores: 'see whose turn it is this week', contracts: 'send the camera notice and house rules', people: 'save tenant emails and private links' };
  Object.entries(HINT).forEach(([k, h]) => { const v = u.views[k]; if (!v) tips.push(`You have not opened <b>${NAV.find(n => n[0] === k)[2]}</b> yet. It lets you ${h}.`); else if (daysBetween(v.last, today()) > 21) tips.push(`It has been ${daysBetween(v.last, today())} days since you opened <b>${NAV.find(n => n[0] === k)[2]}</b>.`); });
  const ads = Object.values(S.ads), posted = ads.some(a => Object.values(a.ch || {}).some(c => c.posted)), leads = ads.some(a => Object.values(a.ch || {}).some(c => c.leads));
  if (posted && !leads) tips.push('You posted ads but recorded no replies. Press ＋1 for each reply so the app can tell you which site is worth your time.');
  const mk = monthKey(), paid = Object.values(S.payments[mk] || {}), late = paid.filter(d => Number(d.slice(8)) > 5).length;
  if (late >= 2) tips.push(`${late} rents were marked paid after the 5th this month. Ask tenants to set up automatic e-transfer for the 1st.`);
  return { tips, last14 };
}
function runQC(auto) {
  const fs = S.portfolios.flatMap(findings), score = qcScore(findings(curPf()));
  S.qc.last = today(); S.qc.reports.unshift({ date: today(), score, n: fs.length, auto: !!auto }); S.qc.reports = S.qc.reports.slice(0, 26);
}
V.qc = pf => {
  const fs = findings(pf), score = qcScore(fs), h = habitTips(), prev = S.qc.reports[1];
  const grp = [['high', 'Do these first'], ['med', 'Do these soon'], ['low', 'When you have time']];
  return `<h1>Weekly check-up</h1><div class="sub">Once a week the app checks everything for you: money, empty rooms, paperwork, and how you use the app.</div>
  <div class="card"><div class="row sp"><div><div class="l small">Health score for ${esc(pf.name)}</div><div class="big ${score >= 80 ? 'pos' : score < 50 ? 'neg' : ''}">${score}<span style="font-size:1.2rem;color:var(--mute)"> / 100</span></div><div class="small">Last check: ${nice(S.qc.last)}${prev ? ` · before that: ${prev.score}` : ''} · next automatic check: ${nice(iso(new Date(pDate(S.qc.last || today()).getTime() + 7 * 864e5)))}</div></div><button class="btn" data-act="runQC">Check again now</button></div></div>
  ${grp.map(([s, l]) => { const x = fs.filter(f => f.sev === s); return x.length ? `<div class="card"><h2>${l} (${x.length})</h2>${x.map(todoRow).join('')}</div>` : ''; }).join('') || '<div class="card"><p>Nothing to fix. Well done. 🌿</p></div>'}
  <div class="card"><h2>Your habits</h2><p>You opened the app on <b>${h.last14}</b> of the last 14 days.${h.last14 < 2 ? ' A quick look twice a week is enough to catch late rent and stale ads.' : ''}</p>
  ${h.tips.length ? `<ul class="tight">${h.tips.map(t => `<li>${t}</li>`).join('')}</ul>` : '<p>You are using every part of the app. Nothing to suggest.</p>'}
  <p class="small">The Home page shortcuts re-order themselves to match the screens you open most.</p></div>
  ${S.qc.reports.length > 1 ? `<div class="card"><h2>Past check-ups</h2><div class="tw"><table><tr><th>Date</th><th class="n">Score</th><th class="n">Items found</th></tr>${S.qc.reports.slice(0, 10).map(r => `<tr><td>${nice(r.date)}${r.auto ? '' : ' (manual)'}</td><td class="n">${r.score}</td><td class="n">${r.n}</td></tr>`).join('')}</table></div></div>` : ''}`;
};
A.runQC = () => { runQC(false); toast('Check-up done'); };

/* ---------------- Room photos (kept on this device, shrunk to save space) ---------------- */
let PH = {};
try { PH = JSON.parse(localStorage.getItem('doorstep.photos')) || {}; } catch (e) { }
function savePhotos() { try { localStorage.setItem('doorstep.photos', JSON.stringify(PH)); return true; } catch (e) { return false; } }
function photoStrip(u) {
  const l = PH[u.id] || [];
  return `<div class="ph">${l.map((d, i) => `<figure><a href="${d}" download="${esc(u.name.replace(/\W+/g, '-'))}-${i + 1}.jpg" title="Tap to save this photo"><img src="${d}" alt="${esc(u.name)} photo ${i + 1}"></a><button class="x" data-act="delPhoto" data-arg="${u.id}|${i}" aria-label="Remove photo ${i + 1} of ${esc(u.name)}">✕</button></figure>`).join('')}<label class="btn sec sm" style="cursor:pointer">📷 Add photos<input type="file" accept="image/*" multiple hidden data-photo="${u.id}"></label>${l.length ? '' : '<span class="small">No photos yet</span>'}</div>`;
}
function shrink(file) {
  return new Promise((res, rej) => { const img = new Image();
    img.onload = () => { const k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.62)); };
    img.onerror = rej; img.src = URL.createObjectURL(file); });
}
document.addEventListener('change', async e => {
  const el = e.target; if (!el.dataset || !el.dataset.photo) return;
  const l = (PH[el.dataset.photo] ??= []); let skipped = 0, full = false;
  for (const f of el.files) {
    if (l.length >= 10) { skipped++; continue; }
    try { l.push(await shrink(f)); if (!savePhotos()) { l.pop(); savePhotos(); full = true; break; } } catch (x) { skipped++; }
  }
  render();
  toast(full ? 'This device has no more space for photos. Remove a few first.' : skipped ? `${skipped} could not be added (10 photos per room at most)` : 'Photos added');
});
A.delPhoto = arg => { const [u, i] = arg.split('|'); PH[u].splice(Number(i), 1); savePhotos(); };

/* ---------------- Settings ---------------- */
V.settings = () => `<h1>Settings</h1><div class="sub">Your details appear on ads and documents.</div>
  <div class="card"><h2>About you</h2><div class="form">${field('Your name', txt('settings.landlord', S.settings.landlord))}${field('Email', txt('settings.email', S.settings.email, '', 'email'))}${field('Phone', txt('settings.phone', S.settings.phone, '', 'tel'))}${field('PIN to open the app (optional)', txt('settings.pin', S.settings.pin, 'e.g. 4 digits', 'password'))}</div><p class="small">The PIN keeps family or visitors from opening the app on this computer. Leave it empty for no PIN.</p></div>
  <div class="card"><h2>Backup</h2><p>Everything is saved in this browser on this computer. Save a backup file every week so nothing is lost if the computer breaks.</p><p class="small">Last backup: ${nice(S.settings.lastBackup)}</p>
  <div class="row"><button class="btn" data-act="backup">⬇️ Save a backup file</button><label class="btn sec" style="cursor:pointer">⬆️ Open a backup file<input type="file" id="restore" accept=".json" hidden></label></div></div>
  <div class="card"><h2>Use it on another device</h2><p>Sends a copy of everything to your own email as a link. Open that email on the new phone or computer, tap the link, and all your numbers appear there.</p>
  <div class="row"><button class="btn" data-act="emailCopy">✉️ Send a copy to my email</button></div><p class="small">The link contains all your information, so only send it to yourself. Each device keeps its own copy: after changing things on one device, send a fresh copy to the other. Room photos are too big for the link — use the backup file to move those.</p></div>
  <div class="card"><h2>Start over</h2><p>Erases everything in the app on this computer and brings back the example numbers.</p><button class="btn del" data-act="reset" data-confirm="1">Erase everything</button></div>`;
A.backup = () => { S.settings.lastBackup = today(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...S, photos: PH }, null, 1)], { type: 'application/json' })); a.download = `doorstep-backup-${today()}.json`; a.click(); toast('Backup saved to your Downloads folder'); };
A.reset = () => { S = seed(); PH = {}; savePhotos(); };
let PEND = null;
A.emailCopy = async () => {
  if (!isHosted()) { toast('This works from the web address, not from the file'); return; }
  if (!S.settings.email) { toast('Type your email under “About you” first'); return; }
  S.settings.lastBackup = today(); save();
  const link = location.href.split('#')[0] + '#r=' + await pack(S);
  await copy(link);
  const short = link.length < 1800;
  location.href = `mailto:${encodeURIComponent(S.settings.email)}?subject=${encodeURIComponent('My Doorstep copy — ' + nice(today()))}&body=${encodeURIComponent('Open this link on the new device to load everything:\n\n' + (short ? link : '(paste the link here — it is already copied)') + '\n')}`;
  toast(short ? 'Your email opened. Press Send.' : 'Your email opened. Paste the copied link into it, then press Send.');
};
A.restoreYes = () => { S = PEND; PEND = null; unlocked = false; history.replaceState(null, '', location.pathname); toast('Your copy is now on this device'); };
A.restoreNo = () => { PEND = null; history.replaceState(null, '', location.pathname); load(); };
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'restore' && el.files[0]) el.files[0].text().then(tx => { try { const d = JSON.parse(tx); if (!d.v || !d.properties) throw 0; PH = d.photos || {}; delete d.photos; savePhotos(); S = d; save(); render(); toast('Backup opened'); } catch (x) { toast('That file is not a Doorstep backup'); } });
});
A.flipWaste = pid => { const p = byId(S.properties, pid); p.wasteFlip = !p.wasteFlip; };

/* ---------------- The tenant's private page ---------------- */
let TP = null;
function renderTenant() {
  const d = TP, me = x => x === d.n ? `<span class="me">${esc(x)} (you)</span>` : esc(x), signed = JSON.parse(localStorage.getItem('doorstep.signed') || '{}');
  document.title = 'Your home — ' + d.u;
  $('#app').innerHTML = `<main style="margin:0 auto;max-width:760px"><h1>Hello, ${esc(d.n.split(' ')[0])} 👋</h1><div class="sub">${esc(d.u)} · ${esc(d.a)} · this page is private to you</div>
  ${d.sch.length ? `<div class="card"><h2>This week</h2><p>🧹 Cleaning (${esc(d.fl)}): ${me(d.sch[0].c)}<br>🗑️ ${d.sch[0].w} + green bin to the curb (night before ${d.day}): ${me(d.sch[0].g)}</p></div>` : ''}
  <div class="card"><h2>Your documents</h2>${d.docs.length ? d.docs.map((x, i) => `<h3>${esc(x.t)} ${x.s === 'signed' || signed[x.t] ? '<span class="chip g">Signed</span>' : '<span class="chip w">Please read and sign</span>'}</h3><div class="doc">${esc(x.b)}</div>${x.s === 'signed' ? '' : `<p><button class="btn" data-act="tSign" data-arg="${i}">✍️ I have read this and I agree</button></p>`}`).join('') : '<p>No documents yet.</p>'}</div>
  ${d.sch.length ? `<div class="card"><h2>Your cleaning and garbage turns</h2><div class="week small"><b>Week of</b><b>Garbage to the curb</b><b>Cleans ${esc(d.fl)}</b></div>${d.sch.map((r, i) => `<div class="week ${i ? '' : 'now'}"><b>${nice(r.m).replace(/, \d{4}/, '')}</b><div>${me(r.g)}<div class="small">${r.w} + green bin</div></div><div>${me(r.c)}</div></div>`).join('')}
  <h3>What the weekly clean includes</h3><ul class="tight">${d.tasks.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small">Finish by Sunday 8 pm. Need to swap a week? Agree with a housemate and tell the landlord.</p></div>` : ''}
  <div class="card"><h2>Need something?</h2><p>${esc(d.ll || 'Your landlord')}${d.lp ? ` · <a href="tel:${esc(d.lp)}">${esc(d.lp)}</a>` : ''}${d.le ? ` · <a href="mailto:${esc(d.le)}">${esc(d.le)}</a>` : ''}</p><p class="small">Page prepared ${nice(d.made)}.</p></div></main>`;
}
A.tSign = i => { const x = TP.docs[i], s = JSON.parse(localStorage.getItem('doorstep.signed') || '{}'); s[x.t] = today(); localStorage.setItem('doorstep.signed', JSON.stringify(s));
  const body = `I, ${TP.n}, have read and agree to "${x.t}" for ${TP.u}, ${TP.a}.\n\nDate: ${nice(today())}\nFull name: ${TP.n}`;
  if (TP.le) location.href = `mailto:${encodeURIComponent(TP.le)}?subject=${encodeURIComponent('Signed: ' + x.t)}&body=${encodeURIComponent(body)}`; else { copy(body); toast('Confirmation copied. Send it to your landlord.'); }
  renderTenant(); return false; };

/* ---------------- start ---------------- */
async function boot() {
  const m = location.hash.match(/^#t=(.+)/);
  if (m) { try { TP = await unpack(m[1]); renderTenant(); } catch (e) { $('#app').innerHTML = '<main><div class="card lock"><h2>This link is not complete</h2><p>Please ask your landlord to send it again.</p></div></main>'; } return; }
  const r = location.hash.match(/^#r=(.+)/);
  if (r) {
    try { PEND = await unpack(r[1]); if (!PEND.v || !PEND.properties) throw 0;
      $('#app').innerHTML = `<main><div class="card lock"><h1>🏠 Doorstep</h1><p>Open your saved copy from <b>${nice(PEND.settings.lastBackup)}</b> on this device?</p><p class="small">It replaces anything already saved in this browser.</p><p class="row" style="justify-content:center"><button class="btn" data-act="restoreYes">Yes, open it here</button><button class="btn sec" data-act="restoreNo">No</button></p></div></main>`;
    } catch (e) { $('#app').innerHTML = '<main><div class="card lock"><h2>This link is not complete</h2><p>Send yourself a fresh copy from Settings and try again.</p></div></main>'; }
    return;
  }
  load();
  if (!S.qc.last || daysBetween(S.qc.last, today()) >= 7) runQC(true);
  track(S.ui.view); save(); render();
}
window.addEventListener('hashchange', () => location.reload());
boot();
