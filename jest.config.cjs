module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/engine'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'engine/**/*.ts',
    '!engine/**/*.d.ts',
    '!engine/**/__tests__/**',
  ],
};
