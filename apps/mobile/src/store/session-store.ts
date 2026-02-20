import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { AppRole, RoleSession } from '../types';

// ---------------------------------------------------------------------------
// expo-secure-store async adapter for Zustand persist
// Only user profile data and activeRole are persisted; tokens are always
// treated as ephemeral and re-acquired via the refresh-token flow.
// ---------------------------------------------------------------------------
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const emptySession = (): RoleSession => ({
  accessToken: null,
  refreshToken: null,
  user: null,
});

interface SessionState {
  activeRole: AppRole | null;
  sessions: Record<AppRole, RoleSession>;
  setActiveRole: (role: AppRole | null) => void;
  setSession: (role: AppRole, session: Partial<RoleSession>) => void;
  clearSession: (role: AppRole) => void;
  clearAll: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeRole: null,
      sessions: {
        holder: emptySession(),
        issuer: emptySession(),
        recruiter: emptySession(),
      },
      setActiveRole: (role) => set({ activeRole: role }),
      setSession: (role, session) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [role]: {
              ...state.sessions[role],
              ...session,
            },
          },
        })),
      clearSession: (role) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [role]: emptySession(),
          },
        })),
      clearAll: () =>
        set({
          activeRole: null,
          sessions: {
            holder: emptySession(),
            issuer: emptySession(),
            recruiter: emptySession(),
          },
        }),
    }),
    {
      name: 'credity-session',
      storage: createJSONStorage(() => secureStoreAdapter),
      // Only persist activeRole and user profiles — never persist tokens
      partialize: (state) => ({
        activeRole: state.activeRole,
        sessions: {
          holder: { user: state.sessions.holder.user, accessToken: null, refreshToken: null },
          issuer: { user: state.sessions.issuer.user, accessToken: null, refreshToken: null },
          recruiter: { user: state.sessions.recruiter.user, accessToken: null, refreshToken: null },
        },
      }),
    },
  ),
);
