import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './session-store';
import { AppRole } from '../types';

describe('useSessionStore', () => {
  const store = useSessionStore;

  beforeEach(() => {
    store.getState().clearAll();
  });

  it('should have correct initial state', () => {
    const state = store.getState();
    expect(state.activeRole).toBeNull();
    expect(state.sessions).toEqual({
      holder: { accessToken: null, refreshToken: null, user: null },
      issuer: { accessToken: null, refreshToken: null, user: null },
      recruiter: { accessToken: null, refreshToken: null, user: null },
    });
  });

  describe('setActiveRole', () => {
    it('should set active role', () => {
      store.getState().setActiveRole('holder');
      expect(store.getState().activeRole).toBe('holder');

      store.getState().setActiveRole('issuer');
      expect(store.getState().activeRole).toBe('issuer');
    });

    it('should clear active role', () => {
      store.getState().setActiveRole('holder');
      store.getState().setActiveRole(null);
      expect(store.getState().activeRole).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should set session for a role', () => {
      const session = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1' },
      };
      store.getState().setSession('holder', session);

      expect(store.getState().sessions.holder).toEqual(session);
    });

    it('should update session partially', () => {
      const initialSession = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1' },
      };
      store.getState().setSession('holder', initialSession);

      store.getState().setSession('holder', { accessToken: 'new-access-token' });

      expect(store.getState().sessions.holder).toEqual({
        ...initialSession,
        accessToken: 'new-access-token',
      });
    });

    it('should not affect other roles', () => {
      const holderSession = {
        accessToken: 'holder-token',
        refreshToken: 'holder-refresh',
        user: { id: 'holder-1' },
      };
      store.getState().setSession('holder', holderSession);

      const issuerSession = {
        accessToken: 'issuer-token',
        refreshToken: 'issuer-refresh',
        user: { id: 'issuer-1' },
      };
      store.getState().setSession('issuer', issuerSession);

      expect(store.getState().sessions.holder).toEqual(holderSession);
      expect(store.getState().sessions.issuer).toEqual(issuerSession);
      expect(store.getState().sessions.recruiter).toEqual({
        accessToken: null,
        refreshToken: null,
        user: null,
      });
    });
  });

  describe('clearSession', () => {
    it('should clear session for a specific role', () => {
      const session = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1' },
      };
      store.getState().setSession('holder', session);
      store.getState().setSession('issuer', session);

      store.getState().clearSession('holder');

      expect(store.getState().sessions.holder).toEqual({
        accessToken: null,
        refreshToken: null,
        user: null,
      });
      // Verify other sessions are untouched
      expect(store.getState().sessions.issuer).toEqual(session);
    });
  });

  describe('clearAll', () => {
    it('should reset store to initial state', () => {
      store.getState().setActiveRole('holder');
      store.getState().setSession('holder', {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 'user' },
      });

      store.getState().clearAll();

      const state = store.getState();
      expect(state.activeRole).toBeNull();
      expect(state.sessions).toEqual({
        holder: { accessToken: null, refreshToken: null, user: null },
        issuer: { accessToken: null, refreshToken: null, user: null },
        recruiter: { accessToken: null, refreshToken: null, user: null },
      });
    });
  });
});
