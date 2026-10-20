// Pure calculation logic for calculators/converters (no DOM). Each op takes a values object and returns [[label, value], ...] or throws Error(message).
const num = (v, name, o = {}) => {
  if (v === '' || v == null || !Number.isFinite(+v)) throw new Error(`Enter a valid number for ${name}.`);
  const n = +v; if (o.min != null && n < o.min) throw new Error(`${name} must be at least ${o.min}.`);
  if (o.gt != null && n <= o.gt) throw new Error(`${name} must be greater than ${o.gt}.`); return n;
};
export const fmt = (n, d = 2) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '—';
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const date = (s, name) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) throw new Error(`Choose a valid ${name}.`); const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (d.getUTCMonth() !== +m[2] - 1) throw new Error(`Choose a valid ${name}.`); return d; };
const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export function ymd(a, b) { // a <= b (UTC dates) → {y,m,d}; months are added to a with month-end clamping
  const add = (n) => { const t = a.getUTCFullYear() * 12 + a.getUTCMonth() + n, y = Math.floor(t / 12), m = t % 12; return new Date(Date.UTC(y, m, Math.min(a.getUTCDate(), dim(y, m)))); };
  let n = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth(); if (add(n) > b) n--;
  return { y: Math.floor(n / 12), m: n % 12, d: Math.round((b - add(n)) / 864e5) };
}
const days = (a, b) => Math.round((b - a) / 864e5);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ymdText = ({ y, m, d }) => `${plural(y, 'year')}, ${plural(m, 'month')}, ${plural(d, 'day')}`;

export const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  weight: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 },
};
export const DATA_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export const toTemp = (v, f, t) => { const k = f === 'C' ? v + 273.15 : f === 'F' ? (v - 32) * 5 / 9 + 273.15 : v; return t === 'C' ? k - 273.15 : t === 'F' ? (k - 273.15) * 9 / 5 + 32 : k; };
export const convert = (kind, v, f, t, base = 1024) => {
  if (kind === 'temperature') return toTemp(v, f, t);
  if (kind === 'data') { const bytes = (u) => (u === 'bit' ? 1 / 8 : base ** DATA_UNITS.indexOf(u)); return v * bytes(f) / bytes(t); }
  return v * UNITS[kind][f] / UNITS[kind][t];
};
const conv = (kind) => (x) => {
  const v = num(x.value, 'the value'); if (kind === 'data' && v < 0) throw new Error('Storage size cannot be negative.'); if (kind === 'temperature' && ((x.from === 'C' && v < -273.15) || (x.from === 'F' && v < -459.67) || (x.from === 'K' && v < 0))) throw new Error('That is below absolute zero.');
  const out = convert(kind, v, x.from, x.to, +x.base || 1024);
  return [[`${fmt(v, 10)} ${x.from} =`, `${fmt(out, 10)} ${x.to}`]];
};

export const OPS = {
  percent(x) {
    const a = num(x.a, 'the first value'), b = num(x.b, 'the second value');
    if (x.mode === 'of') return [[`${fmt(a)}% of ${fmt(b)}`, fmt(a * b / 100, 6)]];
    if (x.mode === 'is') { if (b === 0) throw new Error('The second value cannot be zero.'); return [[`${fmt(a)} is what % of ${fmt(b)}`, fmt(a / b * 100, 6) + '%']]; }
    if (a === 0) throw new Error('The starting value cannot be zero.');
    const c = (b - a) / Math.abs(a) * 100; return [['Change', fmt(c, 6) + '%'], ['Direction', c > 0 ? 'Increase' : c < 0 ? 'Decrease' : 'No change'], ['Difference', fmt(b - a, 6)]];
  },
  discount(x) {
    const p = num(x.price, 'the price', { min: 0 }), d = num(x.disc, 'the discount', { min: 0 }), t = x.tax === '' ? 0 : num(x.tax, 'the tax', { min: 0 });
    if (d > 100) throw new Error('Discount cannot exceed 100%.');
    const save = p * d / 100, net = p - save, tax = net * t / 100;
    return [['You save', fmt(r2(save))], ['Price after discount', fmt(r2(net))], ...(t ? [['Tax', fmt(r2(tax))], ['Final price', fmt(r2(net + tax))]] : [])];
  },
  age(x) {
    const b = date(x.dob, 'date of birth'), t = date(x.asof, 'date'); if (b > t) throw new Error('Date of birth is after the chosen date.');
    let nb = new Date(Date.UTC(t.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())); if (nb.getUTCMonth() !== b.getUTCMonth()) nb = new Date(Date.UTC(t.getUTCFullYear(), b.getUTCMonth() + 1, 0)); // 29 Feb → 28 Feb
    if (nb < t) nb = new Date(Date.UTC(t.getUTCFullYear() + 1, b.getUTCMonth(), Math.min(b.getUTCDate(), dim(t.getUTCFullYear() + 1, b.getUTCMonth()))));
    const n = days(b, t); return [['Age', ymdText(ymd(b, t))], ['Total months', fmt(ymd(b, t).y * 12 + ymd(b, t).m)], ['Total weeks', fmt(Math.floor(n / 7))], ['Total days', fmt(n)], ['Next birthday', days(t, nb) === 0 ? 'Today!' : `in ${plural(days(t, nb), 'day')}`]];
  },
  datediff(x) {
    let a = date(x.d1, 'start date'), b = date(x.d2, 'end date'); const neg = a > b; if (neg) [a, b] = [b, a]; const n = days(a, b);
    return [['Difference', ymdText(ymd(a, b))], ['Total days', fmt(n)], ['Weeks and days', `${fmt(Math.floor(n / 7))} weeks, ${n % 7} days`], ['Order', neg ? 'End date is before start date (shown as positive)' : 'End date is after start date']];
  },
  gst(x) {
    const amt = num(x.amount, 'the amount', { min: 0 }), r = num(x.rate, 'the GST rate', { min: 0 });
    const net = x.mode === 'remove' ? amt / (1 + r / 100) : amt, gst = x.mode === 'remove' ? amt - net : amt * r / 100;
    return [['Net amount (excl. GST)', fmt(r2(net))], ['GST amount', fmt(r2(gst))], [`CGST + SGST (${fmt(r / 2, 4)}% each)`, `${fmt(r2(gst / 2))} + ${fmt(r2(gst / 2))}`], ['Total (incl. GST)', fmt(r2(net + gst))]];
  },
  bmi(x) {
    let h = num(x.height, 'height', { gt: 0 }), w = num(x.weight, 'weight', { gt: 0 });
    if (x.unit === 'imperial') { h *= 2.54; w *= 0.45359237; }
    const m = h / 100, v = w / (m * m); if (v < 5 || v > 120) throw new Error('Those values look unrealistic. Check height and weight.');
    const cat = v < 18.5 ? 'Underweight' : v < 25 ? 'Normal range' : v < 30 ? 'Overweight' : 'Obese';
    return [['BMI', fmt(v, 1)], ['Category (WHO adult)', cat], ['Healthy weight range for this height', `${fmt(18.5 * m * m, 1)}–${fmt(24.9 * m * m, 1)} kg`]];
  },
  emi(x) {
    const P = num(x.principal, 'the loan amount', { gt: 0 }), R = num(x.rate, 'the interest rate', { min: 0 }); let n = num(x.tenure, 'the tenure', { gt: 0 }); if (x.tunit !== 'months') n *= 12;
    n = Math.round(n); if (n < 1 || n > 1200) throw new Error('Tenure must be between 1 month and 100 years.');
    const i = R / 1200, emi = i === 0 ? P / n : P * i * (1 + i) ** n / ((1 + i) ** n - 1), total = emi * n;
    return [['Monthly EMI', fmt(r2(emi))], ['Total interest', fmt(r2(total - P))], ['Total payment', fmt(r2(total))], ['Number of payments', fmt(n)]];
  },
  length: conv('length'), weight: conv('weight'), temperature: conv('temperature'), data: conv('data'),
};
