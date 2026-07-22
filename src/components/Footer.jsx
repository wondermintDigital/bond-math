import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer container">
      <div className="brand footer-brand"><div className="brand-mark">BM</div><div><strong>BOND</strong><span>MATH</span></div></div>
      <div className="footer-grid">
        <div><strong>TOOLS</strong><Link to="/steepness">Yield Curve</Link><Link to="/duration-price#calculator">YTM Calculator</Link><Link to="/duration-price#explorer">Duration Explorer</Link></div>
        <div><strong>LEARN</strong><Link to="/#reference">Glossary</Link><Link to="/#reference">Day Counts</Link><Link to="/#reference">CFA Prep</Link></div>
        <div><strong>BUILD</strong><Link to="/steepness">Google Sheets Adapter</Link><a href="sample-treasury-curve.csv">Sample CSV</a><Link to="/#tools">Roadmap</Link></div>
      </div>
      <p>© 2026 Bond Math. Educational tool. Not investment advice.</p>
    </footer>
  );
}
