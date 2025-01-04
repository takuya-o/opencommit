import { OpenAiConfig, OpenAiEngine } from './openAi'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GroqConfig extends OpenAiConfig {}

export class GroqEngine extends OpenAiEngine {
  constructor(config: GroqConfig) {
    config.baseURL = 'https://api.groq.com/openai/v1'
    super(config)
  }
}
