import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TextField } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import PointerGlowPanel from '../components/PointerGlowPanel';
import * as check from '../utils/validators';

export default function Register() {
  const { register, user, ready } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const found = check.collectErrors({
      fullName: check.fullName(values.fullName),
      email: check.email(values.email),
      phone: check.phone(values.phone),
      password: check.password(values.password),
      confirmPassword: check.confirmPassword(values.confirmPassword, values.password),
    });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      toast.success('Your account is ready.');
      navigate('/', { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.status === 422 && Object.keys(error.fieldErrors || {}).length ? null : error);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <PointerGlowPanel>
        <h1>Create your account</h1>
        <p className="auth-intro">You need an account to reserve bays and keep track of your bookings.</p>

        <form onSubmit={handleSubmit} noValidate className="stack">
          <ErrorMessage error={formError} title="Could not create your account" />
          <TextField label="Full name" autoComplete="name" value={values.fullName} onChange={change('fullName')} error={errors.fullName} />
          <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={change('email')} error={errors.email} />
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            optional
            value={values.phone}
            onChange={change('phone')}
            error={errors.phone}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            value={values.password}
            onChange={change('password')}
            error={errors.password}
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={change('confirmPassword')}
            error={errors.confirmPassword}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </PointerGlowPanel>
    </div>
  );
}
