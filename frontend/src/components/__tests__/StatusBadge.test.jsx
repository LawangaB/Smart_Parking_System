import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('shows the human label for a known status', () => {
    render(<StatusBadge status="RESERVED" />);
    expect(screen.getByText('Reserved')).toBeInTheDocument();
  });

  it('renders nothing for an empty status', () => {
    const { container } = render(<StatusBadge status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
