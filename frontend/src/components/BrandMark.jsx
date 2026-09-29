import { Link } from 'react-router-dom';

/** The white "P" sign and the product name. */
export default function BrandMark({ to = '/' }) {
  return (
    <Link to={to} className="brand" aria-label="Smart Parking home">
      <span className="brand-mark" aria-hidden="true">
        P
      </span>
      <span className="brand-name">Smart Parking</span>
    </Link>
  );
}
