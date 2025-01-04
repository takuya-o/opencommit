import { DEFAULT_TOKEN_LIMITS, getConfig } from './commands/config'
import { getMainCommitPrompt } from './prompts'
import { getEngine } from './utils/engine'
import { mergeDiffs } from './utils/mergeDiffs'
import { tokenCount } from './utils/tokenCount'
// current
import { ChatCompletionMessageParam as ChatCompletionRequestMessage } from 'openai/resources'
//OLD import { api } from './api'

const config = getConfig({ setDefaultValues: false })
const MAX_TOKENS_INPUT =
  config.OCO_TOKENS_MAX_INPUT ?? DEFAULT_TOKEN_LIMITS.DEFAULT_MAX_TOKENS_INPUT
const MAX_TOKENS_OUTPUT =
  config.OCO_TOKENS_MAX_OUTPUT ?? DEFAULT_TOKEN_LIMITS.DEFAULT_MAX_TOKENS_OUTPUT

const generateCommitMessageChatCompletionPrompt = async (
  diff: string,
  fullGitMojiSpec: boolean,
  context: string,
): Promise<Array<ChatCompletionRequestMessage>> => {
  const INIT_MESSAGES_PROMPT = await getMainCommitPrompt(
    fullGitMojiSpec,
    context,
  )

  const chatContextAsCompletionRequest = [...INIT_MESSAGES_PROMPT]

  chatContextAsCompletionRequest.push({
    role: 'user', //ChatCompletionRequestMessageRoleEnum.User,
    content: diff,
  })

  return chatContextAsCompletionRequest
}

export enum GenerateCommitMessageErrorEnum {
  tooMuchTokens = 'TOO_MUCH_TOKENS',
  internalError = 'INTERNAL_ERROR',
  emptyMessage = 'EMPTY_MESSAGE',
  outputTokensTooHigh = `Token limit exceeded, OCO_TOKENS_MAX_OUTPUT must not be much higher than the default ${DEFAULT_TOKEN_LIMITS.DEFAULT_MAX_TOKENS_OUTPUT} tokens.`,
}
// const INIT_MESSAGES_PROMPT_LENGTH = INIT_MESSAGES_PROMPT.map(
//   msg => tokenCount((msg.content as string) || '') + 4,
// ).reduce((a, b) => a + b, 0)

const ADJUSTMENT_FACTOR = 20

export const generateCommitMessageByDiff = async (
  diff: string,
  fullGitMojiSpec: boolean = false,
  context: string = '',
): Promise<string> => {
  // eslint-disable-next-line no-useless-catch
  try {
    const INIT_MESSAGES_PROMPT = await getMainCommitPrompt(
      fullGitMojiSpec,
      context,
    )

    const INIT_MESSAGES_PROMPT_LENGTH = INIT_MESSAGES_PROMPT.map(
      msg => tokenCount(msg.content as string) + 4,
    ).reduce((a, b) => a + b, 0)

    const MAX_REQUEST_TOKENS =
      //((config?.OCO_TOKEN_LIMIT as number) || 4096) -
      MAX_TOKENS_INPUT -
      ADJUSTMENT_FACTOR -
      INIT_MESSAGES_PROMPT_LENGTH -
      //  (config?.OCO_OPENAI_MAX_TOKENS as number)
      MAX_TOKENS_OUTPUT

    if (MAX_REQUEST_TOKENS < 0) {
      throw new Error(
        `Invalid token OCO_TOKEN_LIMIT(${config?.OCO_TOKEN_LIMIT}) or OCO_OPENAI_MAX_TOKENS(${config?.OCO_OPENAI_MAX_TOKENS})`,
      )
    }
    if (tokenCount(diff) >= MAX_REQUEST_TOKENS) {
      const commitMessagePromises = await getCommitMsgsPromisesFromFileDiffs(
        diff,
        MAX_REQUEST_TOKENS,
        fullGitMojiSpec,
      )

      const commitMessages = [] as string[]
      for (const promise of commitMessagePromises) {
        commitMessages.push((await promise) as string)
        console.log('chat.completions')
        await delay(2000) // なぜ2秒待つのか？
      }

      return commitMessages.join('\n\n')
    }
    // else
    const messages = await generateCommitMessageChatCompletionPrompt(
      diff,
      fullGitMojiSpec,
      context,
    )

    const engine = getEngine()
    const commitMessage = await engine.generateCommitMessage(messages)
    //OLD  const commitMessage = await api.generateCommitMessage(messages)

    if (!commitMessage)
      throw new Error(GenerateCommitMessageErrorEnum.emptyMessage)

    return commitMessage
  } catch (_error) {
    throw _error
  }
}

function getMessagesPromisesByChangesInFile(
  fileDiff: string,
  separator: string,
  maxChangeLength: number,
  fullGitMojiSpec: boolean,
) {
  const hunkHeaderSeparator = '@@ '
  const [fileHeader, ...fileDiffByLines] = fileDiff.split(hunkHeaderSeparator)

  // merge multiple line-diffs into 1 to save tokens
  const mergedChanges = mergeDiffs(
    fileDiffByLines.map(line => hunkHeaderSeparator + line),
    maxChangeLength,
  )

  const lineDiffsWithHeader = [] as string[]
  for (const change of mergedChanges) {
    const totalChange = fileHeader + change
    if (tokenCount(totalChange) > maxChangeLength) {
      // If the totalChange is too large, split it into smaller pieces
      const splitChanges = splitDiff(totalChange, maxChangeLength)
      lineDiffsWithHeader.push(...splitChanges)
    } else {
      lineDiffsWithHeader.push(totalChange)
    }
  }

  const engine = getEngine()
  const commitMsgsFromFileLineDiffs = lineDiffsWithHeader.map(
    async lineDiff => {
      const messages = await generateCommitMessageChatCompletionPrompt(
        separator + lineDiff,
        fullGitMojiSpec,
        '', // ?
      )

      return engine.generateCommitMessage(messages)
      //OLD return api.generateCommitMessage(messages)
    },
  )

  return commitMsgsFromFileLineDiffs
}

function splitDiff(diff: string, maxChangeLength: number) {
  const lines = diff.split('\n')
  const splitDiffs = [] as string[]
  let currentDiff = ''

  if (maxChangeLength <= 0) {
    throw new Error(GenerateCommitMessageErrorEnum.outputTokensTooHigh)
  }

  for (let line of lines) {
    // If a single line exceeds maxChangeLength, split it into multiple lines
    while (tokenCount(line) > maxChangeLength) {
      const subLine = line.substring(0, maxChangeLength)
      line = line.substring(maxChangeLength)
      splitDiffs.push(subLine)
    }

    // Check the tokenCount of the currentDiff and the line separately
    if (tokenCount(currentDiff) + tokenCount('\n' + line) > maxChangeLength) {
      // If adding the next line would exceed the maxChangeLength, start a new diff
      splitDiffs.push(currentDiff)
      currentDiff = line
    } else {
      // Otherwise, add the line to the current diff
      currentDiff += '\n' + line
    }
  }

  // Add the last diff
  if (currentDiff) {
    splitDiffs.push(currentDiff)
  }

  return splitDiffs
}

export const getCommitMsgsPromisesFromFileDiffs = async (
  diff: string,
  maxDiffLength: number,
  fullGitMojiSpec: boolean,
) => {
  const separator = 'diff --git '

  const diffByFiles = diff.split(separator).slice(1)

  // merge multiple files-diffs into 1 prompt to save tokens
  const mergedFilesDiffs = mergeDiffs(diffByFiles, maxDiffLength)

  const commitMessagePromises = [] as Promise<string | null | undefined>[]

  for (const fileDiff of mergedFilesDiffs) {
    if (tokenCount(fileDiff) >= maxDiffLength) {
      // if file-diff is bigger than gpt context — split fileDiff into lineDiff
      const messagesPromises = getMessagesPromisesByChangesInFile(
        fileDiff,
        separator,
        maxDiffLength,
        fullGitMojiSpec,
      )

      commitMessagePromises.push(...messagesPromises)
    } else {
      const messages = await generateCommitMessageChatCompletionPrompt(
        separator + fileDiff,
        fullGitMojiSpec,
        '', // ?
      )

      const engine = getEngine()
      commitMessagePromises.push(engine.generateCommitMessage(messages))
      //OLD commitMessagePromises.push(api.generateCommitMessage(messages))
    }
  }

  return commitMessagePromises
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
