"use client";
import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const autoLoginDev = async (testEmail: string, testPass: string, targetWeight: number) => {
    setLoading(true);
    setError('');
    let fbUser;
    try {
      // Attempt login
      const creds = await signInWithEmailAndPassword(auth, testEmail, testPass);
      fbUser = creds.user;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
         try {
            // Auto register if it doesn't exist
            const creds = await createUserWithEmailAndPassword(auth, testEmail, testPass);
            fbUser = creds.user;
            
            // Set the appropriate role immediately in Firestore
            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            
            const dummyMap: Record<number, string> = {
              10: "Admin (Secretary)",
              20: "Joint Secretary (L2)",
              30: "Deputy Secretary (L3)",
              40: "Field Auditor (L4)"
            };
            let baseName = dummyMap[targetWeight] || "User";
            let name = `${baseName} - ${testEmail.split('@')[0]}`;
            
            await setDoc(doc(db, "users", fbUser.uid), {
               id: fbUser.uid,
               email: testEmail,
               name: name,
               hierarchy_weight: targetWeight,
               isActive: true,
               ntfyTopic: 'oag-audit-' + Math.random().toString(36).substring(2, 10)
            });
         } catch (regErr: any) {
            setError("Auto-register failed: " + regErr.message);
            setLoading(false);
            return;
         }
      } else {
         setError("Auto-login failed: " + err.message);
         setLoading(false);
         return;
      }
    }
    
    // Always enforce the weight in Dev mode just in case it got corrupted
    if (fbUser) {
       try {
         const { doc, setDoc } = await import('firebase/firestore');
         const { db } = await import('@/lib/firebase');
         const dummyMap: Record<number, string> = {
            10: "Admin (Secretary)",
            20: "Joint Secretary (L2)",
            30: "Deputy Secretary (L3)",
            40: "Field Auditor (L4)"
         };
         let baseName = dummyMap[targetWeight] || "User";
         let name = `${baseName} - ${testEmail.split('@')[0]}`;
         
         await setDoc(doc(db, "users", fbUser.uid), {
            id: fbUser.uid,
            email: testEmail,
            name: name,
            hierarchy_weight: targetWeight,
            isActive: true
         }, { merge: true });
       } catch (e) {}
    }
    
    router.push('/');
  };

  const seedAllDummyUsers = async () => {
    setLoading(true);
    setError('Seeding database with dummy users... Please wait (~5-10s).');
    
    const dummyUsers = [
      { email: 'admin1@test.com', weight: 10, name: 'Admin 1 (Secretary)' },
      { email: 'admin2@test.com', weight: 10, name: 'Admin 2 (Secretary)' },
      { email: 'joint1@test.com', weight: 20, name: 'Joint Secretary 1' },
      { email: 'joint2@test.com', weight: 20, name: 'Joint Secretary 2' },
      { email: 'joint3@test.com', weight: 20, name: 'Joint Secretary 3' },
      { email: 'deputy1@test.com', weight: 30, name: 'Deputy Secretary 1' },
      { email: 'deputy2@test.com', weight: 30, name: 'Deputy Secretary 2' },
      { email: 'deputy3@test.com', weight: 30, name: 'Deputy Secretary 3' },
      { email: 'deputy4@test.com', weight: 30, name: 'Deputy Secretary 4' },
      { email: 'auditor1@test.com', weight: 40, name: 'Field Auditor 1' },
      { email: 'auditor2@test.com', weight: 40, name: 'Field Auditor 2' },
      { email: 'auditor3@test.com', weight: 40, name: 'Field Auditor 3' },
      { email: 'auditor4@test.com', weight: 40, name: 'Field Auditor 4' },
      { email: 'auditor5@test.com', weight: 40, name: 'Field Auditor 5' },
    ];

    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const { signOut } = await import('firebase/auth');

    for (const u of dummyUsers) {
       try {
         const creds = await createUserWithEmailAndPassword(auth, u.email, 'password123');
         await setDoc(doc(db, "users", creds.user.uid), {
            id: creds.user.uid,
            email: u.email,
            name: u.name,
            hierarchy_weight: u.weight,
            isActive: true
         });
       } catch (err: any) {
         if (err.code !== 'auth/email-already-in-use') {
           console.error("Failed to seed", u.email, err);
         }
       }
    }
    
    // Log out the last created user so the session is clean
    await signOut(auth);
    
    setLoading(false);
    setError('Database successfully seeded! All dummy users are now permanently available in the dropdowns.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="OAG Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Office of Auditor General's AP and CL
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-slate-200"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors dark:text-slate-200"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
          >
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* DEV MODE QUICK LOGIN */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-4">Development Switcher</h4>
           <div className="flex space-x-2">
              <select id="devUserSelect" className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-2 outline-none dark:text-slate-300">
                <optgroup label="Admins (L1)">
                  <option value="admin1@test.com|10">Admin 1 (Secretary)</option>
                  <option value="admin2@test.com|10">Admin 2 (Secretary)</option>
                </optgroup>
                <optgroup label="Joint Secretaries (L2)">
                  <option value="joint1@test.com|20">Joint Secretary 1</option>
                  <option value="joint2@test.com|20">Joint Secretary 2</option>
                  <option value="joint3@test.com|20">Joint Secretary 3</option>
                </optgroup>
                <optgroup label="Deputy Secretaries (L3)">
                  <option value="deputy1@test.com|30">Deputy Secretary 1</option>
                  <option value="deputy2@test.com|30">Deputy Secretary 2</option>
                  <option value="deputy3@test.com|30">Deputy Secretary 3</option>
                  <option value="deputy4@test.com|30">Deputy Secretary 4</option>
                </optgroup>
                <optgroup label="Field Auditors (L4)">
                  <option value="auditor1@test.com|40">Field Auditor 1</option>
                  <option value="auditor2@test.com|40">Field Auditor 2</option>
                  <option value="auditor3@test.com|40">Field Auditor 3</option>
                  <option value="auditor4@test.com|40">Field Auditor 4</option>
                  <option value="auditor5@test.com|40">Field Auditor 5</option>
                </optgroup>
              </select>
              <button 
                onClick={() => {
                  const val = (document.getElementById('devUserSelect') as HTMLSelectElement).value;
                  const [email, weightStr] = val.split('|');
                  autoLoginDev(email, 'password123', parseInt(weightStr));
                }}
                className="px-4 py-2 text-xs font-bold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors"
              >
                Fast Login
              </button>
           </div>
           <div className="mt-3 text-center">
              <button 
                onClick={seedAllDummyUsers}
                disabled={loading}
                className="px-4 py-2 w-full text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Seeding...' : 'Seed Database with All Dummy Users'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
