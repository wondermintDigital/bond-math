import { useState } from 'react';
import DurationExplorer from '../components/DurationExplorer';
import { CalculatorPanel, CashFlowPanel } from '../components/CalculatorPanel';
import LearningPanel from '../components/LearningPanel';

export default function DurationPrice({ latestCurve }) {
  const [bond, setBond] = useState({ face: 100, coupon: 4.5, years: 10, yieldPct: 4.75, frequency: 2 });

  return (
    <>
      <section className="container page-intro">
        <p className="eyebrow">Duration &amp; Price</p>
        <h1 className="page-title">Bond Math and Rate Moves</h1>
        <p className="page-lede">
          Drag the ball to feel duration across term and rate, then tune the exact bond in the calculator below —
          price, yield, DV01, convexity, and the cash-flow timeline all update together.
        </p>
      </section>

      <DurationExplorer curve={latestCurve} />

      <section className="dashboard-grid container">
        <CalculatorPanel bond={bond} setBond={setBond} />
        <CashFlowPanel bond={bond} />
      </section>

      <section className="container learning-section">
        <LearningPanel />
      </section>
    </>
  );
}
