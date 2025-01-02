import * as dotenv from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { parse as iniParse, stringify as iniStringify } from 'ini'
import { intro, outro } from '@clack/prompts'
import { COMMANDS } from '../CommandsEnum.js'
import chalk from 'chalk'
import { command } from 'cleye'
import { getI18nLocal } from '../i18n/'
import { homedir } from 'os'
import { join as pathJoin } from 'path'

dotenv.config()
let configCache: ConfigType | null = null

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum CONFIG_KEYS {
  OCO_OPENAI_API_KEY = 'OCO_OPENAI_API_KEY',
  OCO_OPENAI_MAX_TOKENS = 'OCO_OPENAI_MAX_TOKENS',
  OCO_OPENAI_BASE_PATH = 'OCO_OPENAI_BASE_PATH',
  OCO_OPENAI_API_TYPE = 'OCO_OPENAI_API_TYPE',
  OCO_OPENAI_VERSION = 'OCO_OPENAI_VERSION',
  OCO_DESCRIPTION = 'OCO_DESCRIPTION',
  OCO_EMOJI = 'OCO_EMOJI',
  OCO_MODEL = 'OCO_MODEL',
  OCO_TOKEN_LIMIT = 'OCO_TOKEN_LIMIT',
  OCO_LANGUAGE = 'OCO_LANGUAGE',
  OCO_DISABLE_GIT_PUSH = 'OCO_DISABLE_GIT_PUSH',
  OCO_MESSAGE_TEMPLATE_PLACEHOLDER = 'OCO_MESSAGE_TEMPLATE_PLACEHOLDER',
}

export type ConfigType = {
  [key in CONFIG_KEYS]?: string | number | boolean
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum CONFIG_MODES {
  get = 'get',
  set = 'set',
}

const validateConfig = (key: string, condition: unknown, validationMessage: string) => {
  if (!condition) {
    outro(`${chalk.red('✖')} Unsupported config key ${key}: ${validationMessage}`)

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
      typeof value === 'string' && (value.length === 51 || value.length === 32 || value.length === 39),
      'Must be 51, 32, or 39 characters long',
    )

    return value as string
  },

  [CONFIG_KEYS.OCO_DESCRIPTION](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_DESCRIPTION, typeof value === 'boolean', 'Must be true or false')

    return value as boolean
  },

  [CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS](value: unknown) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value)
      validateConfig(CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS, !isNaN(Number(value)), 'Must be a number')
    }
    validateConfig(CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS, value ? typeof value === 'number' : undefined, 'Must be a number')

    return value as number
  },

  [CONFIG_KEYS.OCO_EMOJI](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_EMOJI, typeof value === 'boolean', 'Must be true or false')

    return value as boolean
  },
  [CONFIG_KEYS.OCO_DISABLE_GIT_PUSH](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_DISABLE_GIT_PUSH, typeof value === 'boolean', 'Must be true or false')
    return value as boolean
  },
  [CONFIG_KEYS.OCO_TOKEN_LIMIT](value: unknown) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value)
      validateConfig(CONFIG_KEYS.OCO_TOKEN_LIMIT, !isNaN(Number(value)), 'Must be a number')
    }
    validateConfig(CONFIG_KEYS.OCO_TOKEN_LIMIT, value ? typeof value === 'number' : undefined, 'Must be a number')
    return value as number
  },
  [CONFIG_KEYS.OCO_LANGUAGE](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_LANGUAGE, getI18nLocal(String(value)), `${value} is not supported yet`)
    return getI18nLocal(String(value)) as string | boolean
  },

  [CONFIG_KEYS.OCO_OPENAI_BASE_PATH](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_OPENAI_BASE_PATH, typeof value === 'string', 'Must be string')
    return value as string
  },

  [CONFIG_KEYS.OCO_OPENAI_API_TYPE](value: unknown) {
    validateConfig(CONFIG_KEYS.OCO_OPENAI_API_TYPE, typeof value === 'string', 'Must be string')
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_TYPE,
      value === 'azure' || value === 'google' || value === 'gemini' || value === 'openai' || value === '',
      `${value} is not supported yet, use 'azure', 'google' or 'openai'(default)`,
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_OPENAI_VERSION](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_VERSION,
      typeof value === 'string' && value.match(/^[1-9][0-9]{3}-[01][0-9]-[0-3][0-9]/),
      'Must be start with YYYY-MM-DD string',
    )
    return value as string
  },

  [CONFIG_KEYS.OCO_MODEL](value: unknown) {
    validateConfig(
      CONFIG_KEYS.OCO_MODEL,
      [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-0613',
        'gpt-4o',
        'gpt-4o-2024-11-20',
        'gpt-4o-2024-08-06',
        'gpt-4o-2024-05-13',
        'gpt-4o-mini',
        'gpt-4o-mini-2024-07-18',
        'o1',
        'o1-2024-12-17',
        'o1-preview',
        'o1-preview-2024-09-12',
        'o1-mini',
        'o1-mini-2024-09-12',
        // Google Gemini
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-1.0-pro', //EOL 2025/02/15
      ].includes(String(value)) ||
        (typeof value === 'string' && value.match(/^[a-zA-Z0-9~-]{1,63}[a-zA-Z0-9]$/)),
      `${value} is not supported yet, use 'o1', 'o1-mini', 'gpt-4o', 'gpt-4o-mini'(default), 'gpt-4', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0613' , 'gpt-3.5-turbo-16k', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-1.0-pro' or model deployed name.`,
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
}

const configPath = pathJoin(homedir(), '.opencommit')

export const getConfig = (): ConfigType | null => {
  // If it is enable, use configCache
  if (configCache) return configCache

  const configFromEnv: ConfigType = {
    OCO_OPENAI_API_KEY: process.env.OCO_OPENAI_API_KEY,
    OCO_OPENAI_MAX_TOKENS: Number(process.env.OCO_OPENAI_MAX_TOKENS) || 500,
    OCO_OPENAI_BASE_PATH: process.env.OCO_OPENAI_BASE_PATH,
    OCO_OPENAI_API_TYPE: process.env.OCO_OPENAI_API_TYPE,
    OCO_OPENAI_VERSION: process.env.OCO_OPENAI_VERSION || '2024-10-21',
    OCO_DESCRIPTION: process.env.OCO_DESCRIPTION === 'true' ? true : false,
    OCO_EMOJI: process.env.OCO_EMOJI === 'true' ? true : false,
    OCO_MODEL: process.env.OCO_MODEL || 'gpt-4o-mini',
    OCO_TOKEN_LIMIT: Number(process.env.OCO_TOKEN_LIMIT) || 4096,
    OCO_LANGUAGE: process.env.OCO_LANGUAGE || 'en',
    OCO_DISABLE_GIT_PUSH: Boolean(process.env.OCO_DISABLE_GIT_PUSH),
    OCO_MESSAGE_TEMPLATE_PLACEHOLDER: process.env.OCO_MESSAGE_TEMPLATE_PLACEHOLDER,
  }

  let config: ConfigType = {}
  const configExists = existsSync(configPath)
  if (configExists) {
    const configFile = readFileSync(configPath, 'utf8')
    config = iniParse(configFile)
  }

  for (const key of new Set([...Object.keys(config), ...Object.keys(configFromEnv)])) {
    const configKey = key as CONFIG_KEYS
    if (
      (!config[configKey] && !configFromEnv[configKey]) ||
      (['null', 'undefined'].includes(String(config[configKey])) &&
        ['null', 'undefined'].includes(String(configFromEnv[configKey])))
    ) {
      config[configKey] = undefined
      continue
    }
    try {
      const validator = configValidators[configKey as CONFIG_KEYS]
      const validValue = validator(config[configKey] ?? configFromEnv[configKey as CONFIG_KEYS])

      config[configKey] = validValue
    } catch (error) {
      outro(
        `'${configKey}' name is invalid, it should be either 'OCO_${configKey.toUpperCase()}' or it doesn't exist. ${error}`,
      )
      outro(`Manually fix the '.env' file or global '~/.opencommit' config file.`)
      process.exit(1)
    }
  }

  // Store configCache
  configCache = config
  return config
}

export const setConfig = (keyValues: [key: string, value: string][]) => {
  const config = getConfig() || {}

  for (const [configKey, configValue] of keyValues) {
    if (!Object.prototype.hasOwnProperty.call(configValidators, configKey)) {
      throw new Error(`Unsupported config key: ${configKey}`)
    }

    let parsedConfigValue

    try {
      parsedConfigValue = JSON.parse(configValue)
    } catch (_error) {
      parsedConfigValue = configValue
    }

    const validValue = configValidators[configKey as CONFIG_KEYS](parsedConfigValue)
    config[configKey as CONFIG_KEYS] = validValue as string | number | boolean
  }

  writeFileSync(configPath, iniStringify(config), 'utf8')

  outro(`${chalk.green('✔')} Config successfully set`)
}

export const configCommand = command(
  {
    name: COMMANDS.config,
    parameters: ['<mode>', '<key=values...>'],
  },
  async argv => {
    intro('opencommit — config')
    try {
      const { mode, keyValues } = argv._

      if (mode === CONFIG_MODES.get) {
        const config = getConfig() || {}
        for (const key of keyValues) {
          outro(`${key}=${config[key as keyof typeof config]}`)
        }
      } else if (mode === CONFIG_MODES.set) {
        await setConfig(keyValues.map(keyValue => keyValue.split('=') as [string, string]))
      } else {
        throw new Error(`Unsupported mode: ${mode}. Valid modes are: "set" and "get"`)
      }
    } catch (error) {
      outro(`${chalk.red('✖')} ${error}`)
      process.exit(1)
    }
  },
)
