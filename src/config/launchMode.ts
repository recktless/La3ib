/**
 * Centralized Pre-Launch & Coming Soon Configuration for La3ib | لاعب
 *
 * Controls whether the public-facing animated Coming Soon landing page is active.
 *
 * - When `COMING_SOON_MODE = true`:
 *   Public visitors see the animated Coming Soon landing page with floating sports illustrations.
 *   Authorized administrators can bypass using the discreet Admin Access modal (password: 4709 + admin auth).
 *
 * - When `COMING_SOON_MODE = false`:
 *   The full La3ib application is live and accessible to all visitors.
 */
export const COMING_SOON_MODE = true;

/**
 * Storage keys used for preserving verified administrator bypass state.
 */
export const ADMIN_BYPASS_STORAGE_KEY = 'la3ib_admin_bypass_token';
export const ADMIN_BYPASS_EXPIRY_KEY = 'la3ib_admin_bypass_expiry';
