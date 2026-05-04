'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const AUTH_TOKEN_STORAGE_KEY = 'avenir_token';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      setToken(storedToken);
      fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
        .then(httpResponse => httpResponse.ok ? httpResponse.json() : null)
        .then(fetchedUser => {
          if (fetchedUser) setUser(fetchedUser);
          else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const httpResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!httpResponse.ok) throw new Error((await httpResponse.json()).error || 'Login failed');
    const { token: authToken, user: authenticatedUser } = await httpResponse.json();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    setToken(authToken);
    setUser(authenticatedUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const httpResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!httpResponse.ok) throw new Error((await httpResponse.json()).error || 'Registration failed');
    const { token: authToken, user: authenticatedUser } = await httpResponse.json();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    setToken(authToken);
    setUser(authenticatedUser);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) throw new Error('useAuth must be used within AuthProvider');
  return authContext;
};
