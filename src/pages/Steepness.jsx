import { useMemo } from 'react';
import { MATURITIES } from '../lib/bondMath';
import YieldCurvePanel from '../components/YieldCurvePanel';

export default function Steepness({ curves, source, curveIndex, setCurveIndex, activeCurve, latestCurve }) {
  const curveChartData = useMemo(
    () => MATURITIES.map((m) => ({ maturity: m.label, years: m.years, yield: activeCurve[m.key], today: latestCurve[m.key] })),
    [activeCurve, latestCurve]
  );

  const spread2s10s = Math.round((activeCurve.y10 - activeCurve.y2) * 100);
  const curveShape = spread2s10s > 25 ? 'steep' : spread2s10s < 0 ? 'inverted' : 'flat';
  const steepnessPercentile = useMemo(() => {
    const spreads = curves.map((c) => c.y10 - c.y2);
    const active = activeCurve.y10 - activeCurve.y2;
    const below = spreads.filter((s) => s < active).length;
    const equal = spreads.filter((s) => s === active).length;
    return Math.round(((below + equal * 0.5) / spreads.length) * 100);
  }, [curves, activeCurve]);

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Steepness &amp; History</p>
        <h1 className="page-title">Compare US Yield Curve Steepness and History</h1>
        <p className="page-lede">
          Scrub through years of daily curves, compare any date against today&apos;s shape, and see where the
          2s10s spread sits versus the full loaded dataset.
        </p>
      </section>

      <section className="container home-curve">
        <YieldCurvePanel
          curves={curves}
          curveIndex={curveIndex}
          setCurveIndex={setCurveIndex}
          data={curveChartData}
          activeCurve={activeCurve}
          latestCurve={latestCurve}
          spread2s10s={spread2s10s}
          curveShape={curveShape}
          steepnessPercentile={steepnessPercentile}
          source={source}
        />
      </section>
    </>
  );
}
