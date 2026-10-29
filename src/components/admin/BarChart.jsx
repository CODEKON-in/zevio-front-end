import s from './BarChart.module.css';

/**
 * BarChart — tiny bar chart made of divs (no chart library).
 * Props:
 *  - data: Array<{ label: string, value: number, title?: string }>
 *  - ariaLabel: string — describes the chart
 *  - highlightLast: boolean — colour the last bar (today)
 */
export default function BarChart({ data, ariaLabel, highlightLast = true }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className={s.chart} aria-label={ariaLabel} role="img">
      <div className={s.bars}>
        {data.map((d, i) => (
          <div key={d.label} className={s.col} title={d.title}>
            <span className={s.value}>{d.value}</span>
            <div className={s.track}>
              <div
                className={`${s.bar} ${highlightLast && i === data.length - 1 ? s.today : ''}`}
                style={{ height: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className={s.label}>{d.label}</span>
          </div>
        ))}
      </div>
      {/* Same numbers as text for screen readers */}
      <ul className="visually-hidden">
        {data.map((d) => (
          <li key={d.label}>{d.title || `${d.label}: ${d.value}`}</li>
        ))}
      </ul>
    </figure>
  );
}
