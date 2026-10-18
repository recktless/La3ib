import { describe, it, expect, vi, beforeEach } from 'vitest';

const authMocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn()
}));

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    sendPasswordResetEmail: (...args: any[]) => authMocks.sendPasswordResetEmail(...args),
    verifyPasswordResetCode: (...args: any[]) => authMocks.verifyPasswordResetCode(...args),
    confirmPasswordReset: (...args: any[]) => authMocks.confirmPasswordReset(...args)
  };
});

import {
  sendPasswordReset,
  verifyResetCode,
  confirmResetPassword,
  extractAuthActionParams,
  clearAuthActionParams,
  _setTestAuthInstance
} from '../src/lib/firebase';

describe('Focused Authentication Tests: Password Reset Flow', () => {
  const mockAuthInstance = { currentUser: null, app: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    _setTestAuthInstance(mockAuthInstance);
  });

  describe('1. sendPasswordReset', () => {
    it('throws error when Firebase Auth instance is not initialized', async () => {
      _setTestAuthInstance(null);
      await expect(sendPasswordReset('user@example.com')).rejects.toThrow('Firebase Auth is not configured.');
    });

    it('rejects empty or malformed email addresses', async () => {
      await expect(sendPasswordReset('')).rejects.toThrow('Please enter a valid email address.');
      await expect(sendPasswordReset('invalid-email-no-at')).rejects.toThrow('Please enter a valid email address.');
      expect(authMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('configures ActionCodeSettings with app URL and handleCodeInApp: false for web compatibility', async () => {
      authMocks.sendPasswordResetEmail.mockResolvedValueOnce(undefined);

      await sendPasswordReset('user@example.com');

      expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [authArg, emailArg, actionSettings] = authMocks.sendPasswordResetEmail.mock.calls[0];
      expect(authArg).toBe(mockAuthInstance);
      expect(emailArg).toBe('user@example.com');
      expect(actionSettings).toBeDefined();
      expect(actionSettings.handleCodeInApp).toBe(false);
      expect(typeof actionSettings.url).toBe('string');
      expect(actionSettings.url.endsWith('/')).toBe(true);
    });

    it('suppresses account enumeration leaks when user is not found', async () => {
      authMocks.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      // Must resolve without throwing so attackers cannot enumerate registered users
      await expect(sendPasswordReset('nonexistent@example.com')).resolves.toBeUndefined();
    });

    it('falls back gracefully to standard email if domain is not whitelisted (auth/unauthorized-continue-uri)', async () => {
      // First attempt with actionCodeSettings fails with unauthorized continue URI
      authMocks.sendPasswordResetEmail
        .mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' })
        .mockResolvedValueOnce(undefined); // Fallback attempt without settings succeeds

      await sendPasswordReset('player@example.com');

      expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(2);
      // Fallback call should not pass actionCodeSettings
      expect(authMocks.sendPasswordResetEmail.mock.calls[1][2]).toBeUndefined();
    });

    it('maps network errors cleanly', async () => {
      authMocks.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
      await expect(sendPasswordReset('player@example.com')).rejects.toThrow('Network error. Please check your internet connection.');
    });

    it('maps too-many-requests rate limit errors cleanly', async () => {
      authMocks.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
      await expect(sendPasswordReset('player@example.com')).rejects.toThrow('Too many password reset requests. Please wait a few minutes.');
    });
  });

  describe('2. verifyResetCode', () => {
    it('throws error when reset code is empty or missing', async () => {
      await expect(verifyResetCode('')).rejects.toThrow('Password reset code is missing or empty.');
      await expect(verifyResetCode('   ')).rejects.toThrow('Password reset code is missing or empty.');
      expect(authMocks.verifyPasswordResetCode).not.toHaveBeenCalled();
    });

    it('calls verifyPasswordResetCode and returns user email on success', async () => {
      authMocks.verifyPasswordResetCode.mockResolvedValueOnce('user@example.com');

      const email = await verifyResetCode('valid-oob-code-123');

      expect(email).toBe('user@example.com');
      expect(authMocks.verifyPasswordResetCode).toHaveBeenCalledWith(mockAuthInstance, 'valid-oob-code-123');
    });

    it('handles expired action code with specific user message', async () => {
      authMocks.verifyPasswordResetCode.mockRejectedValueOnce({ code: 'auth/expired-action-code' });

      await expect(verifyResetCode('expired-oob-code')).rejects.toThrow(
        'The password reset link has expired. Please request a new one.'
      );
    });

    it('handles invalid or already-used action code with clear message', async () => {
      authMocks.verifyPasswordResetCode.mockRejectedValueOnce({ code: 'auth/invalid-action-code' });

      await expect(verifyResetCode('used-or-invalid-code')).rejects.toThrow(
        'This password reset link is invalid or has already been used. Please request a new one.'
      );
    });

    it('handles user-disabled error', async () => {
      authMocks.verifyPasswordResetCode.mockRejectedValueOnce({ code: 'auth/user-disabled' });

      await expect(verifyResetCode('disabled-user-code')).rejects.toThrow(
        'This user account has been disabled.'
      );
    });
  });

  describe('3. confirmResetPassword', () => {
    it('rejects short passwords (< 6 characters) before calling Firebase', async () => {
      await expect(confirmResetPassword('code-123', '12345')).rejects.toThrow(
        'Password must be at least 6 characters long.'
      );
      expect(authMocks.confirmPasswordReset).not.toHaveBeenCalled();
    });

    it('calls confirmPasswordReset with code and new password', async () => {
      authMocks.confirmPasswordReset.mockResolvedValueOnce(undefined);

      await confirmResetPassword('valid-code-123', 'newSecretPassword2026');

      expect(authMocks.confirmPasswordReset).toHaveBeenCalledWith(
        mockAuthInstance,
        'valid-code-123',
        'newSecretPassword2026'
      );
    });

    it('handles weak-password rejection from Firebase', async () => {
      authMocks.confirmPasswordReset.mockRejectedValueOnce({ code: 'auth/weak-password' });

      await expect(confirmResetPassword('code-123', 'abcdef')).rejects.toThrow(
        'Password is too weak. Must be at least 6 characters.'
      );
    });

    it('handles expired or already-used action code during confirmation', async () => {
      authMocks.confirmPasswordReset.mockRejectedValueOnce({ code: 'auth/invalid-action-code' });

      await expect(confirmResetPassword('code-123', 'validPassword123')).rejects.toThrow(
        'This password reset link is invalid or has already been used. Please request a new one.'
      );
    });
  });

  describe('4. extractAuthActionParams and clearAuthActionParams', () => {
    it('extracts mode and oobCode from standard search query parameters', () => {
      const search = '?mode=resetPassword&oobCode=testOobCode123&apiKey=testApiKey';
      const result = extractAuthActionParams(search, '');

      expect(result.mode).toBe('resetPassword');
      expect(result.oobCode).toBe('testOobCode123');
      expect(result.apiKey).toBe('testApiKey');
    });

    it('extracts mode and oobCode from hash fragments when query is in hash', () => {
      const hash = '#/?mode=resetPassword&oobCode=hashOobCode456&apiKey=hashKey';
      const result = extractAuthActionParams('', hash);

      expect(result.mode).toBe('resetPassword');
      expect(result.oobCode).toBe('hashOobCode456');
    });

    it('extracts mode and oobCode from hash without question mark (#mode=resetPassword&oobCode=code789)', () => {
      const hash = '#mode=resetPassword&oobCode=code789';
      const result = extractAuthActionParams('', hash);

      expect(result.mode).toBe('resetPassword');
      expect(result.oobCode).toBe('code789');
    });

    it('returns null values when query params are absent', () => {
      const result = extractAuthActionParams('', '');
      expect(result.mode).toBeNull();
      expect(result.oobCode).toBeNull();
      expect(result.apiKey).toBeNull();
    });

    it('clears action parameters from window URL using history.replaceState', () => {
      const mockReplaceState = vi.fn();
      const originalWindow = (globalThis as any).window;

      (globalThis as any).window = {
        location: new URL('http://localhost:3000/?mode=resetPassword&oobCode=secretCode123&apiKey=testApiKey'),
        history: {
          replaceState: mockReplaceState
        }
      };

      clearAuthActionParams();

      expect(mockReplaceState).toHaveBeenCalledTimes(1);
      const [stateArg, titleArg, urlArg] = mockReplaceState.mock.calls[0];
      expect(stateArg).toEqual({});
      expect(urlArg).toBe('/');

      // Restore original window
      (globalThis as any).window = originalWindow;
    });
  });
});
