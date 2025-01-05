/** @type {import('ts-jest').JestConfigWithTsJest} **/
import { createJsWithTsEsmPreset } from 'ts-jest'

const presetConfig = createJsWithTsEsmPreset({
  //...options
  // tsconfig:
  // isolatedModules:
  // compiler:
  // astTransformers:
  diagnostics: false,
  // stringifyContentPathRegex:
})

export default {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  
  testTimeout: 100_000,
  coverageProvider: 'v8',
  moduleDirectories: ['node_modules', 'src'],
  ...presetConfig,
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.ts'],
  testRegex: ['.*\\.test\\.ts$'],
  transformIgnorePatterns: ['node_modules/(?!cli-testing-library)'],
};