import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleCard from '../VehicleCard';

const vehicle = { vehicleId: 1, registrationNumber: 'CAB-1234', vehicleType: 'CAR', makeModel: 'Toyota Corolla', color: 'Silver' };

describe('VehicleCard', () => {
  it('shows the plate and vehicle type', () => {
    render(<VehicleCard vehicle={vehicle} />);
    expect(screen.getByText('CAB-1234')).toBeInTheDocument();
    expect(screen.getByText('Car')).toBeInTheDocument();
    expect(screen.getByText('Toyota Corolla, Silver')).toBeInTheDocument();
  });

  it('calls onDelete with the vehicle when clicked', async () => {
    const onDelete = vi.fn();
    render(<VehicleCard vehicle={vehicle} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(vehicle);
  });
});
