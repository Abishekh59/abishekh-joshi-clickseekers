/**
 * TC067 — KYC Verification Flow
 * Verifies that apiService.submitKycForm() successfully submits
 * a multi-step KYC document and returns the expected status.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const MOCK_TOKEN = 'valid-test-token-kyc';

const KYC_PAYLOAD = {
  full_name: 'Abishek Joshi',
  date_of_birth: '2000-01-15',
  gender: 'Male',
  contact_number: '9800000000',
  email: 'joshiabishek987@gmail.com',
  address_city: 'Kathmandu',
  address_district: 'Kathmandu',
  address_province: 'Bagmati Province',
  user_role: 'PHOTOGRAPHER',
  document_type: 'CITIZENSHIP',
  document_number: 'CT-12345-67890',
  issued_by: 'Government of Nepal',
  issue_date: '2018-06-15',
  document_front_url: 'https://example.com/uploads/kyc/front.jpg',
  document_back_url: 'https://example.com/uploads/kyc/back.jpg',
  consent_confirmed: true,
  consent_verify: true,
  consent_false_info: true,
};

const MOCK_KYC_RESPONSE = {
  success: true,
  message: 'KYC submitted successfully',
  data: {
    kyc_id: 42,
    status: 'PENDING',
    remarks: null,
    verified_at: null,
    document_type: 'CITIZENSHIP',
    document_number: 'CT-12345-67890',
    document_front_url: 'https://example.com/uploads/kyc/front.jpg',
    document_back_url: 'https://example.com/uploads/kyc/back.jpg',
    updated_at: '2026-04-05T12:00:00Z',
  },
};

describe('TC067: KYC Verification Flow', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = createMockFetch(200, MOCK_KYC_RESPONSE);
    global.__DEV__ = true;
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
  });

  it('should submit KYC form successfully with PENDING status and correct payload', async () => {
    const result = await apiService.submitKycForm(KYC_PAYLOAD, MOCK_TOKEN);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe('PENDING');
    expect(result.data.kyc_id).toBeDefined();
    expect(result.data.document_type).toBe('CITIZENSHIP');

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/users/kyc/submit');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);

    const body = JSON.parse(options.body);
    expect(body.full_name).toBe(KYC_PAYLOAD.full_name);
    expect(body.document_type).toBe('CITIZENSHIP');
    expect(body.document_number).toBe(KYC_PAYLOAD.document_number);
    expect(body.consent_confirmed).toBe(true);
    expect(body.consent_verify).toBe(true);
    expect(body.consent_false_info).toBe(true);
    expect(body.document_front_url).toBeTruthy();
  });
});
