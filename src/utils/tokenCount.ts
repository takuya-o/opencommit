import { Tiktoken } from '@dqbd/tiktoken/lite'
import cl100k_base from '@dqbd/tiktoken/encoders/cl100k_base.json' assert { type: 'json' }
import o200k_base from '@dqbd/tiktoken/encoders/o200k_base.json' assert { type: 'json' }

export function tokenCount(content: string, model?: string): number {
  let encoding
  if (model && (model.indexOf('gpt-4o') === 0 || model.indexOf('o1') === 0)) {
    model = 'gpt-4o'
  }
  // See: https://github.com/dqbd/tiktoken/blob/main/js/src/core.ts#L211
  if (model === 'gpt-4o') {
    // gpt-4o,o1用のエンコーディングを設定
    encoding = new Tiktoken(o200k_base.bpe_ranks, o200k_base.special_tokens, o200k_base.pat_str)
  } else {
    // gpt-3.5〜4用のエンコーディングを設定
    encoding = new Tiktoken(cl100k_base.bpe_ranks, cl100k_base.special_tokens, cl100k_base.pat_str)
  }
  const tokens = encoding.encode(content)
  encoding.free()
  return tokens.length
}
