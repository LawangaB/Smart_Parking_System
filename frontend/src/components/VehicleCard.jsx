import { Bike, Car, Pencil, Trash2, Truck, Van } from 'lucide-react';
import { vehicleTypeLabel } from '../utils/format';

const ICONS = { CAR: Car, MOTORCYCLE: Bike, VAN: Van, TRUCK: Truck };

/** A registered vehicle, with the registration number shown like a number plate. */
export default function VehicleCard({ vehicle, onEdit, onDelete, compact = false }) {
  const Icon = ICONS[vehicle.vehicleType] || Car;
  const details = [vehicle.makeModel, vehicle.color].filter(Boolean).join(', ');

  return (
    <article className={`vehicle${compact ? ' vehicle-compact' : ''}`}>
      <span className="plate">{vehicle.registrationNumber}</span>
      <div className="vehicle-info">
        <p className="vehicle-type">
          <Icon size={18} aria-hidden="true" />
          {vehicleTypeLabel(vehicle.vehicleType)}
        </p>
        {details && <p className="vehicle-details">{details}</p>}
      </div>
      {(onEdit || onDelete) && (
        <div className="vehicle-actions">
          {onEdit && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(vehicle)}>
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDelete(vehicle)}>
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}
