import { money } from '../lib/bondMath';

export function ChartTooltip({ active, payload, label, suffix = '', prefix = '' }) {
  if (!active || !payload?.length) return null;
  return <div className="tooltip"><span>{label}</span><strong>{prefix}{Number(payload[0].value).toFixed(2)}{suffix}</strong></div>;
}

export function CurveTooltip({ active, payload, label, latestDate, showToday }) {
  if (!active || !payload?.length) return null;
  const selected = payload.find((p) => p.dataKey === 'yield');
  const today = payload.find((p) => p.dataKey === 'today');
  return (
    <div className="tooltip">
      <span>{label}</span>
      {selected && <strong>{Number(selected.value).toFixed(2)}%</strong>}
      {showToday && today && <em className="tooltip-today">Today ({latestDate}): {Number(today.value).toFixed(2)}%</em>}
    </div>
  );
}

export function CashFlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const coupon = payload.find((p) => p.dataKey === 'coupon')?.value || 0;
  const principal = payload.find((p) => p.dataKey === 'principal')?.value || 0;
  return <div className="tooltip"><span>Year {label}</span><strong>${money(coupon + principal)}</strong></div>;
}
