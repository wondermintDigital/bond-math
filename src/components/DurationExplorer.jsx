import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';
import {
  MATURITIES,
  DURATION_MODES,
  priceFromYield,
  effectiveDuration,
  curveYieldAt,
  money,
  fmtTerm,
  clamp,
} from '../lib/bondMath';

const VB_W = 960;
const VB_H = 520;
const EX_M = { left: 64, right: 18, top: 18, bottom: 42 };
const EX_PLOT_W = VB_W - EX_M.left - EX_M.right;
const EX_PLOT_H = VB_H - EX_M.top - EX_M.bottom;
const EX_TERM = { min: 1, max: 30 };
const EX_RATE = { min: 0.5, max: 12 };

const termToX = (t) => EX_M.left + ((t - EX_TERM.min) / (EX_TERM.max - EX_TERM.min)) * EX_PLOT_W;
const rateToY = (r) => EX_M.top + ((EX_RATE.max - r) / (EX_RATE.max - EX_RATE.min)) * EX_PLOT_H;

export default function DurationExplorer({ curve }) {
  const [modeKey, setModeKey] = useState('bp100');
  const [notional, setNotional] = useState(100000);
  const [compare, setCompare] = useState(false);
  const [pos, setPos] = useState({ term: 10, ratePct: 7.75 });
  const [pos2, setPos2] = useState({ term: 10, ratePct: 8.75 });
  const [activeBall, setActiveBall] = useState('t0');
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);
  const dragBallRef = useRef('t0');

  const scale = Math.max(0, notional) / 100;
  const mode = DURATION_MODES.find((m) => m.key === modeKey);
  const { duration, p0, up, down } = useMemo(
    () => effectiveDuration({ years: pos.term, rate: pos.ratePct / 100, bump: mode.bump }),
    [pos, mode]
  );
  const dv01Dollars = ((p0 * duration) / 10000) * scale;
  const bumpMoveDollars = ((down - up) / 2) * scale;

  // Compare mode: reprice the T+0 par bond (coupon fixed at the T+0 rate) with the T+1
  // ball's remaining term (x-axis), discounted at the T+1 rate (y-axis).
  const t1Price = priceFromYield({ face: 100, couponRate: pos.ratePct / 100, years: pos2.term, ytm: pos2.ratePct / 100, frequency: 2 });
  const t0Value = 100 * scale;
  const t1Value = t1Price * scale;
  const pnl = t1Value - t0Value;
  const pnlPct = t1Price - 100;

  const pointToData = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VB_W;
    const py = ((e.clientY - rect.top) / rect.height) * VB_H;
    const rawTerm = EX_TERM.min + ((px - EX_M.left) / EX_PLOT_W) * (EX_TERM.max - EX_TERM.min);
    const rawRate = EX_RATE.max - ((py - EX_M.top) / EX_PLOT_H) * (EX_RATE.max - EX_RATE.min);
    return {
      px,
      py,
      term: clamp(Math.round(rawTerm * 4) / 4, EX_TERM.min, EX_TERM.max),
      ratePct: clamp(Math.round(rawRate * 20) / 20, EX_RATE.min, EX_RATE.max),
    };
  };

  const moveBall = (ball, next) => (ball === 't1' ? setPos2(next) : setPos(next));

  const onPointerDown = (e) => {
    e.preventDefault();
    const p = pointToData(e);
    let ball = 't0';
    if (compare) {
      const d0 = Math.hypot(p.px - termToX(pos.term), p.py - rateToY(pos.ratePct));
      const d1 = Math.hypot(p.px - termToX(pos2.term), p.py - rateToY(pos2.ratePct));
      ball = d1 < d0 ? 't1' : 't0';
    }
    dragBallRef.current = ball;
    setActiveBall(ball);
    moveBall(ball, { term: p.term, ratePct: p.ratePct });
    setDragging(true);
    try { svgRef.current.setPointerCapture(e.pointerId); } catch { /* synthetic events lack an active pointer */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const p = pointToData(e);
    moveBall(dragBallRef.current, { term: p.term, ratePct: p.ratePct });
  };
  const onPointerUp = () => setDragging(false);

  const onKeyDown = (ball) => (e) => {
    const stepT = e.shiftKey ? 1 : 0.25;
    const stepR = e.shiftKey ? 0.25 : 0.05;
    let { term, ratePct } = ball === 't1' ? pos2 : pos;
    if (e.key === 'ArrowLeft') term -= stepT;
    else if (e.key === 'ArrowRight') term += stepT;
    else if (e.key === 'ArrowUp') ratePct += stepR;
    else if (e.key === 'ArrowDown') ratePct -= stepR;
    else return;
    e.preventDefault();
    setActiveBall(ball);
    moveBall(ball, { term: clamp(term, EX_TERM.min, EX_TERM.max), ratePct: clamp(ratePct, EX_RATE.min, EX_RATE.max) });
  };

  const toggleCompare = (checked) => {
    setCompare(checked);
    if (checked) {
      // Start the T+1 scenario 100bp above the bond's rate so the P&L is immediately visible.
      setPos2({ term: pos.term, ratePct: clamp(pos.ratePct + 1, EX_RATE.min, EX_RATE.max) });
      setActiveBall('t1');
    } else {
      setActiveBall('t0');
    }
  };

  const t0x = termToX(pos.term);
  const t0y = rateToY(pos.ratePct);
  const t1x = termToX(pos2.term);
  const t1y = rateToY(pos2.ratePct);
  const floatBall = compare && activeBall === 't1' ? pos2 : pos;
  const bx = termToX(floatBall.term);
  const by = rateToY(floatBall.ratePct);
  const leftPct = (bx / VB_W) * 100;
  const topPct = (by / VB_H) * 100;

  // Collision-aware card placement: measure the rendered card, then pick the first
  // above/below × center/left/right slot that stays on the grid and doesn't cover
  // the other ball in compare mode.
  const floatRef = useRef(null);
  const [floatPlace, setFloatPlace] = useState({ v: 'above', h: 'center' });
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const float = floatRef.current;
    if (!svg || !float) return;
    const s = svg.getBoundingClientRect();
    const f = float.getBoundingClientRect();
    if (!s.width || !f.width) return;
    const toPx = (p) => [
      s.left + (termToX(p.term) / VB_W) * s.width,
      s.top + (rateToY(p.ratePct) / VB_H) * s.height,
    ];
    const active = compare && activeBall === 't1' ? pos2 : pos;
    const other = compare ? (activeBall === 't1' ? pos : pos2) : null;
    const [ax, ay] = toPx(active);
    const gap = 26;
    const candidates = [
      { v: 'above', h: 'center' }, { v: 'above', h: 'left' }, { v: 'above', h: 'right' },
      { v: 'below', h: 'center' }, { v: 'below', h: 'left' }, { v: 'below', h: 'right' },
    ];
    const rectFor = (c) => {
      const left = c.h === 'center' ? ax - f.width / 2 : c.h === 'left' ? ax : ax - f.width;
      const top = c.v === 'above' ? ay - gap - f.height : ay + gap;
      return { left, top, right: left + f.width, bottom: top + f.height };
    };
    const inBounds = (r) => r.left >= s.left - 4 && r.right <= s.right + 4 && r.top >= s.top - 4 && r.bottom <= s.bottom + 4;
    const keepsOtherVisible = (r) => {
      if (!other) return true;
      const [ox, oy] = toPx(other);
      const pad = (16 / VB_W) * s.width + 14; // ball radius in screen px plus glow margin
      return ox < r.left - pad || ox > r.right + pad || oy < r.top - pad || oy > r.bottom + pad;
    };
    const pick =
      candidates.find((c) => { const r = rectFor(c); return inBounds(r) && keepsOtherVisible(r); }) ||
      candidates.find((c) => inBounds(rectFor(c))) ||
      candidates[0];
    setFloatPlace((prev) => (prev.v === pick.v && prev.h === pick.h ? prev : pick));
  }, [pos, pos2, compare, activeBall, modeKey, notional]);
  const floatTransform = `translate(${floatPlace.h === 'left' ? '0%' : floatPlace.h === 'right' ? '-100%' : '-50%'}, ${floatPlace.v === 'below' ? '26px' : 'calc(-100% - 26px)'})`;

  const rateLabels = [];
  for (let r = EX_RATE.min; r <= EX_RATE.max + 1e-9; r += 0.5) rateLabels.push(Math.round(r * 10) / 10);
  const termLabels = Array.from({ length: EX_TERM.max - EX_TERM.min + 1 }, (_, i) => EX_TERM.min + i);
  const termLabel = fmtTerm(pos.term);

  // Today's Treasury curve, interpolated across the grid's term range.
  const curveOverlay = useMemo(() => {
    if (!curve) return null;
    const points = [];
    for (let t = EX_TERM.min; t <= EX_TERM.max + 1e-9; t += 0.5) {
      const y = curveYieldAt(curve, t);
      if (!Number.isFinite(y)) return null;
      points.push(`${termToX(t).toFixed(1)},${rateToY(clamp(y, EX_RATE.min, EX_RATE.max)).toFixed(1)}`);
    }
    const knots = MATURITIES.filter((m) => m.years >= EX_TERM.min && Number.isFinite(curve[m.key]))
      .map((m) => ({ x: termToX(m.years), y: rateToY(clamp(curve[m.key], EX_RATE.min, EX_RATE.max)) }));
    return { path: points.join(' '), knots };
  }, [curve]);

  return (
    <section id="explorer" className="container explorer-section">
      <article className="panel explorer-panel">
        <div className="panel-header explorer-header">
          <div>
            <p className="eyebrow">Interactive Duration Explorer</p>
            <h2>Drag the ball. Feel the duration.</h2>
            <p>Move across term (x-axis) and rate (y-axis) to see the effective duration of a par bond. Toggle the yield bump used to measure it, or turn on gain / loss comparison to reprice your bond at a T+1 discount rate.</p>
          </div>
          <div className="explorer-controls">
            <div className="mode-toggle" role="tablist" aria-label="Duration bump size">
              {DURATION_MODES.map((m) => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={modeKey === m.key}
                  className={modeKey === m.key ? 'active' : ''}
                  onClick={() => setModeKey(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="explorer-config">
              <label className="notional-field">
                <span>Position Size</span>
                <div className="notional-input">
                  <em>$</em>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={notional.toLocaleString('en-US')}
                    onChange={(e) => setNotional(Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
                    aria-label="Position size in dollars"
                  />
                </div>
              </label>
              <label className="compare-check">
                <input type="checkbox" checked={compare} onChange={(e) => toggleCompare(e.target.checked)} />
                <span>Gain / loss comparison <em>(T+0 vs T+1)</em></span>
              </label>
            </div>
          </div>
        </div>
        <div className="explorer-wrap">
          <svg
            ref={svgRef}
            className={dragging ? 'explorer-svg dragging' : 'explorer-svg'}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <defs>
              <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#ffe9a8" />
                <stop offset="45%" stopColor="#f4c76b" />
                <stop offset="100%" stopColor="#a87e2c" />
              </radialGradient>
              <radialGradient id="ballGrad2" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#dcfcec" />
                <stop offset="45%" stopColor="#84e6b3" />
                <stop offset="100%" stopColor="#2c8f5e" />
              </radialGradient>
              <filter id="ballGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x={EX_M.left} y={EX_M.top} width={EX_PLOT_W} height={EX_PLOT_H} fill="rgba(255,255,255,0.015)" />
            {termLabels.map((t) => (
              <line key={`v${t}`} x1={termToX(t)} y1={EX_M.top} x2={termToX(t)} y2={EX_M.top + EX_PLOT_H} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}
            {rateLabels.map((r) => (
              <line key={`h${r}`} x1={EX_M.left} y1={rateToY(r)} x2={EX_M.left + EX_PLOT_W} y2={rateToY(r)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}
            {rateLabels.map((r) => (
              <text key={`rl${r}`} x={EX_M.left - 10} y={rateToY(r) + 4} textAnchor="end" fill="#aab7b1" fontSize="11">{r.toFixed(1)}%</text>
            ))}
            {termLabels.map((t) => (
              <text key={`tl${t}`} x={termToX(t)} y={EX_M.top + EX_PLOT_H + 24} textAnchor="middle" fill="#aab7b1" fontSize="12">{t}</text>
            ))}
            {curveOverlay && (
              <g style={{ pointerEvents: 'none' }}>
                <polyline points={curveOverlay.path} fill="none" stroke="rgba(214,222,218,0.3)" strokeWidth="2" />
                {curveOverlay.knots.map((k, i) => (
                  <circle key={`knot${i}`} cx={k.x} cy={k.y} r="3" fill="rgba(214,222,218,0.4)" />
                ))}
                <text
                  x={curveOverlay.knots[curveOverlay.knots.length - 1]?.x - 10}
                  y={curveOverlay.knots[curveOverlay.knots.length - 1]?.y - 12}
                  textAnchor="end"
                  fill="rgba(214,222,218,0.55)"
                  fontSize="11"
                  fontWeight="600"
                >
                  UST curve {curve.date}
                </text>
              </g>
            )}
            <line x1={EX_M.left} y1={t0y} x2={t0x} y2={t0y} stroke="rgba(244,199,107,0.45)" strokeDasharray="5 5" strokeWidth="1.5" />
            <line x1={t0x} y1={EX_M.top + EX_PLOT_H} x2={t0x} y2={t0y} stroke="rgba(244,199,107,0.45)" strokeDasharray="5 5" strokeWidth="1.5" />
            {compare && (
              <>
                <line x1={EX_M.left} y1={t1y} x2={t1x} y2={t1y} stroke="rgba(132,230,179,0.4)" strokeDasharray="5 5" strokeWidth="1.5" />
                <line x1={t1x} y1={EX_M.top + EX_PLOT_H} x2={t1x} y2={t1y} stroke="rgba(132,230,179,0.4)" strokeDasharray="5 5" strokeWidth="1.5" />
                <line x1={t0x} y1={t0y} x2={t1x} y2={t1y} stroke={pnl >= 0 ? 'rgba(132,230,179,0.5)' : 'rgba(255,93,88,0.5)'} strokeDasharray="3 4" strokeWidth="1.5" />
              </>
            )}
            <circle
              cx={t0x}
              cy={t0y}
              r="16"
              fill="url(#ballGrad)"
              filter="url(#ballGlow)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
              tabIndex={0}
              role="slider"
              aria-label={`${compare ? 'T+0 bond' : 'Bond position'}: term ${termLabel} years, rate ${pos.ratePct.toFixed(2)} percent, duration ${duration.toFixed(2)} years`}
              aria-valuenow={pos.term}
              onKeyDown={onKeyDown('t0')}
              style={{ cursor: 'grab', outline: 'none' }}
            />
            {compare && (
              <>
                <text x={t0x} y={t0y - 24} textAnchor="middle" fill="#f4c76b" fontSize="12" fontWeight="700" style={{ pointerEvents: 'none' }}>T+0</text>
                <circle
                  cx={t1x}
                  cy={t1y}
                  r="16"
                  fill="url(#ballGrad2)"
                  filter="url(#ballGlow)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.5"
                  tabIndex={0}
                  role="slider"
                  aria-label={`T+1 discount scenario: remaining term ${fmtTerm(pos2.term)} years, discount rate ${pos2.ratePct.toFixed(2)} percent`}
                  aria-valuenow={pos2.term}
                  onKeyDown={onKeyDown('t1')}
                  style={{ cursor: 'grab', outline: 'none' }}
                />
                <text x={t1x} y={t1y - 24} textAnchor="middle" fill="#84e6b3" fontSize="12" fontWeight="700" style={{ pointerEvents: 'none' }}>T+1</text>
              </>
            )}
          </svg>
          {compare && activeBall === 't1' ? (
            <div ref={floatRef} className="explorer-float" style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: floatTransform }}>
              <div className={pnl >= 0 ? 'dur gain' : 'dur loss'}>P&L: {pnl >= 0 ? '+' : '−'}${money(Math.abs(pnl))}</div>
              <div className="row"><span>Discount Rate</span><strong>{pos2.ratePct.toFixed(2)}%</strong></div>
              <div className="row"><span>Remaining Term</span><strong>{fmtTerm(pos2.term)} yrs</strong></div>
              <div className="row mode-row"><span>Repriced Value</span><strong>${money(t1Value)}</strong></div>
            </div>
          ) : (
            <div ref={floatRef} className="explorer-float" style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: floatTransform }}>
              <div className="dur">Duration: {duration.toFixed(2)} yrs</div>
              <div className="row"><span>Rate</span><strong>{pos.ratePct.toFixed(2)}%</strong></div>
              <div className="row"><span>Term</span><strong>{termLabel} yrs</strong></div>
              <div className="row mode-row">
                {modeKey === 'dv01'
                  ? <><span>DV01</span><strong>${money(dv01Dollars)}</strong></>
                  : <><span>Px Δ / {mode.label}</span><strong>±${money(bumpMoveDollars)}</strong></>}
              </div>
            </div>
          )}
          {compare && (
            <div className={pnl >= 0 ? 'pnl-chip gain' : 'pnl-chip loss'}>
              <span>T+0 → T+1 P&L</span>
              <strong>{pnl >= 0 ? '+' : '−'}${money(Math.abs(pnl))}</strong>
              <em>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% · ${money(t0Value)} → ${money(t1Value)}</em>
            </div>
          )}
        </div>
        {compare ? (
          <>
            <div className="insight-box compact">
              <Gauge size={18} />
              <span>
                Your T+0 bond ({termLabel}y at {pos.ratePct.toFixed(2)}%, bought at par for ${notional.toLocaleString()}) repriced with <strong>{fmtTerm(pos2.term)} years</strong> remaining at a <strong>{pos2.ratePct.toFixed(2)}%</strong> discount rate is worth <strong>${money(t1Value)}</strong> — a <strong>{pnl >= 0 ? 'gain' : 'loss'} of ${money(Math.abs(pnl))}</strong>. Drag T+1 down (rates fall) or left (time passes) and watch the value rise.
              </span>
            </div>
            <p className="footnote">
              P&L is price change only — coupon income is not included. The T+0 bond&apos;s coupon is fixed at its purchase rate; the T+1 ball sets the remaining term (x-axis) and the new discount rate (y-axis).
            </p>
          </>
        ) : (
          <div className="insight-box compact">
            <Gauge size={18} />
            <span>
              Measured with a <strong>{mode.note}</strong>: a par bond at {pos.ratePct.toFixed(2)}% for {termLabel} years has an effective duration of <strong>{duration.toFixed(2)} years</strong> — longer terms and lower rates stretch duration; bigger bumps pick up convexity. Dollar figures are scaled to your ${notional.toLocaleString()} position.
            </span>
          </div>
        )}
      </article>
    </section>
  );
}
