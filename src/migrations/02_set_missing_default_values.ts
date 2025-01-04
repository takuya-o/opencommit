import {
  CONFIG_KEYS,
  ConfigType,
  DEFAULT_CONFIG,
  getGlobalConfig,
  getIsGlobalConfigFileExist,
  hideKEY,
  writeGlobalConfig,
} from '../commands/config'

export default function () {
  const globalConfig = getGlobalConfig(undefined, false)
  for (const entry of Object.entries(DEFAULT_CONFIG)) {
    const key = entry[0] as CONFIG_KEYS
    if (key === CONFIG_KEYS.OCO_OPENAI_MAX_TOKENS) break
    if (
      globalConfig[key as CONFIG_KEYS] === 'undefined' ||
      globalConfig[key as CONFIG_KEYS] === undefined
    ) {
      if (entry[1]) {
        globalConfig[key] = entry[1] as never
      }
    }
  }
  if (getIsGlobalConfigFileExist()) {
    // Global Config ファイルが合った場合
    writeGlobalConfig(globalConfig as ConfigType) // Global Config Fileだけを書き換える
  }
  console.info('Global Config', hideKEY(globalConfig as ConfigType))
}
