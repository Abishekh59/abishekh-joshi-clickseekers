/**
 * TC069 — Unsuccessful OTP Send for Unregistered Email
 * Verifies that apiService.forgotPassword() throws an error
 * when an unregistered email is used for forgot password.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const UNREGISTERED_EMAIL = 'nonexistent_user_xyz@example.com';

const MOCK_ERROR_RESPONSE = {
  success: false,
  message: 'No account found with this email address',
};

describe('TC069: Unsuccessful OTP send if unregistered email', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(404, MOCK_ERROR_RESPONSE, { ok: false });
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should throw error when email is not registered', async () => {
    await expect(apiService.forgotPassword({ email: UNREGISTERED_EMAIL }))
      .rejects
      .toThrow('No account found with this email address');

    // Verify it still called the correct endpoint
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/forgot-password');
    const body = JSON.parse(options.body);
    expect(body.email).toBe(UNREGISTERED_EMAIL);
  });
});
