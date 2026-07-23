import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, CalendarDays, LineChart, TrendingDown, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MATURITIES } from '../lib/bondMath';
import { ChartTooltip } from '../components/Tooltips';

export default function Home({ activeCurve }) {
  const spread2s10s = Math.round((activeCurve.y10 - activeCurve.y2) * 100);
  const curveShape = spread2s10s > 25 ? 'steep' : spread2s10s < 0 ? 'inverted' : 'flat';

  return (
    <>
      <Hero activeCurve={activeCurve} curveShape={curveShape} spread2s10s={spread2s10s} />

      <section id="tools" className="container section-title-row">
        <div>
          <p className="eyebrow">Interactive Calculators</p>
          <h2>Bond math tools built for practitioners.</h2>
        </div>
      </section>

      <section className="tool-grid container">
        <ToolCard as={Link} to="/duration-price" icon={<Calculator />} title="Duration &amp; Price" text="Solve price, yield, premium/discount, Macaulay duration, modified duration, and convexity — plus the interactive duration explorer." />
        <ToolCard as={Link} to="/roll-yield" icon={<TrendingDown />} title="Roll Yield" text="Break carry into its two pieces — the level you earn holding the bond, and the roll-down gain as it slides down an upward-sloping curve." />
        <ToolCard as={Link} to="/day-count" icon={<CalendarDays />} title="Day Count Accrual" text="Accrued interest across Act/Act, 30/360, and Act/360 conventions, with a clean vs. dirty price explainer." />
        <ToolCard as={Link} to="/steepness" icon={<LineChart />} title="Steepness &amp; History" text="Rank today's curve shape against decades of history — 2s10s and other spreads in interactive percentile context." />
        <ToolCard as={Link} to="/forward-vol" icon={<Waves />} title="Forward Vol" text="Compare straddle pricing across expiries to back out forward volatility along the options term structure." />
      </section>

    </>
  );
}

function Hero({ activeCurve, curveShape, spread2s10s }) {
  const miniData = MATURITIES.map((m) => ({ x: m.label, y: activeCurve[m.key] }));
  return (
    <section id="home" className="hero container">
      <div className="hero-copy">
        <p className="pill">LEARN • VISUALIZE • CALCULATE</p>
        <h1>Bond Math</h1>
        <p className="hero-heading-subtitle">Calculate Better Decisions</p>
        <p className="hero-subtitle">
          Interactive treasury curve history, bond calculators, duration visuals, and fixed income explainers in one practitioner-friendly workspace.
        </p>
      </div>
      <div className="hero-visual" aria-label="Yield curve visualization">
        <div className="orb" />
        <div className="curve-card-large">
          <div className="hero-chart-header">
            <div>
              <span>US Treasury Curve</span>
              <strong>{activeCurve.date}</strong>
            </div>
            <div className="shape-badge">{curveShape}</div>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={miniData} margin={{ top: 20, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="mintFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8ff0bf" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#8ff0bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="x" tick={{ fill: '#b8c6c0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={['dataMin - .25', 'dataMax + .25']} />
              <Tooltip content={<ChartTooltip label="Yield" suffix="%" />} />
              <Area type="monotone" dataKey="y" stroke="#f4c76b" strokeWidth={3} fill="url(#mintFill)" dot={{ r: 4, fill: '#8ff0bf' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="hero-stat-row">
            <span>2s10s Spread</span>
            <strong>{spread2s10s} bps</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolCard({ icon, title, text, as: Component = 'article', ...rest }) {
  return (
    <Component className="tool-card" {...rest}>
      <div className="tool-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </Component>
  );
}

