module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.js',
        '!<rootDir>/src/server.js'
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'json-summary']
};
