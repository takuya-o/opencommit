import { i18n } from '../../i18n/index.js'

export type ConsistencyPrompt = (typeof i18n)[keyof typeof i18n]

export type CommitlintLLMConfig = {
  hash: string
  prompts: string[]
  consistency: {
    [key: string]: ConsistencyPrompt
  }
}
