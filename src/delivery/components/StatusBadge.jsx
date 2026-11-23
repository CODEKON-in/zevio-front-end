import React from 'react';
import { ORDER_STATUS_CONFIG } from '../data/mockData';

export default function StatusBadge({ status }) {
  const cfg = ORDER_STATUS_CONFIG[status] || {
    key: 'assigned',
    label: status || 'Assigned'
  };

  return (
    <span className={`status-badge status-badge--${cfg.key}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

