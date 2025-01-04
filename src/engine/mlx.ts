import axios, { AxiosInstance } from 'axios'
import { OpenAI } from 'openai'
import { AiEngine, AiEngineConfig } from './Engine'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MLXConfig extends AiEngineConfig {}

export class MLXEngine implements AiEngine {
  config: MLXConfig
  client: AxiosInstance

  constructor(config: MLXConfig) {
    this.config = config
    this.client = axios.create({
      url: config.baseURL
        ? `${config.baseURL}/${config.apiKey}`
        : 'http://localhost:8080/v1/chat/completions',
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async generateCommitMessage(
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>,
  ): Promise<string | undefined> {
    const params = {
      messages,
      temperature: 0,
      top_p: 0.1,
      repetition_penalty: 1.5,
      stream: false,
    }
    try {
      const response = await this.client.post(
        this.client.getUri(this.config),
        params,
      )

      const choices = response.data.choices
      const message = choices[0].message

      return message?.content
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.message
        throw new Error(`MLX provider error: ${message}`)
      } else {
        const message = (err as Error).message
        throw new Error(`MLX provider error: ${message}`)
      }
    }
  }
}
