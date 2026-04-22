/**
 * Mock fetch helper for unit tests.
 * Returns a jest mock that resolves with the provided response body & status.
 */

function createMockFetch(status, body, options = {}) {
  const { ok = status >= 200 && status < 300 } = options;
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: {
      get: jest.fn((header) => {
        if (header.toLowerCase() === 'content-type') return 'application/json';
        return null;
      }),
    },
  });
}

function createMockFetchSequence(responses) {
  const mock = jest.fn();
  responses.forEach((resp, index) => {
    const { status, body, options = {} } = resp;
    const ok = options.ok !== undefined ? options.ok : (status >= 200 && status < 300);
    mock.mockResolvedValueOnce({
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      headers: {
        get: jest.fn((header) => {
          if (header.toLowerCase() === 'content-type') return 'application/json';
          return null;
        }),
      },
    });
  });
  return mock;
}

module.exports = { createMockFetch, createMockFetchSequence };
