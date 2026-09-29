import { CircleAlert } from 'lucide-react';

/** A visible, plain-language error. Pass `onRetry` to offer a "Try again" button. */
export default function ErrorMessage({ error, title = 'Something went wrong', onRetry }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <div className="alert-body">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
