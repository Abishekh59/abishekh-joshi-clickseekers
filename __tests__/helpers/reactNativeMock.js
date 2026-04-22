/**
 * Minimal react-native mock for unit tests.
 * Only stubs out what services/api.ts imports.
 */
module.exports = {
  Platform: {
    select: (obj) => obj.default ?? obj.ios ?? obj.android ?? null,
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
};
