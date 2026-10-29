/* Charts are plain SVG. One accent hue for single-series charts; blue/orange for store/online; gray for de-emphasis; status red only for bad deltas. */
const $ = (s, el = document) => el.querySelector(s);
const D = DATA, Y = D.years, by = y => Y.find(r => r.year === y);
const money = v => Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}M` : Math.abs(v) >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
const num = v => Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K` : String(Math.round(v));
const pct = (v, d = 0) => `${v > 0 ? '+' : ''}${v.toFixed(d)}%`;
const full = v => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(e, html) { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
function hideTip() { tip.hidden = true; }
const row = (label, value, color, sq) => `<div><span>${color ? `<i class="k ${sq ? 'sq' : ''}" style="background:${color}"></i>` : ''}${label}</span><b>${value}</b></div>`;

/* ---------- card shell ---------- */
function card(id, title, so, svg, legend, table, foot) {
  const el = $('#' + id);
  el.innerHTML = `<h3>${title}</h3><p class="so">${so}</p>${legend ? `<div class="legend">${legend}</div>` : ''}<div class="plot">${svg}</div><div class="tw" hidden>${table}</div><div class="foot"><span>${foot || ''}</span><button type="button">Show table</button></div>`;
  const b = $('.foot button', el), t = $('.tw', el), p = $('.plot', el);
  b.onclick = () => { const on = t.hidden; t.hidden = !on; p.hidden = on; b.textContent = on ? 'Show chart' : 'Show table'; };
  el.querySelectorAll('[data-tip]').forEach(n => { n.addEventListener('pointermove', e => showTip(e, n.dataset.tip)); n.addEventListener('pointerleave', hideTip); n.setAttribute('tabindex', '0'); n.addEventListener('focus', e => { const r = n.getBoundingClientRect(); showTip({ clientX: r.left + r.width / 2, clientY: r.top }, n.dataset.tip); }); n.addEventListener('blur', hideTip); });
}
const table = (cols, rows) => `<table class="tbl"><tr>${cols.map((c, i) => `<th class="${i ? 'n' : ''}">${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map((v, i) => `<td class="${i ? 'n' : ''}">${v}</td>`).join('')}</tr>`).join('')}</table>`;
const ticks = (max, n = 4) => { const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p, step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; const out = []; for (let v = 0; v <= max + step * 0.999; v += step) out.push(v); return out; };

/* ---------- column chart (single or two stacked series) ---------- */
function columns(o) {
  const W = 520, H = 250, m = { l: 44, r: 10, t: 14, b: 30 }, n = o.cats.length, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const totals = o.cats.map((_, i) => o.series.reduce((a, s) => a + (s.v[i] || 0), 0));
  const tk = ticks(Math.max(...totals)), max = tk[tk.length - 1];
  const X = i => m.l + pw * (i + 0.5) / n, Yv = v => m.t + ph - ph * v / max, bw = Math.min(24, pw / n * 0.6);
  let g = tk.map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Yv(v)}" y2="${Yv(v)}"/><text class="ax" x="${m.l - 6}" y="${Yv(v) + 4}" text-anchor="end">${o.fmt(v)}</text>`).join('');
  g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${Yv(0)}" y2="${Yv(0)}"/>`;
  o.cats.forEach((c, i) => {
    let base = 0; const x = X(i) - bw / 2;
    const tipHtml = `<b>${o.tipTitle ? o.tipTitle(i) : c}</b>` + o.series.map(s => row(s.name, o.fmt(s.v[i], true), s.color(i), true)).join('') + (o.series.length > 1 ? row('Total', o.fmt(totals[i], true)) : '') + (o.extra ? o.extra(i) : '');
    o.series.forEach((s, k) => {
      const v = s.v[i] || 0, y1 = Yv(base + v), y0 = Yv(base), h = Math.max(0, y0 - y1 - (k && v ? 2 : 0));
      const top = k === o.series.length - 1 || o.series.slice(k + 1).every(t => !t.v[i]);
      g += `<rect class="mark" x="${x}" y="${y1}" width="${bw}" height="${h}" fill="${s.color(i)}" rx="${top ? 4 : 0}" ry="${top ? 4 : 0}" ${top ? `clip-path="inset(0 0 -4px 0 round 4px 4px 0 0)"` : ''}/>`;
      if (top && h > 0 && h < 4) g += '';
      base += v;
    });
    g += `<rect class="hit" x="${X(i) - pw / n / 2}" y="${m.t}" width="${pw / n}" height="${ph}" data-tip='${tipHtml.replace(/'/g, '&#39;')}'/>`;
    if (o.label && o.label(i)) g += `<text class="v" x="${X(i)}" y="${Yv(totals[i]) - 6}" text-anchor="middle">${o.label(i)}</text>`;
    g += `<text class="ax" x="${X(i)}" y="${H - m.b + 16}" text-anchor="middle">${c}</text>`;
  });
  if (o.annot) g += o.annot({ X, Y: Yv, m, W, H });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria}">${g}</svg>`;
}

/* ---------- line chart (single series) ---------- */
function line(o) {
  const W = 520, H = 250, m = { l: 44, r: 14, t: 14, b: 30 }, n = o.v.length, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const tk = ticks(Math.max(...o.v)), max = tk[tk.length - 1];
  const X = i => m.l + pw * i / (n - 1), Yv = v => m.t + ph - ph * v / max;
  let g = tk.map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Yv(v)}" y2="${Yv(v)}"/><text class="ax" x="${m.l - 6}" y="${Yv(v) + 4}" text-anchor="end">${o.fmt(v)}</text>`).join('');
  g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${Yv(0)}" y2="${Yv(0)}"/>`;
  const pts = o.v.map((v, i) => `${X(i)},${Yv(v)}`).join(' ');
  g += `<polygon points="${m.l},${Yv(0)} ${pts} ${X(n - 1)},${Yv(0)}" fill="${o.color}" opacity=".1"/>`;
  g += `<polyline points="${pts}" fill="none" stroke="${o.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  o.v.forEach((v, i) => {
    if (o.xlab(i)) g += `<text class="ax" x="${X(i)}" y="${H - m.b + 16}" text-anchor="middle">${o.xlab(i)}</text>`;
    if (o.mark && o.mark(i)) g += `<circle cx="${X(i)}" cy="${Yv(v)}" r="5" fill="${o.color}" stroke="var(--surface)" stroke-width="2"/><text class="v" x="${X(i)}" y="${Yv(v) - 10}" text-anchor="middle">${o.mark(i)}</text>`;
    g += `<rect class="hit" x="${X(i) - pw / (n - 1) / 2}" y="${m.t}" width="${pw / (n - 1)}" height="${ph}" data-tip='${(`<b>${o.name(i)}</b>` + row(o.series, o.fmt(v, true), o.color)).replace(/'/g, '&#39;')}'/>`;
  });
  g += `<circle cx="${X(n - 1)}" cy="${Yv(o.v[n - 1])}" r="4" fill="${o.color}" stroke="var(--surface)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria}">${g}</svg>`;
}

/* ---------- horizontal bars ---------- */
function hbars(o) {
  const W = 520, rh = 26, m = { l: o.labelW || 150, r: 70, t: 6, b: 6 }, n = o.cats.length, H = m.t + m.b + n * rh, pw = W - m.l - m.r;
  const neg = o.v.some(v => v < 0), maxAbs = Math.max(...o.v.map(Math.abs));
  const X0 = neg ? m.l + pw / 2 : m.l, scale = (neg ? pw / 2 : pw) / maxAbs;
  let g = `<line class="axis" x1="${X0}" x2="${X0}" y1="${m.t}" y2="${H - m.b}"/>`;
  o.cats.forEach((c, i) => {
    const v = o.v[i], y = m.t + i * rh + (rh - 18) / 2, w = Math.abs(v) * scale, x = v < 0 ? X0 - w : X0;
    g += `<text x="${m.l - 10}" y="${y + 13}" text-anchor="end">${c}</text>`;
    g += `<rect class="mark" x="${x}" y="${y}" width="${w}" height="18" fill="${o.color(i)}" rx="4" ry="4"/>`;
    g += `<text class="v" x="${v < 0 ? x - 6 : x + w + 6}" y="${y + 13}" text-anchor="${v < 0 ? 'end' : 'start'}">${o.fmt(v)}</text>`;
    g += `<rect class="hit" x="0" y="${m.t + i * rh}" width="${W}" height="${rh}" data-tip='${(`<b>${c}</b>` + (o.tip ? o.tip(i) : row(o.series, o.fmt(v, true), o.color(i), true))).replace(/'/g, '&#39;')}'/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria}">${g}</svg>`;
}

/* ---------- dumbbell: before -> after per item ---------- */
function dumbbell(o) {
  const W = 520, rh = 30, m = { l: 120, r: 60, t: 22, b: 6 }, n = o.cats.length, H = m.t + m.b + n * rh, pw = W - m.l - m.r;
  const max = Math.max(...o.a, ...o.b), X = v => m.l + pw * v / max, c1 = css('--dim'), c2 = css('--s1');
  let g = `<text class="ax" x="${m.l}" y="12">${o.fmt(0)}</text><text class="ax" x="${W - m.r}" y="12" text-anchor="end">${o.fmt(max)}</text>`;
  o.cats.forEach((c, i) => {
    const y = m.t + i * rh + rh / 2, a = o.a[i], b = o.b[i], up = b >= a;
    g += `<text x="${m.l - 10}" y="${y + 4}" text-anchor="end">${c}</text>`;
    g += `<line x1="${X(a)}" x2="${X(b)}" y1="${y}" y2="${y}" stroke="${up ? c2 : css('--critical')}" stroke-width="2"/>`;
    g += `<circle cx="${X(a)}" cy="${y}" r="5" fill="${c1}" stroke="var(--surface)" stroke-width="2"/><circle cx="${X(b)}" cy="${y}" r="5" fill="${up ? c2 : css('--critical')}" stroke="var(--surface)" stroke-width="2"/>`;
    g += `<text class="v" x="${X(Math.max(a, b)) + 10}" y="${y + 4}">${pct(100 * (b / a - 1))}</text>`;
    g += `<rect class="hit" x="0" y="${m.t + i * rh}" width="${W}" height="${rh}" data-tip='${(`<b>${c}</b>` + row(o.na, o.fmt(a, true), c1, true) + row(o.nb, o.fmt(b, true), up ? c2 : css('--critical'), true) + row('Change', pct(100 * (b / a - 1), 1))).replace(/'/g, '&#39;')}'/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria}">${g}</svg>`;
}

/* ================= build ================= */
function build() {
  const S1 = css('--s1'), S2 = css('--s2'), DIM = css('--dim'), BAD = css('--critical');
  const y24 = by(2024), y25 = by(2025), y23 = by(2023), y26 = by(2026);
  /* KPI row */
  const kpi = (l, v, d, up, note) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d ${d === null ? '' : up ? 'up' : 'down'}">${d === null ? note : `<b>${d}</b> vs 2024`}</div></div>`;
  $('#kpis').innerHTML =
    kpi('Revenue, 2025', money(y25.revenue), pct(100 * (y25.revenue / y24.revenue - 1)), false) +
    kpi('Orders, 2025', num(y25.orders), pct(100 * (y25.orders / y24.orders - 1)), false) +
    kpi('Average order, 2025', '$' + full(y25.aov), pct(100 * (y25.aov / y24.aov - 1)), false) +
    kpi('Gross margin, 2025', y25.margin_pct.toFixed(1) + '%', `${y25.margin_pct >= y24.margin_pct ? '+' : ''}${(y25.margin_pct - y24.margin_pct).toFixed(1)} pt`, true) +
    kpi('Online share, 2025', y25.online_pct.toFixed(0) + '%', `+${(y25.online_pct - y24.online_pct).toFixed(0)} pt`, true) +
    kpi('New customers, 2025', full(y25.new_customers), pct(100 * (y25.new_customers / y24.new_customers - 1)), false);

  /* 1a annual revenue */
  const yrs = Y.map(r => r.year), lab = yrs.map(y => y === 2026 ? 'YTD' : String(y));
  card('c-revenue', 'Annual revenue', `Revenue peaked at ${money(y24.revenue)} in 2024 and fell ${Math.abs(100 * (y25.revenue / y24.revenue - 1)).toFixed(0)}% in 2025, the second drop in four years. 2026 is tracking at the 2025 rate.`,
    columns({ cats: lab, series: [{ name: 'Revenue', v: Y.map(r => r.revenue), color: i => yrs[i] === 2026 ? DIM : S1 }], fmt: (v, f) => f ? '$' + full(v) : money(v), aria: 'Annual revenue 2017 to 2026', label: i => [2021, 2024, 2025].includes(yrs[i]) ? money(Y[i].revenue) : '', extra: i => row('Orders', full(Y[i].orders)) + row('Average order', '$' + full(Y[i].aov)) }),
    '', table(['Year', 'Revenue', 'Orders', 'Average order', 'Gross margin'], Y.map(r => [r.year === 2026 ? '2026 YTD' : r.year, '$' + full(r.revenue), full(r.orders), '$' + full(r.aov), r.margin_pct.toFixed(1) + '%'])), 'YTD: 2026 to 20 April, shown in gray.');

  /* 1b channel */
  card('c-channel', 'Store and online revenue', `Online went from ${y23 && by(2017).online_pct.toFixed(0)}% of revenue in 2017 to ${y25.online_pct.toFixed(0)}% in 2025. It carries the same average order and the same margin as the stores, so the shift is not costing gross profit. It is costing the store estate.`,
    columns({ cats: lab, series: [{ name: 'In store', v: Y.map(r => r.store), color: () => S1 }, { name: 'Online', v: Y.map(r => r.online), color: () => S2 }], fmt: (v, f) => f ? '$' + full(v) : money(v), aria: 'Revenue by channel per year', label: i => yrs[i] >= 2023 && yrs[i] <= 2025 ? Y[i].online_pct.toFixed(0) + '% online' : '', extra: i => row('Online share', Y[i].online_pct.toFixed(1) + '%') }),
    `<span><i style="background:${S1}"></i>In store</span><span><i style="background:${S2}"></i>Online</span>`,
    table(['Year', 'In store', 'Online', 'Online share'], Y.map(r => [r.year === 2026 ? '2026 YTD' : r.year, '$' + full(r.store), '$' + full(r.online), r.online_pct.toFixed(1) + '%'])));

  /* 2a bridge */
  const B = D.bridge;
  card('c-bridge', 'What changed from 2024 to 2025, and since 2023', `Against 2024, orders fell ${Math.abs(B.orders24).toFixed(0)}% and revenue ${Math.abs(B.revenue24).toFixed(0)}%. Against 2023, the business sells ${B.units.toFixed(0)}% more units, but the same products are priced ${Math.abs(B.price).toFixed(0)}% lower, so revenue is up only ${B.revenue.toFixed(0)}% on nearly double the volume. Lower prices have not bought proportionate volume.`,
    hbars({ cats: ['Orders vs 2024', 'Revenue vs 2024', 'Units vs 2023', 'Like-for-like price vs 2023', 'Revenue vs 2023'], v: [B.orders24, B.revenue24, B.units, B.price, B.revenue], color: i => [B.orders24, B.revenue24, B.units, B.price, B.revenue][i] < 0 ? BAD : S1, fmt: v => pct(v, 1), series: 'Change', aria: 'Percentage changes in orders, units, price and revenue', labelW: 190 }),
    '', table(['Measure', 'Change'], [['Orders, 2025 vs 2024', pct(B.orders24, 1)], ['Revenue, 2025 vs 2024', pct(B.revenue24, 1)], ['Units sold, 2025 vs 2023', pct(B.units, 1)], ['Like-for-like price, 2025 vs 2023', pct(B.price, 1)], ['Revenue, 2025 vs 2023', pct(B.revenue, 1)]]), 'Like-for-like price: same 2,517 products, weighted by 2025 units.');

  /* 2b monthly */
  const M = D.monthly, mv = M.map(r => r.revenue);
  card('c-monthly', 'Monthly revenue since January 2023', `The 2024 run-rate was about $37M a month; 2025 settled at about $25M. April is the low point of every year, and March 2026 was down a third on March 2025.`,
    line({ v: mv, color: S1, fmt: (v, f) => f ? '$' + full(v) : money(v), xlab: i => M[i].month.endsWith('-01') ? M[i].month.slice(0, 4) : (M[i].month.endsWith('-07') ? '·' : ''), name: i => { const [y, m] = M[i].month.split('-'); return MONTHS[+m - 1] + ' ' + y; }, series: 'Revenue', aria: 'Monthly revenue January 2023 to April 2026', mark: i => M[i].month === '2024-02' ? 'Feb 2024 peak' : M[i].month === '2025-04' ? 'Apr 2025' : '' }),
    '', table(['Month', 'Revenue'], M.map(r => [r.month, '$' + full(r.revenue)])), 'April 2026 is a partial month.');

  /* 3a seasonality */
  card('c-season', 'Share of a typical year by month', `February and December are the big months. April carries ${D.season[3].toFixed(1)}% of the year against ${(100 / 12).toFixed(1)}% for an average month, and it has every year since 2017. It is structural, so it can be planned for.`,
    columns({ cats: MONTHS, series: [{ name: 'Share of annual revenue', v: D.season, color: i => i === 3 ? BAD : i === 1 || i === 11 ? S1 : DIM }], fmt: (v, f) => v.toFixed(f ? 1 : 0) + '%', aria: 'Average share of annual revenue by calendar month', label: i => [1, 3, 11].includes(i) ? D.season[i].toFixed(1) + '%' : '' }),
    '', table(['Month', 'Average share of year'], MONTHS.map((m, i) => [m, D.season[i].toFixed(1) + '%'])), 'Average of 2017 to 2025.');

  /* 3b weekday */
  const wd = D.weekday2025, dead = wd.indexOf(Math.min(...wd));
  card('c-weekday', 'Orders per day by weekday, 2025', `${DOW[dead]} runs at ${Math.round(wd[dead])} orders a day against ${Math.round(wd.filter((_, i) => i !== dead).reduce((a, b) => a + b, 0) / 6)} on the other days. One weekday has been almost dead every year since 2017, though which one changes. Nobody has explained it; it needs an owner. Weekend days earn ${(100 * (D.workday.off / D.workday.working - 1)).toFixed(0)}% more per day than working days.`,
    columns({ cats: DOW, series: [{ name: 'Orders per day', v: wd, color: i => i === dead ? BAD : S1 }], fmt: (v, f) => full(v), aria: 'Average orders per day by weekday in 2025', label: i => i === dead || i === 1 ? full(wd[i]) : '' }),
    '', table(['Weekday', 'Orders per day'], DOW.map((d, i) => [d, full(wd[i])])));

  /* 4a country dumbbell */
  const C = D.country;
  card('c-country', 'Store revenue by country, 2023 against 2025', `Physical stores in the United States, the home market and ${(100 * C[0].y2025 / C.reduce((a, r) => a + r.y2025, 0)).toFixed(0)}% of store revenue, are down ${Math.abs(100 * (C[0].y2025 / C[0].y2023 - 1)).toFixed(0)}% while their customers move online. Germany, Canada, the Netherlands and Australia grew. The UK and Italy are shrinking.`,
    hbars({ cats: C.map(r => `${r.country} (${money(r.y2025)})`), v: C.map(r => 100 * (r.y2025 / r.y2023 - 1)), color: i => C[i].y2025 >= C[i].y2023 ? S1 : BAD, fmt: v => pct(v, 0), series: 'Change', aria: 'Change in store revenue by country, 2023 to 2025', labelW: 190, tip: i => row('2023', '$' + full(C[i].y2023)) + row('2025', '$' + full(C[i].y2025)) + row('Change', pct(100 * (C[i].y2025 / C[i].y2023 - 1), 1)) }),
    `<span><i style="background:${S1}"></i>Grew</span><span><i style="background:${BAD}"></i>Shrank</span>`,
    table(['Country', '2023', '2025', 'Change'], C.map(r => [r.country, '$' + full(r.y2023), '$' + full(r.y2025), pct(100 * (r.y2025 / r.y2023 - 1), 1)])), 'Physical stores only; online excluded. Label shows 2025 revenue.');

  /* 4b category */
  const K = D.category;
  card('c-category', 'Revenue by category, 2025', `Computers are ${(100 * K[0].revenue / K.reduce((a, r) => a + r.revenue, 0)).toFixed(0)}% of revenue but shrinking as a share. Home Appliances is the growth engine, up ${pct(K.find(r => r.category === 'Home Appliances').growth)} since 2023. Margin is even: every category earns between 52% and 59%.`,
    hbars({ cats: K.map(r => r.category), v: K.map(r => r.revenue), color: () => S1, fmt: (v, f) => f ? '$' + full(v) : money(v), series: 'Revenue 2025', aria: 'Revenue by product category in 2025', tip: i => row('Revenue 2025', '$' + full(K[i].revenue), S1, true) + row('Gross margin', K[i].margin_pct.toFixed(1) + '%') + row('Growth since 2023', pct(K[i].growth, 1)), labelW: 200 }),
    '', table(['Category', 'Revenue 2025', 'Gross margin', 'Growth since 2023'], K.map(r => [r.category, '$' + full(r.revenue), r.margin_pct.toFixed(1) + '%', pct(r.growth, 1)])));

  /* 5a new customers */
  card('c-newcust', 'New customers by year of first order', `Acquisition has all but stopped: ${full(by(2018).new_customers)} new customers in 2018, ${full(y25.new_customers)} in 2025, ${full(y26.new_customers)} so far in 2026 (YTD). Retention of existing customers was strong (82% to 88% re-ordered in 2024 and 2025), so the base is loyal but ageing out.`,
    columns({ cats: lab, series: [{ name: 'New customers', v: Y.map(r => r.new_customers), color: i => yrs[i] === 2026 ? DIM : S1 }], fmt: (v, f) => f ? full(v) : num(v), aria: 'New customers by year', label: i => [2018, 2025].includes(yrs[i]) ? full(Y[i].new_customers) : '', extra: i => { const r = D.retention.find(x => x.year === yrs[i]); return r ? row('Active customers', full(r.active)) + row('Ordered again next year', r.retained_pct + '%') : row('Active customers', full(Y[i].customers)); } }),
    '', table(['Year', 'New customers', 'Active customers', 'Ordered again next year'], Y.map(r => { const t = D.retention.find(x => x.year === r.year); return [r.year === 2026 ? '2026 YTD' : r.year, full(r.new_customers), full(r.customers), t ? t.retained_pct + '%' : '']; })));

  /* 5b delivery */
  const dv = Y.map(r => r.late_pct);
  card('c-delivery', 'Online deliveries later than 7 days', `A genuine success. In 2017 ${by(2017).late_pct.toFixed(0)}% of online orders arrived late and the average took ${by(2017).delivery_days.toFixed(1)} days. In 2025 ${y25.late_pct.toFixed(1)}% were late and the average is ${y25.delivery_days.toFixed(1)} days. Worth telling customers.`,
    line({ v: dv, color: S1, fmt: (v, f) => v.toFixed(f ? 1 : 0) + '%', xlab: i => lab[i].replace(' YTD', ''), name: i => lab[i], series: 'Late deliveries', aria: 'Share of online deliveries later than seven days by year', mark: i => i === 0 || yrs[i] === 2025 ? dv[i].toFixed(i ? 1 : 0) + '%' : '' }),
    '', table(['Year', 'Late deliveries', 'Average days to deliver'], Y.map(r => [r.year === 2026 ? '2026 YTD' : r.year, r.late_pct.toFixed(1) + '%', r.delivery_days.toFixed(2)])));

  /* facts */
  const cu = D.customers, dc = D.discount;
  $('#c-facts').innerHTML = [
    [money(dc.cost), `given away in discounts since 2017. ${dc.lines_pct}% of order lines are discounted, by ${dc.avg_pct}% on average, and that share is identical in every year, every category and every basket size. A discount everyone gets is just a lower price.`],
    [full(cu.lapsed_valuable), `customers with three or more past orders have not bought since 2024. Their lifetime spend is ${money(cu.lapsed_revenue)}. A win-back list with names on it.`],
    [full(cu.never), `registered customers, ${(100 * cu.never / cu.registered).toFixed(0)}% of the file, have never placed an order.`],
    [y25.margin_pct.toFixed(1) + '%', `gross margin, unchanged in ten years and even across categories and channels. Pricing moved cost with it; it did not move volume.`],
  ].map(([v, l]) => `<div class="fact"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

  /* actions */
  $('#actions').innerHTML = [
    ['Revisit the 2025 price cuts.', `Prices on the same products are ${Math.abs(B.price)}% below 2023 and units per order have not moved. Test restoring price on the categories with the deepest cuts (computers, phones) in a few stores before the next February peak.`],
    ['Restart acquisition.', `Fewer than 1,100 customers were acquired in 2025. Set an acquisition target and fund it; the loyal base cannot carry growth on its own.`],
    ['Run two named campaigns.', `${full(cu.lapsed_valuable)} lapsed repeat buyers worth ${money(cu.lapsed_revenue)}, and ${full(cu.never)} registered non-buyers. Both lists already exist in the data.`],
    ['Make discounts earn their keep.', `Hold out a control group with no discount and measure whether the ${dc.avg_pct}% average discount changes basket size at all. Today there is no evidence it does.`],
    ['Decide the US store footprint.', `US store revenue is down ${Math.abs(Math.round(100 * (C[0].y2025 / C[0].y2023 - 1)))}% in two years while US customers shift online. Review the 12 US stores down more than 15% against their lease terms.`],
    ['Find out what happens on the dead weekday.', `One weekday runs at a fifth of normal volume. If it is an operational cause, fix it; if it is a data pipeline cause, the reporting is wrong.`],
    ['Plan for April.', `April has been the weakest month for ten years. Move stock, promotions and staffing to February and December, where the demand is.`],
  ].map(([h, t]) => `<li><b>${h}</b> ${t}</li>`).join('');

  $('#notes').innerHTML = [
    `Source: Northgate order, order line, product, store, customer and calendar tables, ${full(Y.reduce((a, r) => a + r.orders, 0))} orders and ${money(D.total_revenue)} of revenue from 1 January 2017 to 20 April 2026.`,
    'Revenue is quantity times the price actually charged. Gross margin is revenue minus unit cost. All amounts are US dollars; no currency conversion is applied.',
    'Store country is where the store is. Customers buy only from stores in their own country, so store country and customer country agree for in-store sales.',
    'Like-for-like price compares the same product in 2023 and 2025, weighted by 2025 units, so product mix does not affect it.',
    'Data quality: the category "Cameras and camcorders" and the brands Northgate and Fabrikam carry trailing spaces in the source and were merged here. Store 630 (Utah) closed in 2021 with no status recorded.',
  ].map(t => `<li>${t}</li>`).join('');
}

/* theme */
const themes = ['auto', 'light', 'dark']; let theme = localStorage.getItem('ng-theme') || 'auto';
function applyTheme() { if (theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = theme; $('#theme').textContent = 'Theme: ' + theme; build(); }
$('#theme').onclick = () => { theme = themes[(themes.indexOf(theme) + 1) % 3]; localStorage.setItem('ng-theme', theme); applyTheme(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => theme === 'auto' && build());
applyTheme();
