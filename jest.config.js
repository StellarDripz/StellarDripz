/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  coverageProvider: "v8",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: "tsconfig.json", allowJs: true }],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "/node_modules/(?!@(stellar|noble|walletconnect)|uint8array|feaxios|eventsource|smol-toml|multiformats|@lit|idb-keyval|@stablelib|uint8arrays)",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
};

