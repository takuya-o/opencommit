import { CONFIG_MODES, getConfig } from './commands/config';
import {
  OpenAI as OpenAIApi,
  ClientOptions as OpenAiApiConfiguration
} from 'openai';
import { intro, outro } from '@clack/prompts';
import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import { ChatCompletionMessageParam as ChatCompletionRequestMessage } from 'openai/resources';
import { GenerateCommitMessageErrorEnum } from './generateCommitMessageFromGitDiff';
import axios from 'axios';
import chalk from 'chalk';
import { execa } from 'execa';
import { tokenCount } from './utils/tokenCount';

const config = getConfig();

const maxTokens = Number(config?.OCO_OPENAI_MAX_TOKENS) || 800;
const basePath = config?.OCO_OPENAI_BASE_PATH as string | undefined
const apiKey = config?.OCO_OPENAI_API_KEY as string | undefined
const apiType = config?.OCO_OPENAI_API_TYPE || 'openai';
const tokenLimit = Number(config?.OCO_TOKEN_LIMIT) || 4096;

const [command, mode] = process.argv.slice(2);

if (!apiKey && command !== 'config' && mode !== CONFIG_MODES.set) {
  intro('opencommit');

  outro(
    'OCO_OPENAI_API_KEY is not set, please run `oco config set OCO_OPENAI_API_KEY=<your token>. Make sure you add payment details, so API works.`'
  );
  outro(
    'For help look into README https://github.com/di-sukharev/opencommit#setup'
  );

  process.exit(1);
}

const MODEL = (config?.OCO_MODEL as string | undefined) ?? 'gpt-4o-mini';
const VERSION =
  (config?.OCO_OPENAI_VERSION as string | undefined) ?? '2024-10-21';

class OpenAi {
  private openAiApiConfiguration: OpenAiApiConfiguration = {
    apiKey: apiKey
  };
  private openAI!: OpenAIApi;

  constructor() {
    switch (apiType) {
      case 'azure':
        this.openAiApiConfiguration.defaultQuery = { 'api-version': VERSION };
        this.openAiApiConfiguration.defaultHeaders = { 'api-key': apiKey };
        if (basePath) {
          this.openAiApiConfiguration.baseURL =
            basePath + 'openai/deployments/' + MODEL;
        }
        break;
      case 'openai':
      default:
        if (basePath) {
          this.openAiApiConfiguration.baseURL = basePath;
        }
        break;
    }
    this.openAI = new OpenAIApi(this.openAiApiConfiguration);
  }

  public generateCommitMessage = async (
    messages: Array<ChatCompletionRequestMessage>
  ): Promise<string | undefined> => {
    const params: ChatCompletionCreateParamsBase = {
      model: MODEL,
      messages,
      temperature: 0,
      top_p: 0.1,
      max_tokens: maxTokens || 500
    };
    try {
      const REQUEST_TOKENS = messages
        .map((msg) => tokenCount((msg.content as string) || '') + 4)
        .reduce((a, b) => a + b, 0);

      if (REQUEST_TOKENS > tokenLimit - maxTokens) {
        throw new Error(GenerateCommitMessageErrorEnum.tooMuchTokens);
      }

      const data = await this.openAI.chat.completions.create(params); //   .createChatCompletion(params);

      const message = data.choices[0].message;

      return message?.content || '';
    } catch (error) {
      outro(`${chalk.red('✖')} ${JSON.stringify(params)}`);

      const err = error as Error;
      outro(`${chalk.red('✖')} ${err?.message || err}`);

      if (
        axios.isAxiosError<{ error?: { message: string } }>(error) &&
        error.response?.status === 401
      ) {
        const openAiError = error.response.data.error;

        if (openAiError?.message) outro(openAiError.message);
        outro(
          'For help look into README https://github.com/di-sukharev/opencommit#setup'
        );
      }

      throw err;
    }
  };
}

export const getOpenCommitLatestVersion = async (): Promise<
  string | undefined
> => {
  try {
    const { stdout } = await execa('npm', [
      'view',
      'github:takuya-o/opencommit',
      'version'
    ]);
    return stdout;
  } catch (e) {
    outro(`Error while getting the latest version of opencommit ${e}`);
    return undefined;
  }
};

export const api = new OpenAi();
