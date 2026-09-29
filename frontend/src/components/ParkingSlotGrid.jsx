import { useMemo } from 'react';
import SlotCard from './SlotCard';
import { slotPrefix, vehicleTypeLabel } from '../utils/format';

const LEGEND = [
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved for this time' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'maintenance', label: 'Maintenance' },
];

/** Gather bays into banks by the letters in their number (A01, A02 ... and M01, M02 ...). */
export function groupIntoBanks(slots) {
  const banks = new Map();
  slots.forEach((slot) => {
    const key = slotPrefix(slot.slotNumber);
    if (!banks.has(key)) banks.set(key, []);
    banks.get(key).push(slot);
  });
  return [...banks.entries()].map(([prefix, items]) => {
    const types = [...new Set(items.map((slot) => slot.slotType))];
    return {
      prefix,
      slots: items,
      title: `${types.length === 1 ? `${vehicleTypeLabel(types[0])} bays` : 'Bays'} ${items[0].slotNumber} to ${items[items.length - 1].slotNumber}`,
    };
  });
}

/**
 * The parking plan: bays drawn on asphalt, grouped into banks with a lane between rows.
 *
 * - isSelectable(slot) -> { ok: boolean, reason?: string, dim?: boolean }   (defaults to "every bay")
 * - showSelectionKey: adds "Your choice" to the key (booking screens)
 */
export default function ParkingSlotGrid({ slots, selectedSlotId, onSelect, isSelectable, showSelectionKey = false, emptyMessage = 'This location has no bays yet.' }) {
  const banks = useMemo(() => groupIntoBanks(slots), [slots]);

  if (slots.length === 0) return <p className="plan-empty">{emptyMessage}</p>;

  const free = slots.filter((slot) => (slot.displayStatus || slot.status) === 'AVAILABLE').length;

  return (
    <section className="plan" aria-label="Parking plan">
      <p className="sr-only">
        {slots.length} bays, {free} available.
      </p>
      <ul className="plan-key" aria-label="Key">
        {LEGEND.map((item) => (
          <li key={item.key}>
            <span className={`key-swatch key-${item.key}`} aria-hidden="true" />
            {item.label}
          </li>
        ))}
        {showSelectionKey && (
          <li>
            <span className="key-swatch key-selected" aria-hidden="true" />
            Your choice
          </li>
        )}
      </ul>

      {banks.map((bank) => (
        <div key={bank.prefix} className="bank">
          <h3 className="bank-title">{bank.title}</h3>
          <div className="bank-bays">
            {bank.slots.map((slot) => {
              const check = isSelectable ? isSelectable(slot) : { ok: true };
              return (
                <SlotCard
                  key={slot.slotId}
                  slot={slot}
                  selected={slot.slotId === selectedSlotId}
                  selectable={check.ok}
                  dimmed={Boolean(check.dim)}
                  reason={check.reason}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
