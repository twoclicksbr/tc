import { PropsWithChildren, useEffect, useState } from 'react';
import { LaravelAdapter } from '@/auth/adapters/laravel-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();

  const saveAuth = (next: AuthModel | undefined) => {
    setAuth(next);
    if (next) {
      authHelper.setAuth(next);
    } else {
      authHelper.removeAuth();
    }
  };

  const verify = async () => {
    const stored = authHelper.getAuth();
    if (!stored?.access_token) return;
    try {
      const user = await LaravelAdapter.me(stored.access_token);
      if (user) {
        setCurrentUser(user);
      } else {
        saveAuth(undefined);
        setCurrentUser(undefined);
      }
    } catch {
      saveAuth(undefined);
      setCurrentUser(undefined);
    }
  };

  useEffect(() => {
    verify().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { auth: newAuth } = await LaravelAdapter.login(email, password);
    saveAuth(newAuth);
    const user = await LaravelAdapter.me(newAuth.access_token);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = async () => {
    if (auth?.access_token) {
      await LaravelAdapter.logout(auth.access_token).catch(() => {});
    }
    saveAuth(undefined);
    setCurrentUser(undefined);
  };

  const getUser = async (): Promise<UserModel | null> => {
    const stored = authHelper.getAuth();
    if (!stored?.access_token) return null;
    return LaravelAdapter.me(stored.access_token);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        logout,
        verify,
        getUser,
        register: async () => {},
        requestPasswordReset: async () => {},
        resetPassword: async () => {},
        resendVerificationEmail: async () => {},
        updateProfile: async () => ({}) as UserModel,
        isAdmin: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
