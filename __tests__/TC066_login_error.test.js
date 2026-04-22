/**
 * TC066 — Login Error with Invalid Credentials
 * Verifies that apiService.login() throws an error
 * when incorrect credentials are provided.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const INVALID_CREDENTIALS = {
  email: 'wrong@gmail.com',
  password: 'wrongpass',
};

const MOCK_ERROR_RESPONSE = {
  success: false,
  message: 'Invalid email or password',
};

describe('TC066: Login error with invalid credentials', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(401, MOCK_ERROR_RESPONSE, { ok: false });
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should throw an error and return no token for invalid credentials', async () => {
    // Verify login throws error
    await expect(apiService.login(INVALID_CREDENTIALS))
      .rejects
      .toThrow('Invalid email or password');

    // Verify it called the correct endpoint
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/login');
    expect(JSON.parse(options.body)).toEqual(INVALID_CREDENTIALS);
  });
});
