/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  setupFiles: [],
  transformIgnorePatterns: [
    "node_modules/(?!@stellar/stellar-sdk|@creit.tech/stellar-wallets-kit)",
  ],
};
// Jest: transform TypeScript with ts-jest, ignore node_modules
