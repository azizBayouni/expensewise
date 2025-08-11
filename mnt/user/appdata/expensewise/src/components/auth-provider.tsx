
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Skeleton } from './ui/skeleton';

// A mock user ID for development without authentication.
// All data will be saved under this user.
const MOCK_USER_ID = 'dev-user';

interface AuthContextType {
  user: { uid: string, displayName: string | null, email: string | null, photoURL: string | null } | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = { 
    user: {
      uid: MOCK_USER_ID,
      displayName: 'Dev User',
      email: 'dev@expensewise.app',
      photoURL: null
    }, 
    loading: false,
    logout: async () => {} 
  };
  
  return (
    <AuthContext.Provider value={value}>
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
