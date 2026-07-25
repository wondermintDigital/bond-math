import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import DurationPrice from './pages/DurationPrice';
import Steepness from './pages/Steepness';
import ForwardVol from './pages/ForwardVol';
import About from './pages/About';
import DayCountAccrual from './pages/DayCountAccrual';
import RollYield from './pages/RollYield';
import Amortization from './pages/Amortization';
import { useYieldCurveData } from './lib/curveData';

// Scrolls to a #hash target on navigation (cross-page anchors like "/#curve"),
// or resets to the top when landing on a plain route.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
      const timer = setTimeout(scroll, 50);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function AppRoutes() {
  const { curves, source } = useYieldCurveData();
  const [curveIndex, setCurveIndex] = useState(curves.length - 1);
  const activeCurve = curves[Math.min(curveIndex, curves.length - 1)] || curves[0];
  const latestCurve = curves[curves.length - 1] || activeCurve;

  useEffect(() => {
    setCurveIndex(curves.length - 1);
  }, [curves.length]);

  return (
    <main>
      <Nav />
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home activeCurve={activeCurve} />} />
        <Route path="/duration-price" element={<DurationPrice latestCurve={latestCurve} />} />
        <Route
          path="/steepness"
          element={
            <Steepness
              curves={curves}
              source={source}
              curveIndex={curveIndex}
              setCurveIndex={setCurveIndex}
              activeCurve={activeCurve}
              latestCurve={latestCurve}
            />
          }
        />
        <Route path="/forward-vol" element={<ForwardVol />} />
        <Route path="/about" element={<About />} />
        <Route path="/amortization" element={<Amortization />} />
        <Route path="/roll-yield" element={<RollYield />} />
        <Route path="/day-count" element={<DayCountAccrual />} />
      </Routes>
      <Footer />
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
