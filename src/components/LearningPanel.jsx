import { Play } from 'lucide-react';

export default function LearningPanel() {
  const topics = [
    {
      title: 'Modified Duration',
      definition:
        "An estimate of how much a bond's price moves, in percent, for a 1% (100 bp) change in yield. A modified duration of 7 means the price falls about 7% if yields rise one point — and rises about 7% if they fall. It's the practical risk number traders watch.",
      calc: 'Take the Macaulay duration and divide it by (1 + yield per period). In plain terms: find the average wait time, then shrink it slightly to account for compounding — giving the approximate % price change per 1% yield move.',
    },
    {
      title: 'Macaulay Duration',
      definition:
        'The weighted-average time you wait to receive a bond’s cash flows, with each payment weighted by its present value. Measured in years, it’s the "balance point" of the bond’s payments on a timeline — roughly how long your money is tied up.',
      calc: 'Discount every coupon and the final principal back to today’s value. Multiply each present value by the number of years until you receive it, add them all up, then divide by the bond’s total price. The answer is a number of years.',
    },
    {
      title: 'Convexity',
      definition:
        'A measure of how much the price–yield line curves instead of running straight. Duration assumes a straight line; the real relationship bends. Positive convexity means prices rise a little more when yields fall than they drop when yields rise — an advantage for the bondholder.',
      calc: "Weight each cash flow's present value by roughly the square of the years until you receive it, add them up, and scale by the bond's price. Like duration, but it penalizes far-off payments more heavily to capture the bend duration misses. Add it to the duration estimate to sharpen the price change for larger yield moves.",
    },
    {
      title: 'OAS',
      subtitle: 'Option-Adjusted Spread',
      definition:
        'The extra yield a bond pays over a risk-free benchmark curve after removing the value of any embedded option (such as a call feature). It lets you compare a callable bond fairly against a plain one by stripping out the part of the spread that’s really just payment for the option.',
      calc: "Model many possible future interest-rate paths, price the bond along each path while accounting for when the option would be exercised, then solve for the single constant spread added to the benchmark curve that makes the model's average price match the bond's market price. That spread is the OAS.",
    },
  ];
  return (
    <article className="panel side-panel learning-panel">
      <div className="panel-header">
        <div>
          <h3>Concepts</h3>
          <p>Key bond measures - Defined</p>
        </div>
      </div>
      <div className="lesson-list">
        {topics.map((topic) => (
          <div className="lesson-item" key={topic.title}>
            <div className="lesson-icon"><Play size={15} /></div>
            <div className="lesson-body">
              <strong>
                {topic.title}
                {topic.subtitle && <span className="lesson-subtitle"> · {topic.subtitle}</span>}
              </strong>
              <p className="lesson-def">{topic.definition}</p>
              <p className="lesson-calc"><span>How it&rsquo;s calculated:</span> {topic.calc}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
