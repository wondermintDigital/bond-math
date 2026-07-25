import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Download, Sigma } from 'lucide-react';
import { buildSchedule, yearlyBuckets, fmtDate, scheduleToCsv, csvFilename, PAY_FREQUENCIES } from '../lib/amortization';
import { AmortTooltip } from '../components/Tooltips';

const PREPAY_MODES = [
  { key: 'cpr', label: 'Annual % of balance' },
  { key: 'extra', label: 'Extra $ per payment' },
];

const dollars = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
const cents = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function Amortization() {
  const [loan, setLoan] = useState({
    amount: 100000,
    ratePct: 8,
    years: 10,
    frequency: 2,
    prepayMode: 'cpr',
    prepayPct: 8,
    prepayAmount: 0,
    startDate: today(),
  });
  const set = (key) => (value) => setLoan((prev) => ({ ...prev, [key]: value }));
  const isCpr = loan.prepayMode === 'cpr';

  const { rows, summary } = useMemo(() => buildSchedule(loan), [loan]);
  // Same loan with prepayments switched off, so we can price what they saved.
  const baseline = useMemo(
    () => buildSchedule({ ...loan, prepayPct: 0, prepayAmount: 0 }),
    [loan]
  );
  const chartData = useMemo(() => yearlyBuckets(rows, loan.frequency), [rows, loan.frequency]);

  const interestSaved = baseline.summary.totalInterest - summary.totalInterest;

  const downloadCsv = () => {
    // Leading BOM so Excel on Windows reads it as UTF-8 rather than mangling the em dash.
    const blob = new Blob(['﻿', scheduleToCsv({ rows, summary, loan })], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvFilename(loan);
    link.click();
    URL.revokeObjectURL(url);
  };

  const walYear = Math.min(chartData.length, Math.max(1, Math.round(summary.wal)));
  const hasPrepay = summary.totalPrepaid > 0.5;

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Amortization</p>
        <h1 className="page-title">Loan and Bond Amortization Schedules</h1>
        <p className="page-lede">
          Set the rate, term, and payment frequency to build a level-payment schedule. Layer on a prepayment
          either as an annual percentage of the balance — which re-amortizes the payment and holds the maturity
          date — or as a flat dollar add-on that keeps the payment level and retires the loan early.
        </p>
      </section>

      <section className="dashboard-grid container">
        <article className="panel amort-inputs">
          <div className="panel-header">
            <div>
              <h3>Loan Terms</h3>
              <p>Every result below updates as you type.</p>
            </div>
            <Sigma className="panel-icon" />
          </div>

          <div className="amort-input-grid">
            <CommaField label="Loan Amount" value={loan.amount} setValue={set('amount')} />
            <NumberField label="Fixed Rate %" value={loan.ratePct} setValue={set('ratePct')} step="0.125" />
            <NumberField label="Years" value={loan.years} setValue={set('years')} step="1" />
            <label className="number-field">
              <span>Payment Frequency</span>
              <select value={loan.frequency} onChange={(e) => set('frequency')(Number(e.target.value))}>
                {PAY_FREQUENCIES.map((f) => (
                  <option key={f.frequency} value={f.frequency}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="number-field">
              <span>First Payment From</span>
              <input type="date" value={loan.startDate} onChange={(e) => set('startDate')(e.target.value)} />
            </label>
            {isCpr ? (
              <NumberField label="Prepayment % / yr" value={loan.prepayPct} setValue={set('prepayPct')} step="0.5" />
            ) : (
              <CommaField label="Extra $ / Payment" value={loan.prepayAmount} setValue={set('prepayAmount')} />
            )}
          </div>

          <div className="amort-prepay-mode">
            <span>Prepayment style</span>
            <div className="mode-toggle" role="tablist" aria-label="Prepayment style">
              {PREPAY_MODES.map((m) => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={loan.prepayMode === m.key}
                  className={loan.prepayMode === m.key ? 'active' : ''}
                  onClick={() => set('prepayMode')(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <em>
              {isCpr
                ? 'Payment re-amortizes each period — the loan still matures on its original date.'
                : 'Payment stays level — the loan pays off ahead of schedule.'}
            </em>
          </div>

          <div className="metric-grid">
            <Metric label="Initial Payment" value={cents(summary.initialPayment)} />
            <Metric label="Total Interest" value={dollars(summary.totalInterest)} />
            <Metric label="Interest Saved" value={dollars(interestSaved)} />
            <Metric label="Total Prepaid" value={dollars(summary.totalPrepaid)} />
            <Metric label="Weighted Avg Life" value={`${summary.wal.toFixed(2)} yrs`} />
            <Metric label="Payoff" value={`${summary.payoffYears.toFixed(2)} yrs`} />
          </div>
        </article>

        <article className="panel side-panel">
          <div className="panel-header">
            <div>
              <h3>Payment Composition</h3>
              <p>Interest, scheduled principal, and prepayments by year.</p>
            </div>
            <CircleDollarSign className="panel-icon gold" />
          </div>
          <ResponsiveContainer width="100%" height={390}>
            <BarChart data={chartData} margin={{ top: 20, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#c7d1cc', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<AmortTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <ReferenceLine
                x={String(walYear)}
                stroke="#f4c76b"
                strokeDasharray="4 4"
                label={{ value: `WAL ≈ ${summary.wal.toFixed(1)}y`, fill: '#f4c76b', fontSize: 11, position: 'top' }}
              />
              <Bar dataKey="interest" stackId="a" fill="#84e6b3" radius={[0, 0, 0, 0]} />
              <Bar dataKey="principal" stackId="a" fill="#f4c76b" radius={hasPrepay ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              <Bar dataKey="prepay" stackId="a" fill="#b98732" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="curve-legend amort-legend">
            <span><i className="swatch mint" />Interest</span>
            <span><i className="swatch gold" />Principal</span>
            <span><i className="swatch gold-dark" />Prepay</span>
          </div>
        </article>
      </section>

      <section className="container learning-section">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Amortization Schedule</h3>
              <p>{rows.length} payments · {PAY_FREQUENCIES.find((f) => f.frequency === loan.frequency)?.label.toLowerCase()}</p>
            </div>
            <button className="csv-btn" onClick={downloadCsv}>
              <Download size={15} />Export CSV
            </button>
          </div>
          <div className="amort-table-wrap">
            <table className="amort-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Beginning Balance</th>
                  <th>Payment</th>
                  <th>Interest</th>
                  <th>Principal</th>
                  <th>Prepay</th>
                  <th>Principal CF</th>
                  <th>Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period}>
                    <td>{r.period}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{dollars(r.beginning)}</td>
                    <td>{dollars(r.payment)}</td>
                    <td>{dollars(r.interest)}</td>
                    <td>{dollars(r.scheduled)}</td>
                    <td>{dollars(r.prepay)}</td>
                    <td className="amort-cf">{dollars(r.principalCF)}</td>
                    <td>{dollars(r.ending)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total</td>
                  <td>{dollars(summary.totalInterest)}</td>
                  <td>{dollars(summary.totalPaid - summary.totalInterest - summary.totalPrepaid)}</td>
                  <td>{dollars(summary.totalPrepaid)}</td>
                  <td className="amort-cf">{dollars(summary.totalPaid - summary.totalInterest)}</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}

function NumberField({ label, value, setValue, step }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input type="number" value={value} step={step} onChange={(e) => setValue(Number(e.target.value))} />
    </label>
  );
}

// Whole-dollar input displayed with thousands separators (e.g. 1,000,000).
function CommaField({ label, value, setValue }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value.toLocaleString('en-US')}
        onChange={(e) => setValue(Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
      />
    </label>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
