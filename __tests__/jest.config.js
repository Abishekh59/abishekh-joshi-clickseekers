/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: true,
  testEnvironment: 'node',
  // Use babel-preset-expo which is already installed and handles TS + RN
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: [
          ['babel-preset-expo', { jsxRuntime: 'automatic' }],
        ],
      },
    ],
  },
  // Let babel-jest transform the source files in services/ and utils/
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-native-async-storage)/)',
  ],
  // Map native modules to lightweight mocks
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__tests__/helpers/reactNativeMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/helpers/asyncStorageMock.js',
  },
};
