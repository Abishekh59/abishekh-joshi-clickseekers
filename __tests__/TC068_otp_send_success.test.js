/**
 * TC068 — OTP Send Success for Forgot Password
 * Verifies that apiService.forgotPassword() successfully sends an OTP
 * when a registered email address is provided.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const REGISTERED_EMAIL = 'joshiabishek987@gmail.com';

const MOCK_OTP_SUCCESS = {
  success: true,
  message: 'OTP sent to your email. Please check your inbox.',
};

describe('TC068: OTP send success for forgot password', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_OTP_SUCCESS);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should send OTP successfully for a registered email', async () => {
    const result = await apiService.forgotPassword({ email: REGISTERED_EMAIL });

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toContain('OTP sent');

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/forgot-password');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.email).toBe(REGISTERED_EMAIL);
  });
});
