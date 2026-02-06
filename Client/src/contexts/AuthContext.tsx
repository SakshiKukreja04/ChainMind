import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUser, getToken, setToken, setUser as storeUser, removeToken, removeUser } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'VENDOR';
  businessId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const storedToken = getToken();
    const storedUser = getUser();
    
    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    storeUser(newUser);
    setAuthToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    removeToken();
    removeUser();
    setAuthToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    storeUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
