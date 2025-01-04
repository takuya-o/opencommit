import { CONFIG_KEYS, getConfig, setConfig } from '../commands/config'

export default function () {
  const config = getConfig({ setDefaultValues: false })
  const apiType = config.OCO_OPENAI_API_TYPE
  if (apiType && !config.OCO_AI_PROVIDER) {
    setConfig([[CONFIG_KEYS.OCO_AI_PROVIDER, apiType]], undefined, false)
  }
  const maxInput = config.OCO_TOKEN_LIMIT
  if (maxInput && !config.OCO_TOKENS_MAX_INPUT) {
    setConfig([[CONFIG_KEYS.OCO_TOKENS_MAX_INPUT, maxInput]], undefined, false)
  }
  const maxOutput = config.OCO_OPENAI_MAX_TOKENS
  if (maxOutput && !config.OCO_TOKENS_MAX_OUTPUT) {
    setConfig(
      [[CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT, maxOutput]],
      undefined,
      false,
    )
  }
  const gitPush = config.OCO_DISABLE_GIT_PUSH
  if (gitPush && !config.OCO_GITPUSH) {
    setConfig([[CONFIG_KEYS.OCO_GITPUSH, gitPush]], undefined, false)
  }
}
