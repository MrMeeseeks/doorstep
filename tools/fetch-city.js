// Downloads the City of Toronto's official curbside pickup calendar (open data) and writes src/city.js.
// Run again whenever the City publishes a new year:  node tools/fetch-city.js && sh build.sh
const fs = require('fs'), path = require('path');
const B = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/';
(async () => {
  const pkg = (await (await fetch(B + 'package_show?id=solid-waste-pickup-schedule')).json()).result;
  const res = pkg.resources.filter(r => r.datastore_active && /^pickup-schedule-\d{4}$/.test(r.name)).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 2);
  const cal = {};
  for (const r of res) {
    const rows = (await (await fetch(B + 'datastore_search?limit=5000&resource_id=' + r.id)).json()).result.records;
    for (const x of rows) {
      const ws = String(x.WeekStarting); let date = ws.slice(0, 10); if (ws.includes('/')) { const [m, d, y] = ws.split('/'); date = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
      const on = k => x[k] && x[k] !== '0';
      (cal[x.Calendar] ??= {})[date] = (on('Garbage') ? 'G' : '') + (on('Recycling') ? 'R' : '') + (on('YardWaste') ? 'Y' : '') + (on('ChristmasTree') ? 'X' : '');
    }
    console.log(r.name, rows.length, 'rows');
  }
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], sorted = {};
  Object.keys(cal).sort((a, b) => order.indexOf(a.replace(/\d/, '')) - order.indexOf(b.replace(/\d/, '')) || a.localeCompare(b)).forEach(k => sorted[k] = cal[k]);
  const t = new Date(), today = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  fs.writeFileSync(path.join(__dirname, '../src/city.js'), '/* City of Toronto curbside pickup calendar — open.toronto.ca "Solid Waste Collection Schedule". G garbage, R recycling, Y yard waste, X Christmas trees. Green bin is every week. */\nconst CITY = ' + JSON.stringify({ updated: today, years: res.map(r => r.name.slice(-4)).sort(), cal: sorted }) + ';\n');
})();
