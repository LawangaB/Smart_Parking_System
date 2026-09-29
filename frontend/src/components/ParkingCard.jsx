import { Link } from 'react-router-dom';
import { Clock, MapPin, Phone } from 'lucide-react';
import { availabilityLevel } from './availability';
import { formatMoney, vehicleTypeLabel } from '../utils/format';

/**
 * One parking location: where it is, how many bays are free for the chosen time,
 * and the cheapest hourly rate. `vehicleType` is only used to word the counts.
 */
export default function ParkingCard({ location, vehicleType, actionLabel = 'Choose a bay' }) {
  const { locationId, name, address, description, operatingHours, contactNumber, availableSlots, totalSlots, minHourlyRate } = location;
  const level = availabilityLevel(availableSlots, totalSlots);
  const percent = totalSlots ? Math.round((availableSlots / totalSlots) * 100) : 0;
  const forType = vehicleType ? ` for ${vehicleTypeLabel(vehicleType).toLowerCase()}s` : '';

  return (
    <article className="location">
      <div className="location-main">
        <h3>{name}</h3>
        <p className="location-line">
          <MapPin size={16} aria-hidden="true" />
          {address}
        </p>
        {description && <p className="location-description">{description}</p>}
        <ul className="location-facts">
          {operatingHours && (
            <li>
              <Clock size={16} aria-hidden="true" />
              Open {operatingHours}
            </li>
          )}
          {contactNumber && (
            <li>
              <Phone size={16} aria-hidden="true" />
              {contactNumber}
            </li>
          )}
        </ul>
      </div>

      <div className="location-side">
        <div className={`meter meter-${level.key}`}>
          <p className="meter-figure">
            <strong>{availableSlots}</strong> free{forType}
            <span className="meter-total"> of {totalSlots} bays</span>
          </p>
          <div className="meter-track" role="img" aria-label={`${availableSlots} of ${totalSlots} bays free, ${level.word.toLowerCase()}`}>
            <span className="meter-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="location-rate">
          {minHourlyRate === null || minHourlyRate === undefined ? 'Rates not set yet' : <>From {formatMoney(minHourlyRate)} per hour</>}
        </p>
        <Link to={`/parking/${locationId}`} className="btn btn-primary">
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
