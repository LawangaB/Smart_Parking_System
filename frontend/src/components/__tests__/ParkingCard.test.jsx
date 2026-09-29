import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ParkingCard from '../ParkingCard';

const location = {
  locationId: 1,
  name: 'Central Plaza Parking',
  address: '12 Main Street',
  operatingHours: '06:00 - 23:00',
  contactNumber: '+1 555 0101',
  availableSlots: 5,
  totalSlots: 20,
  minHourlyRate: 3,
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <ParkingCard location={{ ...location, ...props }} />
    </MemoryRouter>,
  );
}

describe('ParkingCard', () => {
  it('shows the location name and free-bay count', () => {
    renderCard();
    expect(screen.getByText('Central Plaza Parking')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/of 20 bays/)).toBeInTheDocument();
  });

  it('marks a full location', () => {
    renderCard({ availableSlots: 0 });
    expect(screen.getByRole('img', { name: /full/i })).toBeInTheDocument();
  });

  it('shows a fallback when no rate has been set', () => {
    renderCard({ minHourlyRate: null });
    expect(screen.getByText(/rates not set yet/i)).toBeInTheDocument();
  });
});
