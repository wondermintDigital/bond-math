import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowBigDown, ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import { CurveTooltip } from './Tooltips';

// Pads the y-axis by 0.50% on each side, rounded to the nearest 0.10%,
// so the curve always has graphical cushion above and below.
const yAxisDomain = ([dataMin, dataMax]) => [
  Math.round((dataMin - 0.5) * 10) / 10,
  Math.round((dataMax + 0.5) * 10) / 10,
];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default function YieldCurvePanel({ curves, curveIndex, setCurveIndex, data, activeCurve, latestCurve, spread2s10s, curveShape, steepnessPercentile, source }) {
  const showToday = activeCurve.date !== latestCurve.date;
  const lastIndex = Math.max(curves.length - 1, 1);
  const sliderFrac = curveIndex / lastIndex;
  // Center the arrow on the range thumb: thumb center is inset by half its
  // width (~16px) at the ends, so nudge by 16*(0.5 - frac).
  const arrowLeft = `calc(${sliderFrac * 100}% + ${(0.5 - sliderFrac) * 16}px)`;
  return (
    <article id="curve" className="panel curve-panel">
      <div className="panel-header">
        <div>
          <h3>US Treasury Yield Curve</h3>
          <p>Drag the slider to move through historical curve dates.</p>
        </div>
        <div className="spread-chip">
          <span>2s10s Spread</span>
          <strong>{spread2s10s} bps</strong>
          <em>{curveShape.toUpperCase()}: {ordinal(steepnessPercentile)} Percentile Steepness*</em>
        </div>
        <div className="date-hint-wrap">
          <button className="small-select" type="button">{activeCurve.date}<ChevronDown size={14} /></button>
          <span className="date-hint" role="tooltip">to change date change slider below</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 20, right: 18, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" />
          <XAxis dataKey="maturity" tick={{ fill: '#c7d1cc', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fill: '#c7d1cc', fontSize: 12 }} axisLine={false} tickLine={false} domain={yAxisDomain} />
          <Tooltip content={<CurveTooltip latestDate={latestCurve.date} showToday={showToday} />} />
          {showToday && (
            <Line type="monotone" dataKey="today" stroke="rgba(214,222,218,0.35)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          )}
          <Line type="monotone" dataKey="yield" stroke="#84e6b3" strokeWidth={3} dot={{ r: 5, fill: '#84e6b3', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
      {showToday && (
        <div className="curve-legend">
          <span><i className="swatch mint" />{activeCurve.date}</span>
          <span><i className="swatch grey" />Today ({latestCurve.date})</span>
        </div>
      )}
      <div className="slider-shell">
        <span className="slider-arrow" style={{ left: arrowLeft }} aria-hidden="true">
          <ArrowBigDown size={26} strokeWidth={2.25} />
        </span>
        <input type="range" min="0" max={curves.length - 1} value={curveIndex} onChange={(e) => setCurveIndex(Number(e.target.value))} />
        <div className="slider-labels"><span>{curves[0]?.date}</span><span>{curves[curves.length - 1]?.date}</span></div>
      </div>
      <div className="insight-box">
        <LineChartIcon size={18} />
        <span>The curve is currently <strong>{curveShape}</strong>. 10Y - 2Y spread: <strong>{spread2s10s} bps</strong>. Source: {source}.</span>
      </div>
      <p className="footnote">
        *Steepness percentile ranks the selected date&apos;s 2s10s spread against every curve in the loaded dataset ({curves[0]?.date} to {curves[curves.length - 1]?.date}).
      </p>
    </article>
  );
}
