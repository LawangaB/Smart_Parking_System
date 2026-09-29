import { Car, Check, Clock, Wrench } from 'lucide-react';
import { SLOT_STATUS_LABELS } from '../utils/constants';
import { vehicleTypeLabel } from '../utils/format';

const STATE_ICONS = { available: null, reserved: Clock, occupied: Car, maintenance: Wrench };

/**
 * One bay on the plan, drawn like a painted parking space (lines on three sides, the open
 * side facing the lane). `slot.displayStatus` is what the person should see for the chosen period.
 *
 * - selectable: false leaves the bay visible but not clickable (`reason` explains why)
 * - dimmed: fades the bay because it does not suit the chosen vehicle (its real state stays visible otherwise)
 * - onSelect: called with the slot; in admin mode every bay is clickable
 */
export default function SlotCard({ slot, selected = false, selectable = true, dimmed = false, reason = '', onSelect }) {
  const state = String(slot.displayStatus || slot.status).toLowerCase();
  const StateIcon = STATE_ICONS[state];
  const stateLabel = SLOT_STATUS_LABELS[slot.displayStatus || slot.status] || state;

  const description = [
    `Bay ${slot.slotNumber}`,
    `${vehicleTypeLabel(slot.slotType).toLowerCase()} bay`,
    selected ? 'selected' : stateLabel.toLowerCase(),
    !selectable && reason ? reason : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      className={`bay bay-${state}${selected ? ' is-selected' : ''}${!selectable ? ' is-locked' : ''}${dimmed ? ' is-dimmed' : ''}`}
      aria-pressed={onSelect ? selected : undefined}
      aria-label={description}
      title={description}
      disabled={!selectable}
      onClick={() => onSelect?.(slot)}
    >
      <span className="bay-number">{slot.slotNumber}</span>
      <span className="bay-mark" aria-hidden="true">
        {selected ? <Check size={16} strokeWidth={3} /> : StateIcon ? <StateIcon size={16} /> : <span className="bay-led" />}
      </span>
    </button>
  );
}
