import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BookOpen, Calculator, Sparkles, Target, WalletCards } from 'lucide-react';
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
          <h2>Bond math tools built for actual workflow.</h2>
        </div>
        <Link className="ghost-link" to="/#reference">View reference library <ArrowRight size={16} /></Link>
      </section>

      <section className="tool-grid container">
        <ToolCard as={Link} to="/duration-price" icon={<Calculator />} title="Duration &amp; Price" text="Solve price, yield, premium/discount, Macaulay duration, modified duration, and convexity — plus the interactive duration explorer." />
        <ToolCard icon={<Target />} title="Yield-to-Call / Worst" text="Framework placeholder for call schedules and worst-case yield logic across maturity and call dates." />
        <ToolCard icon={<Sparkles />} title="OAS Lab" text="Callable-bond option spread concept area: add rates paths, vol assumptions, and model spread after you connect your data." />
        <ToolCard icon={<WalletCards />} title="Accrued Interest" text="Day count toggles for Act/Act, 30/360, and Act/360 with clean vs. dirty price explainer." />
      </section>

      <section id="reference" className="container reference-shell">
        <div className="reference-copy">
          <p className="eyebrow">Practical Reference Content</p>
          <h2>Practitioner-first fixed income notes.</h2>
          <p>
            Use this section for SEO content: bond terms, day count conventions, duration intuition,
            CFA / Series 7 prep, and first-principles explainers written in a practical tone.
          </p>
        </div>
        <div className="reference-list">
          {[
            'Clean price vs. dirty price with live accrued interest numbers',
            'Day count convention cheat sheet: Act/Act, 30/360, Act/360',
            'Duration as center of mass: why the timing of cash flows matters',
            'Bond math from first principles: cash flows, discounting, and yields',
          ].map((item) => (
            <div className="reference-item" key={item}>
              <BookOpen size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <CTA />
    </>
  );
}

function Hero({ activeCurve, curveShape, spread2s10s }) {
  const miniData = MATURITIES.map((m) => ({ x: m.label, y: activeCurve[m.key] }));
  return (
    <section id="home" className="hero container">
      <div className="hero-copy">
        <p className="pill">LEARN BONDS WITH CLARITY</p>
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

function CTA() {
  return (
    <section className="container cta">
      <div className="brand-mark large">BM</div>
      <div><h2>Ready to make bond math intuitive?</h2><p>Connect your Treasury history sheet, refine the calculators, and turn this into a fixed income learning product.</p></div>
      <Link className="primary-btn" to="/duration-price">Start Building <ArrowRight size={18} /></Link>
    </section>
  );
}
