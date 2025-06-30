export default {
  testEnvironment: 'node',
  preset: 'jest-environment-node',
  testMatch: [
    '<rootDir>/tests/**/*.js'
  ],
  transform: {},
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/mock_server.js'
  ],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
