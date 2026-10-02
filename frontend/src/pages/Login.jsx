import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TextField } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import PointerGlowPanel from '../components/PointerGlowPanel';
import * as check from '../utils/validators';

export default function Login() {
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;

  if (ready && user) return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : from || '/dashboard'} replace />;

  const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const found = check.collectErrors({ email: check.email(values.email), password: check.required(values.password, 'Password') });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const signedIn = await login(values.email.trim(), values.password);
      navigate(from || '/', { replace: true });
    } catch (error) {
      setFormError(error);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <PointerGlowPanel>
        <h1>Log in</h1>
        <p className="auth-intro">Welcome back. Log in to reserve a bay and manage your bookings.</p>

        <form onSubmit={handleSubmit} noValidate className="stack">
          <ErrorMessage error={formError} title="Could not log you in" />
          <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={change('email')} error={errors.email} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={change('password')}
            error={errors.password}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Logging in' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </PointerGlowPanel>
    </div>
  );
}
