import { intro, outro } from '@clack/prompts';
import axios from 'axios';
import chalk from 'chalk';
import {
  ChatCompletionRequestMessage,
  Configuration as OpenAiApiConfiguration,
  OpenAIApi
} from 'openai';

import {
  CONFIG_MODES,
  DEFAULT_MODEL_TOKEN_LIMIT,
  getConfig
} from './commands/config';
import { tokenCount } from './utils/tokenCount';
import { GenerateCommitMessageErrorEnum } from './generateCommitMessageFromGitDiff';
import { execa } from 'execa';

const config = getConfig();

let maxTokens = config?.OCO_OPENAI_MAX_TOKENS;
let basePath = config?.OCO_OPENAI_BASE_PATH;
let apiKey = config?.OCO_OPENAI_API_KEY;
let apiType = config?.OCO_OPENAI_API_TYPE || 'openai';

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

const MODEL = config?.OCO_MODEL || 'gpt-3.5-turbo';
const VERSION = config?.OCO_OPENAI_VERSION || '2023-05-15';

class OpenAi {
  private openAiApiConfiguration = new OpenAiApiConfiguration({
    apiKey: apiKey
  });
  private openAI!: OpenAIApi;

  constructor() {
    switch (apiType) {
      case 'azure':
        this.openAiApiConfiguration.baseOptions =  {
          headers: {
            "api-key": apiKey,
          },
          params: {
            'api-version': VERSION,
          }
        };
        if (basePath) {
          this.openAiApiConfiguration.basePath = basePath + 'openai/deployments/' + MODEL;
        }
        break;
      case 'openai':
      default:
        if (basePath) {
          this.openAiApiConfiguration.basePath = basePath;
        }
        break;
    }
    this.openAI = new OpenAIApi(this.openAiApiConfiguration);
  }

  public generateCommitMessage = async (
    messages: Array<ChatCompletionRequestMessage>
  ): Promise<string | undefined> => {
    const params = {
      model: MODEL,
      messages,
      temperature: 0,
      top_p: 0.1,
      max_tokens: maxTokens || 500
    };
    try {
      const REQUEST_TOKENS = messages
        .map((msg) => tokenCount(msg.content || '') + 4)
        .reduce((a, b) => a + b, 0);

      if (REQUEST_TOKENS > DEFAULT_MODEL_TOKEN_LIMIT - maxTokens) {
        throw new Error(GenerateCommitMessageErrorEnum.tooMuchTokens);
      }

      const { data } = await this.openAI.createChatCompletion(params);

      const message = data.choices[0].message;

      return (message?.content || '')
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
    const { stdout } = await execa('npm', ['view', 'github:takuya-o/opencommit', 'version']);
    return stdout;
  } catch (_) {
    outro('Error while getting the latest version of opencommit');
    return undefined;
  }
};

export const api = new OpenAi();
