import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Sigma, Target } from 'lucide-react';
import { priceFromYield, solveYtm, durationAndConvexity, money, pct } from '../lib/bondMath';
import { ChartTooltip, CashFlowTooltip } from './Tooltips';

export function CalculatorPanel({ bond, setBond }) {
  const { face, coupon, years, yieldPct: yieldInput, frequency } = bond;
  const setField = (key) => (value) => setBond((prev) => ({ ...prev, [key]: value }));
  const price = priceFromYield({ face, couponRate: coupon / 100, years, ytm: yieldInput / 100, frequency });
  const solvedYtm = solveYtm({ face, couponRate: coupon / 100, years, price, frequency });
  const metrics = durationAndConvexity({ face, couponRate: coupon / 100, years, ytm: yieldInput / 100, frequency });
  const dv01 = (price * metrics.modified) / 10000;
  const yieldMaintenance = price - face; // new value minus starting face value
  const priceYieldData = Array.from({ length: 13 }, (_, i) => {
    const y = Math.max(0.25, yieldInput - 3 + i * 0.5);
    return { ytm: y.toFixed(2), price: priceFromYield({ face, couponRate: coupon / 100, years, ytm: y / 100, frequency }) };
  });

  return (
    <article id="calculator" className="panel calculator-panel">
      <div className="panel-header">
        <div>
          <h3>Price ↔ Yield Calculator</h3>
          <p>Change inputs and watch price, duration, and convexity update.</p>
        </div>
        <Sigma className="panel-icon" />
      </div>
      <div className="input-grid">
        <CommaField label="Face" value={face} setValue={setField('face')} />
        <NumberField label="Coupon %" value={coupon} setValue={setField('coupon')} step="0.05" />
        <NumberField label="Maturity Years" value={years} setValue={setField('years')} step="1" />
        <NumberField label="Yield %" value={yieldInput} setValue={setField('yieldPct')} step="0.05" />
        <label className="number-field">
          <span>Frequency</span>
          <select value={frequency} onChange={(e) => setField('frequency')(Number(e.target.value))}>
            <option value={1}>Annual</option>
            <option value={2}>Semiannual</option>
            <option value={4}>Quarterly</option>
            <option value={12}>Monthly</option>
          </select>
        </label>
      </div>
      <div className="metric-grid">
        <Metric label="Price" value={`$${money(price)}`} />
        <Metric label="Yield Maintenance Fee" value={`${yieldMaintenance < 0 ? '−' : ''}$${money(Math.abs(yieldMaintenance))}`} />
        <Metric label="Solved YTM" value={pct(solvedYtm * 100)} />
        <Metric label="Modified Duration" value={metrics.modified.toFixed(2)} />
        <Metric label="DV01" value={`$${dv01.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`} />
        <Metric label="Convexity" value={metrics.convexity.toFixed(2)} />
        <Metric label="Macaulay" value={metrics.macaulay.toFixed(2)} />
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={priceYieldData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" />
          <XAxis dataKey="ytm" tickFormatter={(v) => `${v}%`} tick={{ fill: '#c7d1cc', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            width={64}
            tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
            tick={{ fill: '#c7d1cc', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={([min, max]) => [min - (max - min) * 0.12, max + (max - min) * 0.12]}
          />
          <Tooltip content={<ChartTooltip label="Price" prefix="$" />} />
          <Line type="monotone" dataKey="price" stroke="#f4c76b" strokeWidth={3} dot={false} />
          <ReferenceLine x={yieldInput.toFixed(2)} stroke="#84e6b3" strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </article>
  );
}

export function CashFlowPanel({ bond }) {
  const { face, coupon, years, yieldPct, frequency } = bond;
  const wholeYears = Math.max(1, Math.round(years));
  const cashFlows = Array.from({ length: wholeYears }, (_, i) => ({
    year: String(i + 1),
    coupon: (face * coupon) / 100,
    principal: i + 1 === wholeYears ? face : 0,
  }));
  const metrics = durationAndConvexity({ face, couponRate: coupon / 100, years: wholeYears, ytm: yieldPct / 100, frequency });
  const durationYear = Math.min(wholeYears, Math.max(1, Math.round(metrics.macaulay)));
  return (
    <article className="panel side-panel">
      <div className="panel-header">
        <div>
          <h3>Cash Flow Timeline</h3>
          <p>Live view of the calculator bond&apos;s coupons and principal.</p>
        </div>
        <CircleDollarSign className="panel-icon gold" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={cashFlows} margin={{ top: 20, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#c7d1cc', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CashFlowTooltip />} />
          <ReferenceLine x={String(durationYear)} stroke="#f4c76b" strokeDasharray="4 4" label={{ value: `Duration ≈ ${metrics.macaulay.toFixed(1)}y`, fill: '#f4c76b', fontSize: 11, position: 'top' }} />
          <Bar dataKey="coupon" stackId="a" fill="#84e6b3" radius={[4, 4, 0, 0]} />
          <Bar dataKey="principal" stackId="a" fill="#f4c76b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="insight-box compact"><Target size={18} />Duration works like the cash-flow “center of mass.” Principal-heavy final payments pull duration toward maturity.</div>
    </article>
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
