import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LearningPanel() {
  const topics = [
    { title: 'Macaulay Duration', value: 'Center of PV-weighted cash flows' },
    { title: 'Modified Duration', value: 'Price sensitivity to yield changes' },
    { title: 'Convexity', value: 'Curvature in price/yield relationship' },
    { title: 'OAS', value: 'Spread after embedded option value' },
  ];
  return (
    <article className="panel side-panel learning-panel">
      <div className="panel-header">
        <div>
          <h3>Market Insights</h3>
          <p>Turn bond concepts into visual lessons.</p>
        </div>
        <Link to="/#reference">View All</Link>
      </div>
      <div className="lesson-list">
        {topics.map((topic) => (
          <div className="lesson-item" key={topic.title}>
            <div className="lesson-icon"><Play size={15} /></div>
            <div><strong>{topic.title}</strong><span>{topic.value}</span></div>
          </div>
        ))}
      </div>
    </article>
  );
}
