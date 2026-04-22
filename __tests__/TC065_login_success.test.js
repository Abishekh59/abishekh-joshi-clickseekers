 /**
 * TC065 — Successful Login
 * Verifies that apiService.login() returns a valid token and user object
 * when correct credentials are provided.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const VALID_CREDENTIALS = {
  email: 'joshiabishek987@gmail.com',
  password: 'abishek@123',
};

const MOCK_LOGIN_RESPONSE = {
  success: true,
  message: 'Login successful',
  data: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoiUEhPVE9HUkFQSEVSIn0.fake',
    user: {
      user_id: 1,
      full_name: 'Abishek Joshi',
      email: 'joshiabishek987@gmail.com',
      role: 'PHOTOGRAPHER',
      phone: '9800000000',
      profile_image: null,
      bio: null,
      kyc_verified: false,
      email_verified: true,
    },
  },
};

describe('TC065: Successful user login', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_LOGIN_RESPONSE);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should return a token and user object on valid login', async () => {
    const result = await apiService.login(VALID_CREDENTIALS);

    // Verify fetch was called with the correct endpoint and payload
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/login');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(VALID_CREDENTIALS);

    // Verify response structure
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.token).toBeTruthy();
    expect(typeof result.data.token).toBe('string');
    expect(result.data.user).toBeDefined();
    expect(result.data.user.email).toBe(VALID_CREDENTIALS.email);
    expect(result.data.user.role).toBe('PHOTOGRAPHER');
    expect(result.data.user.user_id).toBeDefined();
    expect(typeof result.data.user.user_id).toBe('number');
  });
});
