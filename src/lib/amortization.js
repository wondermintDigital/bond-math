// Level-payment loan amortization with two prepayment conventions.
//
//   'cpr'   — prepay an annual percentage of the balance, applied pro-rata each
//             period. The payment is re-solved on the reduced balance every
//             period, so the loan still matures on its original date and the
//             payment shrinks instead of the term shortening.
//   'extra' — add a fixed dollar amount to every payment. The payment stays
//             level and the loan pays off ahead of schedule.

export const PAY_FREQUENCIES = [
  { label: 'Annual', frequency: 1 },
  { label: 'Semiannual', frequency: 2 },
  { label: 'Quarterly', frequency: 4 },
  { label: 'Monthly', frequency: 12 },
];

// Level payment that retires `balance` over `n` periods at periodic rate `i`.
export function periodPayment(balance, i, n) {
  if (n <= 0 || balance <= 0) return 0;
  if (i === 0) return balance / n;
  return (balance * i) / (1 - Math.pow(1 + i, -n));
}

// Adds whole months to an ISO date, clamping the day to the target month's length
// (so the 31st rolls to the 30th/28th rather than spilling into the next month).
function addMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { y: year, m: month + 1, d: Math.min(d, lastDay) };
}

export const fmtDate = ({ y, m, d }) => `${m}/${d}/${y}`;

export function buildSchedule({ amount, ratePct, years, frequency, prepayMode, prepayPct, prepayAmount, startDate }) {
  const i = ratePct / 100 / frequency;
  const n = Math.max(1, Math.round(years * frequency));
  const monthsPerPeriod = 12 / frequency;
  const levelPayment = periodPayment(amount, i, n);
  const prepayRate = Math.max(0, prepayPct) / 100 / frequency;
  const extra = Math.max(0, prepayAmount);

  const rows = [];
  let balance = amount;

  for (let t = 1; t <= n && balance > 0.005; t++) {
    const beginning = balance;
    const interest = beginning * i;
    const remaining = n - t + 1;

    // In 'cpr' mode the payment is re-amortized over the periods that remain.
    let payment = prepayMode === 'cpr' ? periodPayment(beginning, i, remaining) : levelPayment;
    let scheduled = payment - interest;
    if (scheduled > beginning) scheduled = beginning; // final period
    if (scheduled < 0) scheduled = 0; // guard against negative amortization
    payment = interest + scheduled;

    // A prepayment can only retire whatever scheduled principal left behind.
    const room = beginning - scheduled;
    const prepay = Math.min(prepayMode === 'cpr' ? beginning * prepayRate : extra, room);

    const ending = beginning - scheduled - prepay;
    rows.push({
      period: t,
      date: addMonths(startDate, Math.round(t * monthsPerPeriod)),
      beginning,
      payment,
      interest,
      scheduled,
      prepay,
      principalCF: scheduled + prepay,
      ending,
    });
    balance = ending;
  }

  const sum = (key) => rows.reduce((acc, r) => acc + r[key], 0);
  const totalPrincipal = sum('principalCF');
  const totalInterest = sum('interest');

  // Weighted average life: each principal cash flow weighted by when it arrives.
  const wal = totalPrincipal > 0
    ? rows.reduce((acc, r) => acc + r.principalCF * (r.period / frequency), 0) / totalPrincipal
    : 0;

  return {
    rows,
    summary: {
      initialPayment: rows[0]?.payment ?? 0,
      totalInterest,
      totalPrepaid: sum('prepay'),
      totalPaid: totalPrincipal + totalInterest,
      wal,
      payoffPeriods: rows.length,
      payoffYears: rows.length / frequency,
      scheduledPeriods: n,
    },
  };
}

// Wraps a field in quotes only when it contains a comma, quote, or newline.
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csvRow = (cells) => cells.map(csvCell).join(',');
// Plain 2dp numbers — no $ or thousands separators, so spreadsheets parse them as numbers.
const csvNum = (v) => Number(v).toFixed(2);

// Assumptions and results block on top, then the full schedule — mirroring the
// layout of the spreadsheet this model came from.
export function scheduleToCsv({ rows, summary, loan }) {
  const frequencyLabel = PAY_FREQUENCIES.find((f) => f.frequency === loan.frequency)?.label ?? loan.frequency;
  const isCpr = loan.prepayMode === 'cpr';

  const lines = [
    csvRow(['Bond Math — Amortization Schedule']),
    csvRow(['Loan Amount', csvNum(loan.amount)]),
    csvRow(['Fixed Rate %', csvNum(loan.ratePct)]),
    csvRow(['Years', loan.years]),
    csvRow(['Payment Frequency', frequencyLabel]),
    csvRow(['First Payment From', loan.startDate]),
    csvRow(['Prepayment Style', isCpr ? 'Annual % of balance (re-amortized)' : 'Extra $ per payment (level)']),
    csvRow([isCpr ? 'Prepayment % / yr' : 'Extra $ / Payment', csvNum(isCpr ? loan.prepayPct : loan.prepayAmount)]),
    '',
    csvRow(['Initial Payment', csvNum(summary.initialPayment)]),
    csvRow(['Total Interest', csvNum(summary.totalInterest)]),
    csvRow(['Total Prepaid', csvNum(summary.totalPrepaid)]),
    csvRow(['Weighted Average Life (yrs)', csvNum(summary.wal)]),
    csvRow(['Payoff (yrs)', csvNum(summary.payoffYears)]),
    '',
    csvRow(['#', 'Date', 'Beginning Balance', 'Payment', 'Interest', 'Principal', 'Prepay', 'Principal CF', 'Ending Balance']),
    ...rows.map((r) => csvRow([
      r.period,
      fmtDate(r.date),
      csvNum(r.beginning),
      csvNum(r.payment),
      csvNum(r.interest),
      csvNum(r.scheduled),
      csvNum(r.prepay),
      csvNum(r.principalCF),
      csvNum(r.ending),
    ])),
  ];

  const totalScheduled = rows.reduce((acc, r) => acc + r.scheduled, 0);
  lines.push(csvRow([
    'Total', '', '', '',
    csvNum(summary.totalInterest),
    csvNum(totalScheduled),
    csvNum(summary.totalPrepaid),
    csvNum(totalScheduled + summary.totalPrepaid),
    '',
  ]));

  return lines.join('\r\n');
}

export function csvFilename(loan) {
  const style = loan.prepayMode === 'cpr' ? `cpr${loan.prepayPct}pct` : `extra${loan.prepayAmount}`;
  return `amortization-${loan.amount}-${loan.ratePct}pct-${loan.years}y-${style}.csv`;
}

// Collapses the period-level schedule into one stacked bar per year.
export function yearlyBuckets(rows, frequency) {
  const buckets = new Map();
  rows.forEach((r) => {
    const year = Math.ceil(r.period / frequency);
    const bucket = buckets.get(year) || { year: String(year), interest: 0, principal: 0, prepay: 0 };
    bucket.interest += r.interest;
    bucket.principal += r.scheduled;
    bucket.prepay += r.prepay;
    buckets.set(year, bucket);
  });
  return [...buckets.values()];
}
