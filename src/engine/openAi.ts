import axios from 'axios'
import { OpenAI } from 'openai'
import { GenerateCommitMessageErrorEnum } from '../generateCommitMessageFromGitDiff'
import { tokenCount } from '../utils/tokenCount'
import { AiEngine, AiEngineConfig } from './Engine'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OpenAiConfig extends AiEngineConfig {}

export class OpenAiEngine implements AiEngine {
  config: OpenAiConfig
  client: OpenAI

  constructor(config: OpenAiConfig) {
    this.config = config
    const openAIconfig: OpenAiConfig = { apiKey: config.apiKey } as OpenAiConfig

    ;(
      ['baseURL', 'defaultQuery', 'defaultHeaders'] as Array<keyof OpenAiConfig>
    ).forEach((key: keyof OpenAiConfig) => {
      if (config[key]) {
        openAIconfig[key] = config[key] as never
      }
    })

    this.client = new OpenAI(openAIconfig)
  }

  public generateCommitMessage = async (
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>,
  ): Promise<string | null> => {
    const params = {
      model: this.config.model,
      messages,
      temperature: 0,
      top_p: 0.1,
      max_tokens: this.config.maxTokensOutput,
    }

    try {
      const REQUEST_TOKENS = messages
        .map(msg => tokenCount(msg.content as string) + 4)
        .reduce((a, b) => a + b, 0)

      if (
        REQUEST_TOKENS >
        this.config.maxTokensInput - this.config.maxTokensOutput
      )
        throw new Error(GenerateCommitMessageErrorEnum.tooMuchTokens)

      const completion = await this.client.chat.completions.create(params)

      const message = completion.choices[0].message

      return message?.content
    } catch (error) {
      const err = error as Error
      if (
        axios.isAxiosError<{ error?: { message: string } }>(error) &&
        (error.response?.status === 401 || error.response?.status === 429)
      ) {
        const openAiError = error.response.data.error

        if (openAiError) throw new Error(openAiError.message)
      }

      throw err
    }
  }
}
