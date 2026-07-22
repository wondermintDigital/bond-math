import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DAY_COUNTS, parseISO, actualDays, days30360, money } from '../lib/bondMath';

// Local-date ISO string (YYYY-MM-DD) for a Date, avoiding UTC timezone shifts.
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = new Date();
const oneYearOut = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

export default function DayCountAccrual() {
  const [methodKey, setMethodKey] = useState('act360');
  const [rate, setRate] = useState(5.0);
  const [start, setStart] = useState(toISO(today));
  const [end, setEnd] = useState(toISO(oneYearOut));
  const [notional, setNotional] = useState(1000000);

  const { s, e, valid } = useMemo(() => {
    const s = parseISO(start);
    const e = parseISO(end);
    const valid =
      Number.isFinite(actualDays(s, e)) && actualDays(s, e) > 0;
    return { s, e, valid };
  }, [start, end]);

  // Year fraction and the equivalent rate for every convention. Equivalence preserves the
  // accrued interest: rate_selected × τ_selected = rate_other × τ_other, so a shorter year
  // fraction needs a higher rate to accrue the same dollars.
  const rows = useMemo(() => {
    if (!valid) return DAY_COUNTS.map((dc) => ({ ...dc, tau: NaN, equiv: NaN }));
    const tau = Object.fromEntries(DAY_COUNTS.map((dc) => [dc.key, dc.yearFrac(s, e)]));
    const selTau = tau[methodKey];
    return DAY_COUNTS.map((dc) => ({
      ...dc,
      tau: tau[dc.key],
      equiv: dc.key === methodKey ? Number(rate) : (Number(rate) * selTau) / tau[dc.key],
    }));
  }, [valid, s, e, methodKey, rate]);

  const days = valid ? actualDays(s, e) : 0;
  const days360 = valid ? days30360(s, e) : 0;
  const selTau = rows.find((r) => r.key === methodKey)?.tau;
  // Accrued interest is identical across conventions by construction.
  const accrued = valid ? (notional * (Number(rate) / 100) * selTau) : 0;
  const selMethod = DAY_COUNTS.find((dc) => dc.key === methodKey);

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Day Count Accrual</p>
        <h1 className="page-title">Day count accrual, converted across conventions.</h1>
        <p className="page-lede">
          A yield only means something alongside its day count convention. Pick the convention your rate is
          quoted on, enter the value, and see the equivalent yield on every other basis — the rate that accrues
          the exact same interest over the same period.
        </p>
      </section>

      <section className="container daycount-section">
        <article className="panel daycount-panel">
          <div className="panel-header">
            <div>
              <h3>Equivalent Yield Converter</h3>
              <p>Click a convention to set which basis your rate is quoted on, then type the value.</p>
            </div>
            <CalendarDays className="panel-icon gold" />
          </div>

          <div className="daycount-period">
            <label className="number-field">
              <span>Accrual Start</span>
              <input type="date" value={start} onChange={(ev) => setStart(ev.target.value)} />
            </label>
            <label className="number-field">
              <span>Accrual End</span>
              <input type="date" value={end} onChange={(ev) => setEnd(ev.target.value)} />
            </label>
            <label className="number-field">
              <span>Face / Notional</span>
              <input
                type="text"
                inputMode="numeric"
                value={notional.toLocaleString('en-US')}
                onChange={(ev) => setNotional(Math.max(0, Number(ev.target.value.replace(/[^\d]/g, '')) || 0))}
              />
            </label>
          </div>

          {!valid && <p className="daycount-warn">End date must be after the start date.</p>}

          <div className="daycount-grid">
            {rows.map((row) => {
              const active = row.key === methodKey;
              return (
                <div key={row.key} className={active ? 'daycount-col active' : 'daycount-col'}>
                  <button
                    type="button"
                    className={active ? 'daycount-method active' : 'daycount-method'}
                    aria-pressed={active}
                    onClick={() => setMethodKey(row.key)}
                  >
                    {row.label}
                  </button>
                  {active ? (
                    <div className="daycount-inputwrap">
                      <input
                        className="daycount-input"
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(ev) => setRate(ev.target.value)}
                        aria-label={`${row.label} yield`}
                      />
                      <em>%</em>
                    </div>
                  ) : (
                    <div className="daycount-value">{Number.isFinite(row.equiv) ? `${row.equiv.toFixed(3)}%` : '—'}</div>
                  )}
                  <span className="daycount-tau">
                    {Number.isFinite(row.tau) ? `τ = ${row.tau.toFixed(4)}` : ''}
                    {active ? ' · input' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="metric-grid daycount-metrics">
            <div className="metric"><span>Actual Days</span><strong>{days}</strong></div>
            <div className="metric"><span>30/360 Days</span><strong>{days360}</strong></div>
            <div className="metric">
              <span>Accrued Interest</span>
              <strong>${money(accrued)}</strong>
            </div>
          </div>

          <div className="insight-box compact">
            <CalendarDays size={18} />
            <span>
              Over {days} actual days, a <strong>{selMethod.label}</strong> yield of <strong>{Number(rate).toFixed(3)}%</strong> accrues
              the same <strong>${money(accrued)}</strong> of interest on ${notional.toLocaleString()} as each equivalent yield shown
              above. {selMethod.desc} Day count matters most on partial periods — over an exact year the four nearly converge.
            </span>
          </div>
        </article>

        <article className="panel daycount-panel daycount-uses-panel">
          <div className="panel-header">
            <div>
              <h3>Where Each Convention Is Used</h3>
              <p>The market and instrument each basis is standard for. Columns line up with the converter above.</p>
            </div>
          </div>
          <div className="daycount-uses">
            {DAY_COUNTS.map((dc) => (
              <div key={dc.key} className={dc.key === methodKey ? 'daycount-use active' : 'daycount-use'}>
                <div className="daycount-use-head">
                  <strong>{dc.label}</strong>
                  <em>{dc.alt}</em>
                </div>
                <ul>
                  {dc.uses.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
