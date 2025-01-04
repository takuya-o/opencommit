import {
  CONFIG_KEYS,
  ConfigType,
  deleteConfig,
  getConfig,
  getGlobalConfig,
  getIsGlobalConfigFileExist,
  writeGlobalConfig,
} from '../commands/config'

export default function () {
  const obsoleteKeys = [
    'OCO_OLLAMA_API_KEY',
    'OCO_OLLAMA_API_URL',
    'OCO_ANTHROPIC_API_KEY',
    'OCO_ANTHROPIC_BASE_PATH',
    'OCO_OPENAI_API_KEY',
    'OCO_OPENAI_BASE_PATH',
    'OCO_AZURE_API_KEY',
    'OCO_AZURE_ENDPOINT',
    'OCO_GEMINI_API_KEY',
    'OCO_GEMINI_BASE_PATH',
    'OCO_FLOWISE_API_KEY',
    'OCO_FLOWISE_ENDPOINT',
  ]

  const globalConfig = getGlobalConfig(undefined, false)

  const configToOverride: Partial<ConfigType> = { ...globalConfig }

  for (const key of obsoleteKeys) {
    delete configToOverride[key as CONFIG_KEYS]
    deleteConfig([key as CONFIG_KEYS], undefined, false) // update cache
  }

  // 00 で書き込んでいないのでここで書き込む
  const config = getConfig({ setDefaultValues: false })
  if (!configToOverride[CONFIG_KEYS.OCO_AI_PROVIDER]) {
    configToOverride[CONFIG_KEYS.OCO_AI_PROVIDER] = config.OCO_AI_PROVIDER
  }
  if (!configToOverride[CONFIG_KEYS.OCO_API_KEY]) {
    configToOverride[CONFIG_KEYS.OCO_API_KEY] = config.OCO_API_KEY
  }
  if (!configToOverride[CONFIG_KEYS.OCO_API_URL]) {
    configToOverride[CONFIG_KEYS.OCO_API_URL] = config.OCO_API_URL
  }
  if (!configToOverride[CONFIG_KEYS.OCO_TOKENS_MAX_INPUT]) {
    configToOverride[CONFIG_KEYS.OCO_TOKENS_MAX_INPUT] =
      config.OCO_TOKENS_MAX_INPUT
  }
  if (!configToOverride[CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT]) {
    configToOverride[CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT] =
      config.OCO_TOKENS_MAX_OUTPUT
  }
  if (!configToOverride[CONFIG_KEYS.OCO_GITPUSH]) {
    configToOverride[CONFIG_KEYS.OCO_GITPUSH] = config.OCO_GITPUSH
  }
  if (getIsGlobalConfigFileExist()) {
    // Global Config ファイルが合った場合
    writeGlobalConfig(configToOverride as ConfigType) // Global Config Fileだけを書き換える
  }
}
