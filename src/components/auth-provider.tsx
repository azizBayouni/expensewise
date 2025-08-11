
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

// A mock user ID for development without authentication.
// All data will be saved under this user in Firestore.
const MOCK_USER_ID = 'dev-user';

interface AuthContextType {
  user: { uid: string, displayName: string | null, email: string | null, photoURL: string | null } | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>({
      uid: MOCK_USER_ID,
      displayName: 'Dev User',
      email: 'dev@expensewise.app',
      photoURL: null
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    // In a real scenario, you'd sign out. Here we do nothing.
    return Promise.resolve();
  };

  const value = { user, loading, logout };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a mock context if not within a provider.
    return { 
        user: { 
            uid: MOCK_USER_ID, 
            displayName: 'Dev User', 
            email: 'dev@expensewise.app', 
            photoURL: null 
        }, 
        loading: false,
        logout: async () => {} 
    };
  }
  return context;
}
