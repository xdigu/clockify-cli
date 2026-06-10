/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@clockify/(.*)$": "<rootDir>/src/clockify/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@prompts/(.*)$": "<rootDir>/src/prompts/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/cli.ts", "!src/__tests__/**"],
  coverageThreshold: {
    global: {
      branches: 89,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
