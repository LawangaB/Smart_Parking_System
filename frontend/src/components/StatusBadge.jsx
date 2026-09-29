import { RESERVATION_STATUS_LABELS, SLOT_STATUS_LABELS } from '../utils/constants';

const LABELS = { ...SLOT_STATUS_LABELS, ...RESERVATION_STATUS_LABELS, ACTIVE: 'Active', INACTIVE: 'Inactive' };

/** Status text with a small colour marker. The word always carries the meaning, colour only supports it. */
export default function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${String(status).toLowerCase()}`}>
      <span className="badge-dot" aria-hidden="true" />
      {LABELS[status] || status}
    </span>
  );
}
