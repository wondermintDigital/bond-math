import { Link } from 'react-router-dom';

export const MENU_ITEMS = [
  { label: 'Duration & Price', to: '/duration-price', tip: 'Bond Math Calculator Based on Rate Moves' },
  { label: 'Amortization', to: '/amortization', tip: 'Loan and Bond Amortization Schedules' },
  { label: 'Roll Yield', to: '/roll-yield', tip: 'Bonds Rolling Down the Curve' },
  { label: 'Day Count Accrual', to: '/day-count', tip: 'Accrued Interest and Day Count Conventions' },
  { label: 'Steepness and History', to: '/steepness', tip: 'Curve Shape Ranked Against History' },
  { label: 'Forward Vol', to: '/forward-vol', tip: 'Straddle Term-Structure Comparator' },
  { label: 'About', to: '/about', tip: 'What Bond Math Is For' },
];

export default function Nav() {
  return (
    <header className="nav-shell">
      <div className="nav container">
        <Link className="brand" to="/">
          <div className="brand-mark">BM</div>
          <div>
            <strong>BOND</strong>
            <span>MATH</span>
          </div>
        </Link>
        <nav className="nav-links">
          {MENU_ITEMS.map((item) => (
            <Link key={item.label} className="menu-link" to={item.to}>
              {item.label}
              <span className="menu-tip">{item.tip}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
