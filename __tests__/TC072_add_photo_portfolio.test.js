/**
 * TC072 — Add Photo in Portfolio
 * Verifies that apiService.uploadPortfolioImage() successfully uploads
 * a photo with title, category, and file data to the photographer's portfolio.
 */

const { createMockFetch } = require('./helpers/mockFetch');

const MOCK_TOKEN = 'valid-test-token-portfolio';

const UPLOAD_PAYLOAD = {
  title: 'Beautiful Sunset at Phewa Lake',
  description: 'Golden hour shot capturing the stunning reflection of Annapurna range',
  location: 'Pokhara, Nepal',
  category: 'LANDSCAPE',
  file: {
    uri: 'file:///Users/abishek/photos/sunset.jpg',
    name: 'sunset.jpg',
    type: 'image/jpeg',
  },
};

const MOCK_UPLOAD_RESPONSE = {
  success: true,
  message: 'Portfolio photo uploaded successfully!',
  data: {
    image_id: 101,
    portfolio_id: 5,
    title: 'Beautiful Sunset at Phewa Lake',
    description: 'Golden hour shot capturing the stunning reflection of Annapurna range',
    location: 'Pokhara, Nepal',
    image_url: '/uploads/portfolio/sunset_1680000000.jpg',
    likes_count: 0,
    views_count: 0,
    comments_count: 0,
    created_at: '2026-04-05T12:00:00Z',
    updated_at: '2026-04-05T12:00:00Z',
  },
};

describe('TC072: Add photo in portfolio', () => {
  let apiService;

  beforeEach(() => {
    jest.resetModules();
    global.__DEV__ = true;
    global.FormData = class {
      constructor() { this._data = {}; }
      append(key, value) { this._data[key] = value; }
      get(key) { return this._data[key]; }
    };
    global.fetch = createMockFetch(200, MOCK_UPLOAD_RESPONSE);
    apiService = require('../services/api').apiService;
  });

  afterEach(() => {
    delete global.fetch;
    delete global.__DEV__;
    delete global.FormData;
  });

  it('should upload portfolio photo via FormData with correct payload and return image data', async () => {
    const result = await apiService.uploadPortfolioImage(UPLOAD_PAYLOAD, MOCK_TOKEN);

    // Verify response
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.image_id).toBeDefined();
    expect(result.data.title).toBe(UPLOAD_PAYLOAD.title);
    expect(result.data.likes_count).toBe(0);
    expect(result.data.views_count).toBe(0);
    expect(result.data.comments_count).toBe(0);

    // Verify request
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/photographer/portfolio/images');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`);

    // Verify FormData contents
    const formData = options.body;
    expect(formData._data.title).toBe(UPLOAD_PAYLOAD.title);
    expect(formData._data.category).toBe('LANDSCAPE');
    expect(formData._data.description).toBe(UPLOAD_PAYLOAD.description);
    expect(formData._data.location).toBe(UPLOAD_PAYLOAD.location);
    expect(formData._data.image).toBeDefined();
  });
});
