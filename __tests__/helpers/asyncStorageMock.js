/**
 * Minimal AsyncStorage mock for unit tests.
 * The api.ts service doesn't directly import AsyncStorage,
 * but this is needed in case any transitive import pulls it in.
 */
const asyncStorageMock = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
};

module.exports = asyncStorageMock;
