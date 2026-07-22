import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';

export default function ComingSoon({ title, tip }) {
  return (
    <section className="container coming-soon">
      <div className="coming-soon-icon"><Hourglass size={28} /></div>
      <p className="eyebrow">Coming Soon</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-lede">{tip}. This page is on the roadmap — check back soon, or explore what&apos;s live today.</p>
      <Link className="primary-btn" to="/duration-price">Try Duration &amp; Price <ArrowRight size={18} /></Link>
    </section>
  );
}
