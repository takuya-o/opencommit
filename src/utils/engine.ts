import { getConfig, OCO_AI_PROVIDER_ENUM } from '../commands/config'
import { AnthropicEngine } from '../engine/anthropic'
import { AzureEngine } from '../engine/azure'
import { AiEngine } from '../engine/Engine'
import { FlowiseEngine } from '../engine/flowise'
import { GeminiEngine } from '../engine/gemini'
import { OllamaEngine } from '../engine/ollama'
import { OpenAiEngine } from '../engine/openAi'
import { MistralAiEngine } from '../engine/mistral'
import { TestAi, TestMockType } from '../engine/testAi'
import { GroqEngine } from '../engine/groq'
import { MLXEngine } from '../engine/mlx'

export function getEngine(): AiEngine {
  const config = getConfig()
  const provider = config.OCO_AI_PROVIDER

  const DEFAULT_CONFIG = {
    model: config.OCO_MODEL!,
    maxTokensOutput: config.OCO_TOKENS_MAX_OUTPUT!,
    maxTokensInput: config.OCO_TOKENS_MAX_INPUT!,
    baseURL: config.OCO_API_URL!,
    apiKey: config.OCO_API_KEY!,
  }

  switch (provider) {
    case OCO_AI_PROVIDER_ENUM.OLLAMA:
      return new OllamaEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.ANTHROPIC:
      return new AnthropicEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.TEST:
      return new TestAi(config.OCO_TEST_MOCK_TYPE as TestMockType)

    case OCO_AI_PROVIDER_ENUM.GEMINI:
      return new GeminiEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.GOOGLE:
      if (!DEFAULT_CONFIG.baseURL) {
        // See: https://developers.googleblog.com/en/gemini-is-now-accessible-from-the-openai-library/
        DEFAULT_CONFIG.baseURL =
          'https://generativelanguage.googleapis.com/v1beta/'
      }
      return new OpenAiEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.AZURE:
      // DEFAULT_CONFIG.defaultQuery = { 'api-version': config.OCO_OPENAI_VERSION ?? '2024-10-21' }
      // DEFAULT_CONFIG.defaultHeaders = { 'api-key': config.OCO_API_KEY }
      // if (config.OCO_API_URL) {
      //   DEFAULT_CONFIG.baseURL = config.OCO_API_URL + 'openai/deployments/' + config.OCO_MODEL
      // }
      // return new OpenAiEngine(DEFAULT_CONFIG);
      return new AzureEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.FLOWISE:
      return new FlowiseEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.GROQ:
      return new GroqEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.MISTRAL:
      return new MistralAiEngine(DEFAULT_CONFIG)

    case OCO_AI_PROVIDER_ENUM.MLX:
      return new MLXEngine(DEFAULT_CONFIG)

    default:
      return new OpenAiEngine(DEFAULT_CONFIG)
  }
}
