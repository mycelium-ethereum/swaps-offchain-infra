module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: [],
  verbose: true,
  // setupFilesAfterEnv: ["./test/setup.js"],
};
