"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = {
  id?: string;
  name: string;
  hierarchy_weight: number;
  email?: string;
  isActive?: boolean;
};

export const MOCK_USERS = {
  L1: { name: "Secretary (L1)", hierarchy_weight: 10 },
  L2: { name: "Joint Secretary (L2)", hierarchy_weight: 20 },
  L3: { name: "Deputy Secretary (L3)", hierarchy_weight: 30 },
  L4: { name: "Field Auditor (L4)", hierarchy_weight: 40 },
};

type AuthContextType = {
  user: UserRole;
  firebaseUser: FirebaseUser | null;
  setUser: (user: UserRole) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: MOCK_USERS.L4 as UserRole,
  firebaseUser: null,
  setUser: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<UserRole | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.isActive === false) {
               alert("Your account is pending approval or has been suspended. Please contact an Administrator.");
               import('firebase/auth').then(m => m.signOut(auth));
               return;
            }
            setUserState({ id: fbUser.uid, ...data } as UserRole);
          } else {
            // Create a default profile but mark it as pending (isActive: false)
            const defaultProfile = { 
              id: fbUser.uid, 
              ...MOCK_USERS.L4, 
              email: fbUser.email || '', 
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Unknown User',
              isActive: false, // Lock down by default!
              ntfyTopic: 'oag-audit-' + Math.random().toString(36).substring(2, 10)
            };
            await setDoc(doc(db, "users", fbUser.uid), defaultProfile);
            
            alert("Registration successful! However, your account requires Administrator approval before you can access the system.");
            import('firebase/auth').then(m => m.signOut(auth));
            return;
          }
        } catch (err) {
          console.error("Error fetching user profile", err);
        }
      } else {
        setUserState(null);
        if (pathname !== '/login') {
           router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const setUser = async (newUser: UserRole) => {
    setUserState(newUser);
    if (firebaseUser) {
       try {
         await setDoc(doc(db, "users", firebaseUser.uid), newUser, { merge: true });
       } catch (err) {
         console.error("Failed to save user settings to Firestore", err);
       }
    }
  };

  if (loading) {
      return <div className="flex h-screen items-center justify-center bg-[var(--background)]"><div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
  }

  // If not logged in and not on login page, render nothing while redirecting
  if (!user && pathname !== '/login') {
      return null;
  }

  return (
    <AuthContext.Provider value={{ user: user || MOCK_USERS.L4, firebaseUser, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
