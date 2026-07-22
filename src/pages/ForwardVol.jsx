import { useMemo, useState } from 'react';
import { legMetrics, forwardVol } from '../lib/optionMath';

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const dol = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');

function LegInput({ tag, cheaper, dte, setDte, k, setK, s, setS }) {
  return (
    <div className={cheaper ? 'fv-leg cheaper' : 'fv-leg'}>
      <div className="fv-leg-tag">
        {tag}
        {cheaper && <span className="fv-cheap-badge">Cheaper</span>}
      </div>
      <div className="fv-field">
        <label>Days to expiry</label>
        <input type="text" inputMode="decimal" value={dte} onChange={(e) => setDte(e.target.value)} />
      </div>
      <div className="fv-grid2">
        <div className="fv-field">
          <label>Strike</label>
          <input type="text" inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} />
        </div>
        <div className="fv-field">
          <label>Straddle $</label>
          <input type="text" inputMode="decimal" value={s} onChange={(e) => setS(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function MetricCol({ name, m }) {
  return (
    <div className="fv-col">
      <div className="fv-colhead">
        <span>{name}</span>
        <span className="fv-iv">{m.iv === null ? '—' : pct(m.iv)}</span>
      </div>
      <div className="fv-metric"><span className="k">Straddle</span><span className="v">{dol(m.strad)}</span></div>
      <div className="fv-metric"><span className="k">Time value</span><span className="v">{dol(m.tv)}</span></div>
      <div className="fv-metric"><span className="k">Implied vol</span><span className="v">{m.iv === null ? 'below intr.' : pct(m.iv)}</span></div>
      <div className="fv-metric"><span className="k">Break-even</span><span className="v">{m.beLo.toFixed(2)} / {m.beHi.toFixed(2)}</span></div>
      <div className="fv-metric"><span className="k">Move by exp</span><span className="v">±{(m.beMove * 100).toFixed(1)}%</span></div>
      <div className="fv-metric"><span className="k">1-day 1σ</span><span className="v">{m.dailyMove === null ? '—' : `±${(m.dailyMove * 100).toFixed(1)}%`}</span></div>
    </div>
  );
}

export default function ForwardVol() {
  const [spot, setSpot] = useState('10.30');
  const [dteA, setDteA] = useState('2');
  const [kA, setKA] = useState('10.5');
  const [sA, setSA] = useState('0.36');
  const [dteB, setDteB] = useState('4');
  const [kB, setKB] = useState('10.5');
  const [sB, setSB] = useState('0.395');
  const [rv, setRv] = useState('35');

  const model = useMemo(() => {
    const S = parseFloat(spot);
    const A = legMetrics(S, parseFloat(kA), parseFloat(dteA), parseFloat(sA));
    const B = legMetrics(S, parseFloat(kB), parseFloat(dteB), parseFloat(sB));
    const rvIn = parseFloat(rv);
    const rvFore = Number.isNaN(rvIn) ? null : rvIn / 100;
    const { fwd, inverted } = forwardVol(A, B);
    const daysDiff = parseFloat(dteB) - parseFloat(dteA);
    return { S, A, B, rvFore, fwd, inverted, daysDiff };
  }, [spot, dteA, kA, sA, dteB, kB, sB, rv]);

  const { A, B, rvFore, fwd, inverted, daysDiff } = model;
  const bothValid = A.iv !== null && B.iv !== null;
  const aCheaper = bothValid && A.iv < B.iv;
  const bCheaper = bothValid && B.iv < A.iv;

  // Verdict
  let verdict;
  if (bothValid) {
    const cheaper = aCheaper ? 'Near' : bCheaper ? 'Far' : 'Neither';
    const gap = Math.abs(A.iv - B.iv) * 100;
    verdict = {
      cls: 'cheap',
      body: (
        <>
          <b>{cheaper} expiry is cheaper on vol</b> — {pct(Math.min(A.iv, B.iv))} vs {pct(Math.max(A.iv, B.iv))} ({gap.toFixed(1)} pt spread).{' '}
          {A.iv > B.iv
            ? 'Term structure in backwardation: the front carries the gamma/event premium.'
            : 'Term structure in contango: the front is the cheaper gamma.'}
        </>
      ),
    };
  } else {
    verdict = {
      cls: 'rich',
      body: (
        <>
          <b>One leg is at/below intrinsic</b> — that bid/ask is a defensive quote, not a real vol. Use mids on liquid ATM strikes.
        </>
      ),
    };
  }

  // Forward-vol hero
  let heroBig;
  let heroNote;
  if (fwd !== null) {
    heroBig = (
      <>
        {pct(fwd)} <span>vol · days {dteA}→{dteB}</span>
      </>
    );
    const base = (
      <>
        The back window prices <b>{pct(fwd)}</b> annualized — that&apos;s what the extra {daysDiff} day(s) actually cost you.
      </>
    );
    if (rvFore !== null) {
      const edge = rvFore - fwd;
      if (edge > 0.01) {
        heroNote = (
          <>
            {base} You expect <b>{pct(rvFore)}</b> realized → the marginal days are <b className="c-mint">cheap by {(edge * 100).toFixed(1)} vol pts</b>. Extending to the far expiry is +EV.
          </>
        );
      } else if (edge < -0.01) {
        heroNote = (
          <>
            {base} You expect <b>{pct(rvFore)}</b> realized → the marginal days are <b className="c-rich">rich by {(-edge * 100).toFixed(1)} vol pts</b>. The near expiry is the better buy.
          </>
        );
      } else {
        heroNote = (
          <>
            {base} That&apos;s roughly in line with your <b>{pct(rvFore)}</b> forecast — a wash between the two.
          </>
        );
      }
    } else {
      heroNote = <>{base} Enter a realized-vol forecast above to get the cheap/rich call.</>;
    }
  } else if (inverted) {
    heroBig = <>inverted <span>· back window ≈ 0 vol</span></>;
    heroNote = (
      <>
        The far expiry prices <b>less total variance</b> than the near one — extreme front-loading (usually a data glitch or a stale far quote). Recheck the far straddle.
      </>
    );
  } else {
    heroBig = '—';
    heroNote = <>Need a valid IV on both legs (straddle above intrinsic) and far DTE &gt; near DTE.</>;
  }

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Options · Volatility</p>
        <h1 className="page-title">Forward Vol</h1>
        <p className="page-lede">
          Compare two option expiries on volatility instead of dollars. The tool solves each straddle&apos;s implied
          vol and extracts the forward vol between them — the true marginal cost of the extra days.
        </p>
      </section>

      <section className="container forward-vol-shell">
        <article className="panel fv-panel">
          <div className="fv-spot-row">
            <label>Spot (underlying mid)</label>
            <input type="text" inputMode="decimal" value={spot} onChange={(e) => setSpot(e.target.value)} />
          </div>

          <div className="fv-legs">
            <LegInput tag="Near expiry" cheaper={aCheaper} dte={dteA} setDte={setDteA} k={kA} setK={setKA} s={sA} setS={setSA} />
            <LegInput tag="Far expiry" cheaper={bCheaper} dte={dteB} setDte={setDteB} k={kB} setK={setKB} s={sB} setS={setSB} />
          </div>

          <div className="fv-spot-row">
            <label>Your realized-vol forecast % · optional, drives the edge call</label>
            <input type="text" inputMode="decimal" placeholder="e.g. 35" value={rv} onChange={(e) => setRv(e.target.value)} />
          </div>

          <div className={`fv-verdict ${verdict.cls}`}>{verdict.body}</div>

          <div className="fv-hero">
            <div className="fv-hero-lab">Forward vol · marginal days</div>
            <div className="fv-hero-big">{heroBig}</div>
            <div className="fv-hero-note">{heroNote}</div>
          </div>

          <div className="fv-out">
            <MetricCol name={`Near · ${dteA}d`} m={A} />
            <MetricCol name={`Far · ${dteB}d`} m={B} />
          </div>

          <p className="fv-foot">
            IV is solved from the straddle via Black–Scholes at your strike (moneyness handled, so a strike off spot is
            fine). Forward vol assumes variance adds in time: σ_fwd = √[(σ_B²·t_B − σ_A²·t_A)/(t_B − t_A)]. Uses calendar
            days / 365, r = 0. Day-count and mid vs. traded fills will shift the absolutes; the near-vs-far comparison is
            what&apos;s robust. Not advice.
          </p>
        </article>
      </section>
    </>
  );
}
