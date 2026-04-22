/**
 * TC070 — Update Profile Success
 * Verifies that apiService.updatePhotographerProfile() successfully
 * updates and saves photographer profile data.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const MOCK_TOKEN = 'valid-test-token-profile';

const PROFILE_PAYLOAD = {
  full_name: 'Abishek Joshi Updated',
  phone: '9841234567',
  bio: 'Professional wedding and event photographer in Kathmandu',
  location: 'Kathmandu, Nepal',
  specialization: 'Wedding Photography',
};

const MOCK_UPDATE_RESPONSE = {
  success: true,
  message: 'Profile updated successfully',
  data: {
    user_id: '1',
    full_name: 'Abishek Joshi Updated',
    email: 'joshiabishek987@gmail.com',
    phone: '9841234567',
    profile_image: null,
    bio: 'Professional wedding and event photographer in Kathmandu',
    specialization: 'Wedding Photography',
    location: 'Kathmandu, Nepal',
    role: 'PHOTOGRAPHER',
    kyc_verified: false,
  },
};

describe('TC070: Update profile success', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_UPDATE_RESPONSE);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should update photographer profile successfully with all fields', async () => {
    const result = await apiService.updatePhotographerProfile(PROFILE_PAYLOAD, MOCK_TOKEN);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.full_name).toBe('Abishek Joshi Updated');
    expect(result.data.bio).toBe(PROFILE_PAYLOAD.bio);
    expect(result.data.location).toBe(PROFILE_PAYLOAD.location);
    expect(result.data.specialization).toBe(PROFILE_PAYLOAD.specialization);
    expect(result.data.email).toBe('joshiabishek987@gmail.com');
    expect(result.data.role).toBe('PHOTOGRAPHER');
    expect(result.data.phone).toBe('9841234567');

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/photographer-profile');
    expect(options.method).toBe('PUT');
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);
    const body = JSON.parse(options.body);
    expect(body.full_name).toBe(PROFILE_PAYLOAD.full_name);
    expect(body.phone).toBe(PROFILE_PAYLOAD.phone);
    expect(body.bio).toBe(PROFILE_PAYLOAD.bio);
    expect(body.location).toBe(PROFILE_PAYLOAD.location);
    expect(body.specialization).toBe(PROFILE_PAYLOAD.specialization);
  });
});
