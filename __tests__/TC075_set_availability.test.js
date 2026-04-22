/**
 * TC075 — Set Availability / Block Date
 * Verifies that apiService.savePhotographerAvailability() successfully
 * blocks specific dates on the photographer's availability calendar.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const MOCK_TOKEN = 'valid-test-token-availability';

const BLOCKED_DATES = [
  { date: '2026-05-20', reason: 'Personal commitment' },
  { date: '2026-05-21', reason: 'Personal commitment' },
  { date: '2026-05-22', reason: 'Sharma family wedding' },
];

const MOCK_SAVE_RESPONSE = {
  success: true,
  message: 'Availability saved successfully',
};

describe('TC075: Set availability / block date', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_SAVE_RESPONSE);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should save blocked dates with reasons and correct authorization', async () => {
    const result = await apiService.savePhotographerAvailability(BLOCKED_DATES, MOCK_TOKEN);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toContain('saved');

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/availability');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);

    // Verify payload
    const body = JSON.parse(options.body);
    expect(body.dates).toBeDefined();
    expect(Array.isArray(body.dates)).toBe(true);
    expect(body.dates.length).toBe(3);
    expect(body.dates[0].date).toBe('2026-05-20');
    expect(body.dates[0].reason).toBe('Personal commitment');
    expect(body.dates[2].date).toBe('2026-05-22');
    expect(body.dates[2].reason).toBe('Sharma family wedding');
  });
});
