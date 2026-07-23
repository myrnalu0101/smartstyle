import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setToken, clearToken } from '../api/client';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check if we have a stored token and validate it
  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('smartstyle_token');
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(stored);
        const { user: me } = await authAPI.me();
        setUser(me);
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for forced logout events (e.g. 401 from API)
    const handleForceLogout = () => {
      setUser(null);
      clearToken();
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await authAPI.login(email, password);
    setToken(token);
    setUser(u);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const { token, user: u } = await authAPI.register(username, email, password);
    setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: localStorage.getItem('smartstyle_token'),
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
