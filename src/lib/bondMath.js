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

export function effectiveDuration({ years, rate, bump }) {
  const face = 100;
  const frequency = 2;
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

export function money(value) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pct(value) {
  return `${Number(value).toFixed(2)}%`;
}

export const fmtTerm = (t) => (Number.isInteger(t) ? t : t.toFixed(2));
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
