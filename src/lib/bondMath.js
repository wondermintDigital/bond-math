export const MATURITIES = [
  { key: 'm1', label: '1M', years: 1 / 12 },
  { key: 'm3', label: '3M', years: 0.25 },
  { key: 'm6', label: '6M', years: 0.5 },
  { key: 'y1', label: '1Y', years: 1 },
  { key: 'y2', label: '2Y', years: 2 },
  { key: 'y5', label: '5Y', years: 5 },
  { key: 'y7', label: '7Y', years: 7 },
  { key: 'y10', label: '10Y', years: 10 },
  { key: 'y20', label: '20Y', years: 20 },
  { key: 'y30', label: '30Y', years: 30 },
];

export const DURATION_MODES = [
  { key: 'dv01', label: 'DV01', bump: 0.0001, note: '1 bp bump' },
  { key: 'bp10', label: '10 bps', bump: 0.001, note: '10 bp bump' },
  { key: 'bp100', label: '100 bps', bump: 0.01, note: '100 bp bump' },
];

export const COUPON_FREQUENCIES = [
  { key: 'annual', label: 'Annual', frequency: 1 },
  { key: 'semi', label: 'Semi-Annual', frequency: 2 },
  { key: 'quarterly', label: 'Quarterly', frequency: 4 },
  { key: 'monthly', label: 'Monthly', frequency: 12 },
];

export function priceFromYield({ face, couponRate, years, ytm, frequency }) {
  const periods = Math.round(years * frequency);
  const coupon = (face * couponRate) / frequency;
  const periodYield = ytm / frequency;
  let price = 0;
  for (let t = 1; t <= periods; t++) {
    price += coupon / Math.pow(1 + periodYield, t);
  }
  price += face / Math.pow(1 + periodYield, periods);
  return price;
}

export function solveYtm({ face, couponRate, years, price, frequency }) {
  let low = -0.95;
  let high = 1.0;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const modelPrice = priceFromYield({ face, couponRate, years, ytm: mid, frequency });
    if (modelPrice > price) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function durationAndConvexity({ face, couponRate, years, ytm, frequency }) {
  const periods = Math.round(years * frequency);
  const coupon = (face * couponRate) / frequency;
  const periodYield = ytm / frequency;
  const price = priceFromYield({ face, couponRate, years, ytm, frequency });
  let weightedTime = 0;
  let convexitySum = 0;
  for (let t = 1; t <= periods; t++) {
    const cashFlow = t === periods ? coupon + face : coupon;
    const pv = cashFlow / Math.pow(1 + periodYield, t);
    const yearsAtCashFlow = t / frequency;
    weightedTime += yearsAtCashFlow * pv;
    convexitySum += (cashFlow * t * (t + 1)) / Math.pow(1 + periodYield, t + 2);
  }
  const macaulay = weightedTime / price;
  const modified = macaulay / (1 + periodYield);
  const convexity = convexitySum / (price * frequency * frequency);
  return { price, macaulay, modified, convexity };
}

export function effectiveDuration({ years, rate, bump, frequency = 2 }) {
  const face = 100;
  const couponRate = rate; // par bond: coupon = yield, price ≈ 100
  const p0 = priceFromYield({ face, couponRate, years, ytm: rate, frequency });
  const up = priceFromYield({ face, couponRate, years, ytm: rate + bump, frequency });
  const down = priceFromYield({ face, couponRate, years, ytm: rate - bump, frequency });
  const duration = (down - up) / (2 * p0 * bump);
  return { duration, p0, up, down };
}

// Linear interpolation of a curve's yield at any term, from the tenors we have.
export function curveYieldAt(curve, years) {
  const pts = MATURITIES.map((m) => ({ x: m.years, y: curve[m.key] })).filter((p) => Number.isFinite(p.y));
  if (!pts.length) return null;
  if (years <= pts[0].x) return pts[0].y;
  if (years >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 1; i < pts.length; i++) {
    if (years <= pts[i].x) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.y + ((years - a.x) / (b.x - a.x)) * (b.y - a.y);
    }
  }
  return pts[pts.length - 1].y;
}

// ---- Day count conventions ----
// Interest that accrues over a period depends on how the year fraction is measured.
// Each convention counts the days in the period and/or the days in a year differently.

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Parse an ISO "YYYY-MM-DD" string into a plain {y, m, d} record (no timezone math).
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
};

// Actual calendar days between two dates.
export function actualDays(start, end) {
  const a = Date.UTC(start.y, start.m - 1, start.d);
  const b = Date.UTC(end.y, end.m - 1, end.d);
  return Math.round((b - a) / 86400000);
}

// 30/360 (US/NASD) day count: months are treated as 30 days, years as 360.
export function days30360(start, end) {
  let d1 = start.d;
  let d2 = end.d;
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;
  return 360 * (end.y - start.y) + 30 * (end.m - start.m) + (d2 - d1);
}

// Actual/Actual (ISDA): split the period at year boundaries and divide each stub by
// that calendar year's own length (365 or 366).
export function yearFracActAct(start, end) {
  if (start.y === end.y) {
    return actualDays(start, end) / (isLeapYear(start.y) ? 366 : 365);
  }
  const startStub = actualDays(start, { y: start.y + 1, m: 1, d: 1 }) / (isLeapYear(start.y) ? 366 : 365);
  const endStub = actualDays({ y: end.y, m: 1, d: 1 }, end) / (isLeapYear(end.y) ? 366 : 365);
  return startStub + endStub + (end.y - start.y - 1);
}

// The four conventions offered on the Day Count Accrual page. `yearFrac` returns the
// fraction of a year the [start, end] period represents under that convention.
export const DAY_COUNTS = [
  {
    key: '30360',
    label: '30/360',
    alt: 'US / NASD',
    desc: 'Months as 30 days, year as 360. Common for US corporate and agency bonds.',
    uses: ['US corporate & municipal bonds', 'Agency debt and many mortgages', 'Keeps every coupon period equal'],
    yearFrac: (s, e) => days30360(s, e) / 360,
  },
  {
    key: 'act360',
    label: 'Actual/360',
    alt: 'Act/360',
    desc: 'Actual days over a 360-day year. Money-market standard (T-bills, SOFR, commercial paper).',
    uses: ['Money markets: T-bills, commercial paper, repo', 'SOFR, fed funds, USD & EUR interbank', 'Most US commercial loans'],
    yearFrac: (s, e) => actualDays(s, e) / 360,
  },
  {
    key: 'actact',
    label: 'Actual/Actual',
    alt: 'Act/Act',
    desc: 'Actual days over the actual year length. Used for US Treasury notes and bonds.',
    uses: ['US Treasury notes & bonds', 'Government bonds broadly', 'ICMA for Eurobonds · ISDA for swaps'],
    yearFrac: yearFracActAct,
  },
  {
    key: 'act365',
    label: 'Actual/365',
    alt: 'Act/365 Fixed',
    desc: 'Actual days over a fixed 365-day year. The London interbank convention for sterling.',
    uses: ['Sterling (GBP) money markets', 'GBP deposits & floating-rate notes', 'London interbank convention for GBP'],
    yearFrac: (s, e) => actualDays(s, e) / 365,
  },
];

export function money(value) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pct(value) {
  return `${Number(value).toFixed(2)}%`;
}

export const fmtTerm = (t) => (Number.isInteger(t) ? t : t.toFixed(2));
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
