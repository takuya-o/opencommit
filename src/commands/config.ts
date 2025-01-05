/* eslint-disable max-lines */
import { intro, outro } from '@clack/prompts'
import chalk from 'chalk'
import { command } from 'cleye'
import * as dotenv from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { parse as iniParse, stringify as iniStringify } from 'ini'
import { homedir } from 'os'
import { join as pathJoin, resolve as pathResolve } from 'path'
//current import { COMMANDS } from '../CommandsEnum.js'
import { COMMANDS } from './ENUMS'
import { TEST_MOCK_TYPES } from '../engine/testAi'
import { getI18nLocal, i18n } from '../i18n'

export enum CONFIG_KEYS {
  OCO_OPENAI_API_KEY = 'OCO_OPENAI_API_KEY',
  OCO_OPENAI_MAX_TOKENS = 'OCO_OPENAI_MAX_TOKENS',
  OCO_OPENAI_BASE_PATH = 'OCO_OPENAI_BASE_PATH',
  OCO_OPENAI_API_TYPE = 'OCO_OPENAI_API_TYPE',
  OCO_OPENAI_VERSION = 'OCO_OPENAI_VERSION',
  //
  OCO_API_KEY = 'OCO_API_KEY',
  OCO_TOKENS_MAX_INPUT = 'OCO_TOKENS_MAX_INPUT',
  OCO_TOKENS_MAX_OUTPUT = 'OCO_TOKENS_MAX_OUTPUT',
  //
  OCO_DESCRIPTION = 'OCO_DESCRIPTION',
  OCO_EMOJI = 'OCO_EMOJI',
  OCO_MODEL = 'OCO_MODEL',
  OCO_TOKEN_LIMIT = 'OCO_TOKEN_LIMIT',
  OCO_LANGUAGE = 'OCO_LANGUAGE',
  OCO_WHY = 'OCO_WHY',
  OCO_MESSAGE_TEMPLATE_PLACEHOLDER = 'OCO_MESSAGE_TEMPLATE_PLACEHOLDER',
  OCO_PROMPT_MODULE = 'OCO_PROMPT_MODULE',
  OCO_AI_PROVIDER = 'OCO_AI_PROVIDER',
  OCO_ONE_LINE_COMMIT = 'OCO_ONE_LINE_COMMIT',
  OCO_TEST_MOCK_TYPE = 'OCO_TEST_MOCK_TYPE',
  OCO_API_URL = 'OCO_API_URL',
  OCO_DISABLE_GIT_PUSH = 'OCO_DISABLE_GIT_PUSH',
  //
  OCO_GITPUSH = 'OCO_GITPUSH', // todo: deprecate
  // for migration
  OCO_OLLAMA_API_KEY = 'OCO_OLLAMA_API_KEY',
  OCO_OLLAMA_API_URL = 'OCO_OLLAMA_API_URL',
  OCO_ANTHROPIC_API_KEY = 'OCO_ANTHROPIC_API_KEY',
  OCO_ANTHROPIC_BASE_PATH = 'OCO_ANTHROPIC_BASE_PATH',
  OCO_AZURE_API_KEY = 'OCO_AZURE_API_KEY',
  OCO_AZURE_ENDPOINT = 'OCO_AZURE_ENDPOINT',
  OCO_GEMINI_API_KEY = 'OCO_GEMINI_API_KEY',
  OCO_GEMINI_BASE_PATH = 'OCO_GEMINI_BASE_PATH',
  OCO_FLOWISE_API_KEY = 'OCO_FLOWISE_API_KEY',
  OCO_FLOWISE_ENDPOINT = 'OCO_FLOWISE_ENDPOINT',
}

export enum CONFIG_MODES {
  get = 'get',
  set = 'set',
}

export const MODEL_LIST = {
  openai: [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-instruct',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-0301',
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-16k-0613',
    'gpt-3.5-turbo-16k-0301',
    'gpt-4',
    'gpt-4-0314',
    'gpt-4-0613',
    'gpt-4-1106-preview',
    'gpt-4-0125-preview',
    'gpt-4-turbo-preview',
    'gpt-4-vision-preview',
    'gpt-4-1106-vision-preview',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'gpt-4-32k',
    'gpt-4-32k-0314',
    'gpt-4-32k-0613',
    'gpt-4o',
    'gpt-4o-2024-05-13',
    'gpt-4o-mini-2024-07-18',
    // current
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-11-20',
    'gpt-4o-mini-2024-07-18',
    'o1',
    'o1-2024-12-17',
    'o1-preview',
    'o1-preview-2024-09-12',
    'o1-mini',
    'o1-mini-2024-09-12',
  ],

  anthropic: [
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],

  gemini: [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro', //EOL 2025/02/15
    'gemini-pro-vision',
    'text-embedding-004',
    // current
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-8b',
  ],

  groq: [
    'llama3-70b-8192', // Meta Llama 3 70B (default one, no daily token limit and 14 400 reqs/day)
    'llama3-8b-8192', // Meta Llama 3 8B
    'llama-guard-3-8b', // Llama Guard 3 8B
    'llama-3.1-8b-instant', // Llama 3.1 8B (Preview)
    'llama-3.1-70b-versatile', // Llama 3.1 70B (Preview)
    'gemma-7b-it', // Gemma 7B
    'gemma2-9b-it', // Gemma 2 9B
  ],

  mistral: [
    'ministral-3b-2410',
    'ministral-3b-latest',
    'ministral-8b-2410',
    'ministral-8b-latest',
    'open-mistral-7b',
    'mistral-tiny',
    'mistral-tiny-2312',
    'open-mistral-nemo',
    'open-mistral-nemo-2407',
    'mistral-tiny-2407',
    'mistral-tiny-latest',
    'open-mixtral-8x7b',
    'mistral-small',
    'mistral-small-2312',
    'open-mixtral-8x22b',
    'open-mixtral-8x22b-2404',
    'mistral-small-2402',
    'mistral-small-2409',
    'mistral-small-latest',
    'mistral-medium-2312',
    'mistral-medium',
    'mistral-medium-latest',
    'mistral-large-2402',
    'mistral-large-2407',
    'mistral-large-2411',
    'mistral-large-latest',
    'pixtral-large-2411',
    'pixtral-large-latest',
    'codestral-2405',
    'codestral-latest',
    'codestral-mamba-2407',
    'open-codestral-mamba',
    'codestral-mamba-latest',
    'pixtral-12b-2409',
    'pixtral-12b',
    'pixtral-12b-latest',
    'mistral-embed',
    'mistral-moderation-2411',
    'mistral-moderation-latest',
  ],
}

const getDefaultModel = (provider: string | undefined): string => {
  switch (provider) {
    case 'ollama':
      return ''
    case 'mlx':
      return ''
    case 'anthropic':
      return MODEL_LIST.anthropic[0]
    case 'gemini':
      return MODEL_LIST.gemini[0]
    case 'groq':
      return MODEL_LIST.groq[0]
    case 'mistral':
      return MODEL_LIST.mistral[0]
    default:
      return MODEL_LIST.openai[0]
  }
}

export enum DEFAULT_TOKEN_LIMITS {
  DEFAULT_MAX_TOKENS_INPUT = 40960,
  DEFAULT_MAX_TOKENS_OUTPUT = 4096,
}

const validateConfig = (
  key: string,
  condition: unknown,
  validationMessage: string,
) => {
  if (!condition) {
    outro(`${chalk.red('✖')} wrong value for ${key}: ${validationMessage}.`)

    outro('For more help refer to docs https://github.com/takuya-o/opencommit')

    process.exit(1)
  }
}

export const configValidators = {
  [CONFIG_KEYS.OCO_OPENAI_API_KEY](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_OPENAI_API_KEY, value, 'Cannot be empty')
    // validateConfig(
    //   CONFIG_KEYS.OCO_OPENAI_API_KEY,
    //   value.startsWith('sk-'),
    //   'Must start with "sk-"'
    // );
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_KEY,
      typeof value === 'string' &&
        (value.length === 51 || value.length === 32 || value.length === 39),
      'Must be 51, 32, or 39 characters long',
    )
    return value as string
  },
  [CONFIG_KEYS.OCO_API_KEY](value: unknown, config: Partial<ConfigType> = {}) {
    if (config.OCO_AI_PROVIDER !== 'openai') return String(value)

    validateConfig(
      'OCO_API_KEY',
      typeof value === 'string' && value.length > 0,
      'Empty value is not allowed',
    )

    validateConfig(
      'OCO_API_KEY',
      value,
      'You need to provide the OCO_API_KEY when OCO_AI_PROVIDER set to "openai" (default) or "ollama" or "mlx" or "azure" or "gemini" or "flowise" or "anthropic". Run `oco config set OCO_API_KEY=your_key OCO_AI_PROVIDER=openai`',
    )

    return value as string
  },

  [CONFIG_KEYS.OCO_DESCRIPTION](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_DESCRIPTION,
      typeof value === 'boolean',
      'Must be boolean: true or false',
    )

    return value as boolean
  },

  [CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS](value: unknown) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value)
      validateConfig(
        CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS,
        !isNaN(Number(value)),
        'Must be a number',
      )
    }
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS,
      value ? typeof value === 'number' : undefined,
      'Must be a number',
    )

    return value as number
  },

  [CONFIG_KEYS.OCO_TOKENS_MAX_INPUT](value: unknown) {
    const max = parseInt(value as string) // TODO: Number()
    validateConfig(
      CONFIG_KEYS.OCO_TOKENS_MAX_INPUT,
      !isNaN(max),
      'Must be a number',
    )

    return max
  },

  [CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT](value: unknown) {
    const max = parseInt(value as string) // TODO: Number()
    validateConfig(
      CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT,
      !isNaN(max),
      'Must be a number',
    )

    return max
  },

  [CONFIG_KEYS.OCO_EMOJI](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_EMOJI,
      typeof value === 'boolean',
      'Must be boolean: true or false',
    )

    return value as boolean
  },
  [CONFIG_KEYS.OCO_DISABLE_GIT_PUSH](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_DISABLE_GIT_PUSH,
      typeof value === 'boolean',
      'Must be true or false',
    )
    return value as boolean
  },
  [CONFIG_KEYS.OCO_TOKEN_LIMIT](value: unknown) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value)
      validateConfig(
        CONFIG_KEYS.OCO_TOKEN_LIMIT,
        !isNaN(Number(value)),
        'Must be a number',
      )
    }
    validateConfig(
      CONFIG_KEYS.OCO_TOKEN_LIMIT,
      value ? typeof value === 'number' : undefined,
      'Must be a number',
    )
    return value as number
  },

  [CONFIG_KEYS.OCO_LANGUAGE](value: unknown) {
    const supportedLanguages = Object.keys(i18n)

    validateConfig(
      CONFIG_KEYS.OCO_LANGUAGE,
      getI18nLocal(String(value)),
      `${value} is not supported yet. Supported languages: ${supportedLanguages}`,
    )

    return getI18nLocal(String(value))
  },

  [CONFIG_KEYS.OCO_OPENAI_BASE_PATH](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_BASE_PATH,
      typeof value === 'string',
      'Must be string',
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_API_URL](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_API_URL,
      typeof value === 'string',
      `${value} is not a valid URL. It should start with 'http://' or 'https://'.`,
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_OPENAI_API_TYPE](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_TYPE,
      typeof value === 'string',
      'Must be string',
    )
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_TYPE,
      value === 'azure' ||
        value === 'google' ||
        value === 'gemini' ||
        value === 'openai' ||
        value === '',
      `${value} is not supported yet, use 'azure', 'google' or 'openai'(default)`,
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_OPENAI_VERSION](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_VERSION,
      typeof value === 'string' &&
        value.match(/^[1-9][0-9]{3}-[01][0-9]-[0-3][0-9]/), // TODO: -preview
      'Must be start with YYYY-MM-DD string',
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_MODEL](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_MODEL,
      typeof value === 'string' &&
        ([
          ...MODEL_LIST.openai,
          ...MODEL_LIST.anthropic,
          ...MODEL_LIST.gemini,
        ].includes(String(value)) ||
          (typeof value === 'string' &&
            value.match(/^[a-zA-Z0-9~-]{1,63}[a-zA-Z0-9]$/))),
      `${value} is not supported yet, use\n\n ${[
        ...MODEL_LIST.openai,
        ...MODEL_LIST.anthropic,
        ...MODEL_LIST.gemini,
      ].join('\n')} or model deployed name.`,
    )
    return value as string
  },
  [CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER,
      typeof value === 'string' && value.startsWith('$'),
      `${value} must start with $, for example: '$msg'`,
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_PROMPT_MODULE](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_PROMPT_MODULE,
      ['conventional-commit', '@commitlint'].includes(String(value)),
      `${value} is not supported yet, use '@commitlint' or 'conventional-commit' (default)`,
    )
    return String(value)
  },

  // todo: deprecate
  [CONFIG_KEYS.OCO_GITPUSH](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_GITPUSH,
      typeof value === 'boolean',
      'Must be true or false',
    )
    return value as boolean
  },

  [CONFIG_KEYS.OCO_AI_PROVIDER](value: unknown) {
    if (!value) value = 'openai'

    validateConfig(
      CONFIG_KEYS.OCO_AI_PROVIDER,
      typeof value === 'string' &&
        ([
          'openai',
          'mistral',
          'anthropic',
          'gemini',
          'azure',
          'test',
          'flowise',
          'groq',
          'google',
        ].includes(value) ||
          value.startsWith('ollama')),
      `${value} is not supported yet, use 'ollama', 'mlx', 'anthropic', 'azure', 'gemini', 'flowise', 'mistral' or 'openai' (default)`,
    )

    return value as string
  },

  [CONFIG_KEYS.OCO_ONE_LINE_COMMIT](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_ONE_LINE_COMMIT,
      typeof value === 'boolean',
      'Must be true or false',
    )

    return value as boolean
  },

  [CONFIG_KEYS.OCO_TEST_MOCK_TYPE](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_TEST_MOCK_TYPE,
      typeof value === 'string' &&
        TEST_MOCK_TYPES.includes(value as (typeof TEST_MOCK_TYPES)[number]),
      `${value} is not supported yet, use ${TEST_MOCK_TYPES.map(
        t => `'${t}'`,
      ).join(', ')}`,
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_WHY](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_WHY,
      typeof value === 'boolean',
      'Must be true or false',
    )
    return value as boolean
  },
}

export enum OCO_AI_PROVIDER_ENUM {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  AZURE = 'azure',
  TEST = 'test',
  FLOWISE = 'flowise',
  GROQ = 'groq',
  MISTRAL = 'mistral',
  MLX = 'mlx',
  GOOGLE = 'google',
}

export type ConfigType = {
  [CONFIG_KEYS.OCO_API_KEY]?: string
  [CONFIG_KEYS.OCO_TOKENS_MAX_INPUT]: number
  [CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT]: number
  [CONFIG_KEYS.OCO_API_URL]?: string
  [CONFIG_KEYS.OCO_DESCRIPTION]: boolean
  [CONFIG_KEYS.OCO_EMOJI]: boolean
  [CONFIG_KEYS.OCO_WHY]: boolean
  [CONFIG_KEYS.OCO_MODEL]: string
  [CONFIG_KEYS.OCO_LANGUAGE]: string
  [CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER]: string
  [CONFIG_KEYS.OCO_PROMPT_MODULE]: OCO_PROMPT_MODULE_ENUM
  [CONFIG_KEYS.OCO_AI_PROVIDER]: OCO_AI_PROVIDER_ENUM
  [CONFIG_KEYS.OCO_GITPUSH]: boolean
  [CONFIG_KEYS.OCO_ONE_LINE_COMMIT]: boolean
  [CONFIG_KEYS.OCO_TEST_MOCK_TYPE]: string
  // for migration
  [CONFIG_KEYS.OCO_OLLAMA_API_KEY]?: string
  [CONFIG_KEYS.OCO_OLLAMA_API_URL]?: string
  [CONFIG_KEYS.OCO_ANTHROPIC_API_KEY]?: string
  [CONFIG_KEYS.OCO_ANTHROPIC_BASE_PATH]?: string
  [CONFIG_KEYS.OCO_AZURE_API_KEY]?: string
  [CONFIG_KEYS.OCO_AZURE_ENDPOINT]?: string
  [CONFIG_KEYS.OCO_GEMINI_API_KEY]?: string
  [CONFIG_KEYS.OCO_GEMINI_BASE_PATH]?: string
  [CONFIG_KEYS.OCO_FLOWISE_API_KEY]?: string
  [CONFIG_KEYS.OCO_FLOWISE_ENDPOINT]?: string
  // current
  [CONFIG_KEYS.OCO_OPENAI_API_KEY]?: string
  [CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS]?: number
  [CONFIG_KEYS.OCO_DISABLE_GIT_PUSH]?: boolean
  [CONFIG_KEYS.OCO_TOKEN_LIMIT]?: number
  [CONFIG_KEYS.OCO_OPENAI_BASE_PATH]?: string
  [CONFIG_KEYS.OCO_OPENAI_API_TYPE]?: string
  [CONFIG_KEYS.OCO_OPENAI_VERSION]?: string
}

export const defaultConfigPath = pathJoin(homedir(), '.opencommit')
export const defaultEnvPath = pathResolve(process.cwd(), '.env')

// const assertConfigsAreValid = (config: Record<string, unknown>) => {
//   for (const [key, value] of Object.entries(config)) {
//     if (!value) continue;

//     if (typeof value === 'string' && ['null', 'undefined'].includes(value)) {
//       config[key] = undefined;
//       continue;
//     }

//     try {
//       const validate = configValidators[key as CONFIG_KEYS];
//       validate(value, config);
//     } catch (_error) {
//       outro(`Unknown '${key}' config option or missing validator.`);
//       outro(
//         `Manually fix the '.env' file or global '~/.opencommit' config file.`
//       );

//       process.exit(1);
//     }
//   }
// };

enum OCO_PROMPT_MODULE_ENUM {
  CONVENTIONAL_COMMIT = 'conventional-commit',
  COMMITLINT = '@commitlint',
}

export const DEFAULT_CONFIG: ConfigType = {
  [CONFIG_KEYS.OCO_TOKENS_MAX_INPUT]:
    DEFAULT_TOKEN_LIMITS.DEFAULT_MAX_TOKENS_INPUT,
  [CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT]:
    DEFAULT_TOKEN_LIMITS.DEFAULT_MAX_TOKENS_OUTPUT,
  [CONFIG_KEYS.OCO_DESCRIPTION]: false,
  [CONFIG_KEYS.OCO_EMOJI]: false,
  [CONFIG_KEYS.OCO_MODEL]: getDefaultModel('openai'),
  [CONFIG_KEYS.OCO_LANGUAGE]: 'en',
  [CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER]: '$msg',
  [CONFIG_KEYS.OCO_PROMPT_MODULE]: OCO_PROMPT_MODULE_ENUM.CONVENTIONAL_COMMIT,
  [CONFIG_KEYS.OCO_AI_PROVIDER]: OCO_AI_PROVIDER_ENUM.OPENAI,
  [CONFIG_KEYS.OCO_ONE_LINE_COMMIT]: false,
  [CONFIG_KEYS.OCO_TEST_MOCK_TYPE]: 'commit-message',
  [CONFIG_KEYS.OCO_WHY]: false,
  [CONFIG_KEYS.OCO_GITPUSH]: true, // todo: deprecate
  // current
  //OCO_OPENAI_API_KEY:
  [CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS]: 500, // --- WATER MARK ----
  //OCO_OPENAI_BASE_PATH:
  [CONFIG_KEYS.OCO_OPENAI_API_TYPE]: OCO_AI_PROVIDER_ENUM.OPENAI,
  [CONFIG_KEYS.OCO_OPENAI_VERSION]: '2024-10-21',
  [CONFIG_KEYS.OCO_TOKEN_LIMIT]: 4096,
  [CONFIG_KEYS.OCO_DISABLE_GIT_PUSH]: true,
}

const initGlobalConfig = (configPath: string = defaultConfigPath) => {
  writeFileSync(configPath, iniStringify(DEFAULT_CONFIG), 'utf8')
  console.info(`write initialized Global Config in ${configPath}`)
  return DEFAULT_CONFIG
}

const parseConfigVarValue = (value?: unknown) => {
  try {
    return JSON.parse(String(value))
  } catch (_error) {
    return value
  }
}

const getEnvConfig = (envPath: string, setDefaultValues = true) => {
  dotenv.config({ path: envPath })

  return {
    OCO_MODEL: process.env.OCO_MODEL,
    OCO_API_URL: process.env.OCO_API_URL,
    OCO_API_KEY: process.env.OCO_API_KEY,
    OCO_AI_PROVIDER: process.env.OCO_AI_PROVIDER as OCO_AI_PROVIDER_ENUM,

    OCO_TOKENS_MAX_INPUT: parseConfigVarValue(process.env.OCO_TOKENS_MAX_INPUT),
    OCO_TOKENS_MAX_OUTPUT: parseConfigVarValue(
      process.env.OCO_TOKENS_MAX_OUTPUT,
    ),

    OCO_DESCRIPTION: parseConfigVarValue(process.env.OCO_DESCRIPTION),
    OCO_EMOJI: parseConfigVarValue(process.env.OCO_EMOJI),
    OCO_LANGUAGE: process.env.OCO_LANGUAGE,
    OCO_MESSAGE_TEMPLATE_PLACEHOLDER:
      process.env.OCO_MESSAGE_TEMPLATE_PLACEHOLDER,
    OCO_PROMPT_MODULE: process.env.OCO_PROMPT_MODULE as OCO_PROMPT_MODULE_ENUM,
    OCO_ONE_LINE_COMMIT: parseConfigVarValue(process.env.OCO_ONE_LINE_COMMIT),
    OCO_TEST_MOCK_TYPE: process.env.OCO_TEST_MOCK_TYPE,

    OCO_GITPUSH: parseConfigVarValue(process.env.OCO_GITPUSH), // todo: deprecate
    // current
    OCO_OPENAI_API_KEY: process.env.OCO_OPENAI_API_KEY,
    OCO_OPENAI_MAX_TOKENS:
      Number(process.env.OCO_OPENAI_MAX_TOKENS) ||
      (setDefaultValues ? 500 : undefined),
    OCO_OPENAI_BASE_PATH: process.env.OCO_OPENAI_BASE_PATH,
    OCO_OPENAI_API_TYPE: process.env.OCO_OPENAI_API_TYPE,
    OCO_OPENAI_VERSION:
      process.env.OCO_OPENAI_VERSION ||
      (setDefaultValues ? '2024-10-21' : undefined),
    OCO_TOKEN_LIMIT:
      Number(process.env.OCO_TOKEN_LIMIT) ||
      (setDefaultValues ? 4096 : undefined),
    OCO_DISABLE_GIT_PUSH: parseConfigVarValue(process.env.OCO_DISABLE_GIT_PUSH),
  }
}

export function hideKEY(config: ConfigType): ConfigType {
  const hiddenConfig: ConfigType = { ...config }
  ;[
    CONFIG_KEYS.OCO_OPENAI_API_KEY,
    CONFIG_KEYS.OCO_API_KEY,
    CONFIG_KEYS.OCO_OLLAMA_API_KEY,
    CONFIG_KEYS.OCO_ANTHROPIC_API_KEY,
    CONFIG_KEYS.OCO_OPENAI_API_KEY,
    CONFIG_KEYS.OCO_AZURE_API_KEY,
    CONFIG_KEYS.OCO_GEMINI_API_KEY,
    CONFIG_KEYS.OCO_FLOWISE_API_KEY,
    CONFIG_KEYS.OCO_OPENAI_API_KEY,
  ].forEach(key => {
    if (hiddenConfig[key]) {
      hiddenConfig[key] = '********' as never // なぜnever?
    }
  })
  return hiddenConfig
}

export const writeGlobalConfig = (
  config: ConfigType,
  configPath: string = defaultConfigPath,
) => {
  writeFileSync(configPath, iniStringify(config), 'utf8')
  console.info(`write Global Config in ${configPath}`)
  configCache = config as ConfigType
}

export const getIsGlobalConfigFileExist = (
  configPath: string = defaultConfigPath,
) => {
  return existsSync(configPath)
}

export const getGlobalConfig = (
  configPath: string = defaultConfigPath,
  setDefaultValues = true,
) => {
  let globalConfig: Partial<ConfigType> = {}

  const isGlobalConfigFileExist = getIsGlobalConfigFileExist(configPath)
  if (!isGlobalConfigFileExist) {
    if (setDefaultValues) globalConfig = initGlobalConfig(configPath)
  } else {
    const configFile = readFileSync(configPath, 'utf8')
    globalConfig = iniParse(configFile) as ConfigType
  }

  return globalConfig
}

/**
 * Merges two configs.
 * Env config takes precedence over global ~/.opencommit config file
 * @param main - env config
 * @param fallback - global ~/.opencommit config file
 * @returns merged config
 */
const mergeConfigs = (
  main: Partial<ConfigType>,
  fallback: Partial<ConfigType>,
) => {
  const allKeys = new Set([
    ...Object.keys(main),
    ...Object.keys(fallback),
  ]) as Set<CONFIG_KEYS>
  return Array.from(allKeys).reduce(
    (acc: Partial<ConfigType>, key: CONFIG_KEYS) => {
      acc[key] = parseConfigVarValue(main[key] ?? fallback[key])
      return acc
    },
    {},
  ) as ConfigType
}

interface GetConfigOptions {
  globalPath?: string
  envPath?: string
  setDefaultValues?: boolean
}

const cleanUndefinedValues = (
  config: Partial<ConfigType>,
): Partial<ConfigType> => {
  return Object.fromEntries(
    Object.entries(config).map(([_, v]) => {
      try {
        if (typeof v === 'string') {
          if (v === 'undefined') return [_, undefined]
          if (v === 'null') return [_, null]

          const parsedValue = JSON.parse(v)
          return [_, parsedValue]
        }
        return [_, v]
      } catch (_error) {
        return [_, v]
      }
    }),
  )
}

// current
let configCache: ConfigType | undefined = undefined
let configNoDefaultCache: ConfigType | undefined = undefined
export function setConfigNoDefaultCache(config: ConfigType) {
  configNoDefaultCache = config
}
export function clearConfigCaches() {
  configCache = undefined
  configNoDefaultCache = undefined
}

export const getConfig = ({
  envPath = defaultEnvPath,
  globalPath = defaultConfigPath,
  setDefaultValues = true, // migrationで使われるので追加
}: GetConfigOptions = {}): ConfigType => {
  // If it is enable, use configCache
  if (setDefaultValues) {
    if (configCache) return configCache
  } else {
    if (configNoDefaultCache) return configNoDefaultCache
  }

  const envConfig = getEnvConfig(envPath, setDefaultValues)
  const globalConfig = getGlobalConfig(globalPath, setDefaultValues)

  const config = mergeConfigs(envConfig, globalConfig)

  const cleanConfig = cleanUndefinedValues(config)

  if (setDefaultValues) {
    configCache = cleanConfig as ConfigType
  } else {
    configNoDefaultCache = cleanConfig as ConfigType
  }
  return cleanConfig as ConfigType
}

export function deleteConfig(
  keyValues: [key: CONFIG_KEYS],
  globalConfigPath = defaultConfigPath,
  setDefaultValues = true,
) {
  const config = getConfig({
    globalPath: globalConfigPath,
    setDefaultValues,
  })
  for (const key of keyValues) {
    delete config[key]
  }
  updateCache(config, globalConfigPath, setDefaultValues)
}

export const setConfig = (
  keyValues: [
    key: CONFIG_KEYS,
    value: string | boolean | number | null | undefined,
  ][],
  globalConfigPath: string = defaultConfigPath,
  setDefaultValues = true,
) => {
  const config = getConfig({
    globalPath: globalConfigPath,
    setDefaultValues,
  })

  const configToSet: Partial<ConfigType> = {}

  for (const [key, value] of keyValues) {
    if (!Object.prototype.hasOwnProperty.call(configValidators, key)) {
      const supportedKeys = Object.keys(configValidators).join('\n')
      throw new Error(
        `Unsupported config key: ${key}. Expected keys are:\n\n${supportedKeys}.\n\nFor more help refer to our docs: https://github.com/takuya-o/opencommit`,
      )
    }

    let parsedConfigValue

    try {
      if (typeof value === 'string') parsedConfigValue = JSON.parse(value)
      else parsedConfigValue = value
    } catch (_error) {
      parsedConfigValue = value
    }

    // キーを文字列としてキャストしてからインデックスを使用
    const validValue = configValidators[key as keyof typeof configValidators](
      parsedConfigValue,
      config,
    )

    configToSet[key as CONFIG_KEYS] = validValue as never
  }

  const mergedConfig = mergeConfigs(configToSet, config)
  updateCache(mergedConfig, globalConfigPath, setDefaultValues)

  outro(`${chalk.green('✔')} config successfully set`)
}

export const configCommand = command(
  {
    name: COMMANDS.config,
    parameters: ['<mode>', '<key=values...>'],
  },
  async argv => {
    try {
      const { mode, keyValues } = argv._
      intro(`COMMAND: config ${mode} ${keyValues}`)

      if (mode === CONFIG_MODES.get) {
        const config = getConfig() || {}
        for (const key of keyValues) {
          outro(`${key}=${config[key as keyof typeof config]}`)
        }
      } else if (mode === CONFIG_MODES.set) {
        await setConfig(
          keyValues.map(
            keyValue => keyValue.split('=') as [CONFIG_KEYS, string],
          ),
        )
      } else {
        throw new Error(
          `Unsupported mode: ${mode}. Valid modes are: "set" and "get"`,
        )
      }
    } catch (error) {
      outro(`${chalk.red('✖')} ${error}`)
      process.exit(1)
    }
  },
)
function updateCache(
  config: ConfigType,
  globalConfigPath: string,
  setDefaultValues: boolean,
) {
  if (setDefaultValues) {
    configCache = config
    writeGlobalConfig(config, globalConfigPath)
    configNoDefaultCache = undefined // defaultが入ってしまうのでCopyするわけにも行かず
  } else {
    // no Defaultなのでファイルは書かない
    configNoDefaultCache = config
    // configCacheの更新
    if (!configCache) configCache = {} as ConfigType
    for (const [key, value] of Object.entries(configNoDefaultCache)) {
      if (value !== undefined) {
        configCache[key as CONFIG_KEYS] = value as never
      }
    }
  }
}
