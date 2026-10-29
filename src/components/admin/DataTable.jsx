import { t } from '../../i18n/index.js';
import s from './DataTable.module.css';

/**
 * DataTable — simple accessible table. On narrow screens it scrolls sideways
 * inside its own box (the page itself never scrolls sideways).
 * Props:
 *  - caption: string (visually hidden, for screen readers)
 *  - columns: Array<{ key, header, render?: (row) => node, align?: 'left'|'right'|'center', width?: string }>
 *  - rows: Array<object>
 *  - rowKey: (row) => string (default row.id)
 *  - onRowClick: (row) => void — makes rows clickable (keep a real button/link in a cell for keyboard users)
 *  - rowClassName: (row) => string
 */
export default function DataTable({ caption, columns, rows, rowKey = (r) => r.id, onRowClick, rowClassName }) {
  return (
    <div className={s.wrap} role="region" aria-label={caption} tabIndex={0} title={t('admin.common.tableScroll')}>
      <table className={s.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={{ textAlign: c.align || 'left', width: c.width }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`${onRowClick ? s.clickable : ''} ${rowClassName ? rowClassName(row) || '' : ''}`}
              onClick={onRowClick ? (e) => {
                // Let buttons, links, switches and inputs inside the row work on their own.
                if (e.target.closest('button, a, input, select, label, [role="switch"]')) return;
                onRowClick(row);
              } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
