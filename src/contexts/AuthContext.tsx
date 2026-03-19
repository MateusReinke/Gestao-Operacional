import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types/sgo';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('sgo_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem('sgo_user', JSON.stringify(user));
    else localStorage.removeItem('sgo_user');
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const loggedUser = await api.login(email, password);
      setUser(loggedUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
