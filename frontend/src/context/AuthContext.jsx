import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { getToken, setToken, setUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `ready` becomes true once we know whether a saved token is still valid.
  const [ready, setReady] = useState(() => !getToken());

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session after a page reload.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    authService
      .getProfile()
      .then((profile) => !cancelled && setUser(profile))
      .catch(() => !cancelled && clearSession())
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // An expired token anywhere in the app signs the person out.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (details) => {
    const result = await authService.register(details);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout: clearSession,
      setUser,
    }),
    [user, ready, login, register, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
