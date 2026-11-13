import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { syncUserWithSql } from '../services/apiClient';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void nextUser
          .getIdToken()
          .then((token) => syncUserWithSql(token))
          .catch((err) => {
            console.error('SQL profile sync error:', err);
          });
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
          : 'Không thể đăng nhập bằng Google lúc này. Vui lòng thử lại.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        signInWithGoogle,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
