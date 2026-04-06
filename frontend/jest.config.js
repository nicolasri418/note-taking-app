/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterFramework: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: { jsx: 'react-jsx' },
      useESM: true,
    }],
  },
};
