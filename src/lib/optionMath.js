// Option math for the Forward Vol straddle comparator.
// IV is solved from a straddle via Black–Scholes at the traded strike (r = 0,
// calendar days / 365). Forward vol assumes variance adds in time.

// Standard normal CDF (Abramowitz–Stegun approximation).
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

// Black–Scholes price for a call ('c') or put ('p'), zero rates.
export function bs(S, K, t, sig, cp) {
  if (sig <= 0 || t <= 0) return Math.max(0, cp === 'c' ? S - K : K - S);
  const d1 = (Math.log(S / K) + 0.5 * sig * sig * t) / (sig * Math.sqrt(t));
  const d2 = d1 - sig * Math.sqrt(t);
  return cp === 'c' ? S * normCdf(d1) - K * normCdf(d2) : K * normCdf(-d2) - S * normCdf(-d1);
}

// Solve implied vol from a straddle price by bisection.
// Returns null when the price is at/below intrinsic (no vol solution).
export function straddleIV(strad, S, K, t) {
  const intr = Math.abs(S - K);
  if (!Number.isFinite(strad) || strad <= intr + 1e-9) return null;
  let lo = 1e-6;
  let hi = 8;
  const f = (s) => bs(S, K, t, s, 'c') + bs(S, K, t, s, 'p') - strad;
  if (f(hi) < 0) return hi;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
}

// Full metric set for one straddle leg.
export function legMetrics(S, K, dte, strad) {
  const t = dte / 365;
  const iv = straddleIV(strad, S, K, t);
  const intr = Math.abs(S - K);
  const tv = strad - intr;
  const beLo = K - strad;
  const beHi = K + strad;
  const beMove = strad / S; // move needed by expiry (one side)
  const dailyMove = iv !== null ? iv / Math.sqrt(252) : null; // implied 1-day 1σ
  return { t, iv, intr, tv, beLo, beHi, beMove, dailyMove, strad };
}

// Forward vol between two expiries: σ_fwd = √[(σ_B²·t_B − σ_A²·t_A)/(t_B − t_A)].
// `inverted` flags the case where the back window prices negative variance.
export function forwardVol(A, B) {
  if (A.iv === null || B.iv === null || !(B.t > A.t)) return { fwd: null, inverted: false };
  const fv = (B.iv * B.iv * B.t - A.iv * A.iv * A.t) / (B.t - A.t);
  if (fv < 0) return { fwd: null, inverted: true };
  return { fwd: Math.sqrt(fv), inverted: false };
}
