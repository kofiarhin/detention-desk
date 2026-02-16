// jest.config.js
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/server"],
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/server/tests/setup.js"],
  verbose: true,

  // ✅ no coverage for now
  collectCoverage: false,
  coverageThreshold: undefined,
};
