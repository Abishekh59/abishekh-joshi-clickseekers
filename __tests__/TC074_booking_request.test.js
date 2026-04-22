/**
 * TC074 — Booking Request as Client to Photographer
 * Verifies that apiService.createBooking() successfully creates
 * a booking request from a client to a photographer.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const MOCK_CLIENT_TOKEN = 'valid-client-token';

const BOOKING_PAYLOAD = {
  photographer_id: 'photographer-uuid-001',
  package_id: 5,
  date: '2026-05-15 10:00 AM',
  end_date: '2026-05-16 10:00 AM',
  event_type: 'Wedding',
  amount: 25000,
  location: 'Kathmandu, Nepal',
  notes: 'We need both indoor and outdoor coverage',
};

const MOCK_BOOKING_RESPONSE = {
  success: true,
  message: 'Booking request sent successfully',
  data: {
    booking_id: 201,
    photographer_id: 'photographer-uuid-001',
    client_id: 'client-uuid-002',
    package_id: 5,
    date: '2026-05-15T10:00:00Z',
    end_date: '2026-05-16T10:00:00Z',
    event_type: 'Wedding',
    amount: 25000,
    location: 'Kathmandu, Nepal',
    notes: 'We need both indoor and outdoor coverage',
    status: 'PENDING',
    created_at: '2026-04-05T12:00:00Z',
  },
};

describe('TC074: Booking request as client to photographer', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_BOOKING_RESPONSE);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should create a booking request with PENDING status and all details', async () => {
    const result = await apiService.createBooking(BOOKING_PAYLOAD, MOCK_CLIENT_TOKEN);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.booking_id).toBeDefined();
    expect(result.data.status).toBe('PENDING');
    expect(result.data.photographer_id).toBe(BOOKING_PAYLOAD.photographer_id);

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/bookings/create');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_CLIENT_TOKEN}`);
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.photographer_id).toBe(BOOKING_PAYLOAD.photographer_id);
    expect(body.package_id).toBe(BOOKING_PAYLOAD.package_id);
    expect(body.date).toBe(BOOKING_PAYLOAD.date);
    expect(body.end_date).toBe(BOOKING_PAYLOAD.end_date);
    expect(body.event_type).toBe('Wedding');
    expect(body.amount).toBe(25000);
    expect(body.location).toBe('Kathmandu, Nepal');
    expect(body.notes).toBe(BOOKING_PAYLOAD.notes);
  });
});
