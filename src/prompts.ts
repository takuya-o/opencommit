import { note } from '@clack/prompts'
import { OpenAI } from 'openai'
import { getConfig } from './commands/config.js'
import { i18n, I18nLocals } from './i18n/index.js'
import { configureCommitlintIntegration } from './modules/commitlint/config.js'
import { getCommitlintPrompts } from './modules/commitlint/prompts.js'
import { ConsistencyPrompt } from './modules/commitlint/types.js'
import * as utils from './modules/commitlint/utils.js'
import { removeConventionalCommitWord } from './utils/removeConventionalCommitWord.js'

const translation =
  i18n[
    (getConfig({ setDefaultValues: false }).OCO_LANGUAGE as I18nLocals) || 'en'
  ]

export const IDENTITY =
  'You are to act as an author of a commit message in git.'

const GITMOJI_HELP = `Use GitMoji convention to preface the commit. Here are some help to choose the right emoji (emoji, description): 
🐛, Fix a bug; 
✨, Introduce new features; 
📝, Add or update documentation; 
🚀, Deploy stuff; 
✅, Add, update, or pass tests; 
♻️, Refactor code; 
⬆️, Upgrade dependencies; 
🔧, Add or update configuration files; 
🌐, Internationalization and localization; 
💡, Add or update comments in source code;`

const FULL_GITMOJI_SPEC = `${GITMOJI_HELP}
🎨, Improve structure / format of the code; 
⚡️, Improve performance; 
🔥, Remove code or files; 
🚑️, Critical hotfix; 
💄, Add or update the UI and style files; 
🎉, Begin a project; 
🔒️, Fix security issues; 
🔐, Add or update secrets; 
🔖, Release / Version tags; 
🚨, Fix compiler / linter warnings; 
🚧, Work in progress; 
💚, Fix CI Build; 
⬇️, Downgrade dependencies; 
📌, Pin dependencies to specific versions; 
👷, Add or update CI build system; 
📈, Add or update analytics or track code; 
➕, Add a dependency; 
➖, Remove a dependency; 
🔨, Add or update development scripts; 
✏️, Fix typos; 
💩, Write bad code that needs to be improved; 
⏪️, Revert changes; 
🔀, Merge branches; 
📦️, Add or update compiled files or packages; 
👽️, Update code due to external API changes; 
🚚, Move or rename resources (e.g.: files, paths, routes); 
📄, Add or update license; 
💥, Introduce breaking changes; 
🍱, Add or update assets; 
♿️, Improve accessibility; 
🍻, Write code drunkenly; 
💬, Add or update text and literals; 
🗃️, Perform database related changes; 
🔊, Add or update logs; 
🔇, Remove logs; 
👥, Add or update contributor(s); 
🚸, Improve user experience / usability; 
🏗️, Make architectural changes; 
📱, Work on responsive design; 
🤡, Mock things; 
🥚, Add or update an easter egg; 
🙈, Add or update a .gitignore file; 
📸, Add or update snapshots; 
⚗️, Perform experiments; 
🔍️, Improve SEO; 
🏷️, Add or update types; 
🌱, Add or update seed files; 
🚩, Add, update, or remove feature flags; 
🥅, Catch errors; 
💫, Add or update animations and transitions; 
🗑️, Deprecate code that needs to be cleaned up; 
🛂, Work on code related to authorization, roles and permissions; 
🩹, Simple fix for a non-critical issue; 
🧐, Data exploration/inspection; 
⚰️, Remove dead code; 
🧪, Add a failing test; 
👔, Add or update business logic; 
🩺, Add or update healthcheck; 
🧱, Infrastructure related changes; 
🧑‍💻, Improve developer experience; 
💸, Add sponsorships or money related infrastructure; 
🧵, Add or update code related to multithreading or concurrency; 
🦺, Add or update code related to validation.`

const CONVENTIONAL_COMMIT_KEYWORDS =
  'Do not preface the commit with anything, except for the conventional commit keywords: fix, feat, build, chore, ci, docs, style, refactor, perf, test.'

const getCommitConvention = (fullGitMojiSpec: boolean) => {
  const config = getConfig()
  return config.OCO_EMOJI
    ? fullGitMojiSpec
      ? FULL_GITMOJI_SPEC
      : GITMOJI_HELP
    : CONVENTIONAL_COMMIT_KEYWORDS
}

const getDescriptionInstruction = () => {
  const config = getConfig()
  return config.OCO_DESCRIPTION
    ? 'Add a short description of WHY the changes are done after the commit message. Don\'t start it with "This commit", just describe the changes.'
    : "Don't add any descriptions to the commit, only commit message."
}

const getOneLineCommitInstruction = () => {
  const config = getConfig()
  return config.OCO_ONE_LINE_COMMIT
    ? 'Craft a concise commit message that encapsulates all changes made, with an emphasis on the primary updates. If the modifications share a common theme or scope, mention it succinctly; otherwise, leave the scope out to maintain focus. The goal is to provide a clear and unified overview of the changes in a one single message, without diverging into a list of commit per file change.'
    : ''
}

/**
 * Get the context of the user input
 * @param extraArgs - The arguments passed to the command line
 * @example
 *  $ oco -- This is a context used to generate the commit message
 * @returns - The context of the user input
 */
const userInputCodeContext = (context: string) => {
  if (context !== '' && context !== ' ') {
    return `Additional context provided by the user: <context>${context}</context>\nConsider this context when generating the commit message, incorporating relevant information when appropriate.`
  }
  return ''
}

const INIT_MAIN_PROMPT = (
  language: string,
  fullGitMojiSpec: boolean,
  context: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
  role: 'system', //ChatCompletionRequestMessageRoleEnum.System,
  content: (() => {
    const commitConvention = fullGitMojiSpec
      ? 'GitMoji specification'
      : 'Conventional Commit Convention'
    const missionStatement = `${IDENTITY} Your mission is to create clean and comprehensive commit messages as per the ${commitConvention} and explain WHAT were the changes and mainly WHY the changes were done.`
    const diffInstruction =
      "I'll send you an output of 'git diff --staged' command, and you are to convert it into a commit message."
    const conventionGuidelines = getCommitConvention(fullGitMojiSpec)
    const descriptionGuideline = getDescriptionInstruction()
    const oneLineCommitGuideline = getOneLineCommitInstruction()
    const generalGuidelines = `Use the present tense. Lines must not be longer than 74 characters. Use ${language} for the commit message. And insert its translation by ${translation.localLanguage}.`
    const userInputContext = userInputCodeContext(context)

    return `${missionStatement}\n${diffInstruction}\n${conventionGuidelines}\n${descriptionGuideline}\n${oneLineCommitGuideline}\n${generalGuidelines}\n${userInputContext}`
  })(),
})

export const INIT_DIFF_PROMPT: OpenAI.Chat.Completions.ChatCompletionMessageParam =
  {
    role: 'user', //ChatCompletionRequestMessageRoleEnum.User,
    content: `diff --git a/src/server.ts b/src/server.ts
    index ad4db42..f3b18a9 100644
    --- a/src/server.ts
    +++ b/src/server.ts
    @@ -10,7 +10,7 @@
    import {
        initWinstonLogger();
        
        const app = express();
        -const port = 7799;
        +const PORT = 7799;
        
        app.use(express.json());
        
        @@ -34,6 +34,6 @@
        app.use((_, res, next) => {
            // ROUTES
            app.use(PROTECTED_ROUTER_URL, protectedRouter);
            
            -app.listen(port, () => {
                -  console.log(\`Server listening on port \${port}\`);
                +app.listen(process.env.PORT || PORT, () => {
                    +  console.log(\`Server listening on port \${PORT}\`);
                });`,
  }

const getContent = (translation: ConsistencyPrompt) => {
  const config = getConfig()
  const feat = config.OCO_EMOJI
    ? `✨ ${removeConventionalCommitWord(translation.commitFeat)}`
    : translation.commitFeat
  const description = config.OCO_DESCRIPTION
    ? translation.commitDescription
    : ''
  // English translation
  let featEn = ''
  let descriptionEn = ''
  if (translation !== i18n['en']) {
    featEn = config.OCO_EMOJI
      ? `✨ ${removeConventionalCommitWord(i18n['en'].commitFeat)}\n\n`
      : `${i18n['en'].commitFeat}\n\n`
    descriptionEn = config.OCO_DESCRIPTION
      ? `${i18n['en'].commitDescription}`
      : ''
  }
  return `${feat}\n\n${description}${featEn}${descriptionEn}`
}

const getContentFix = (translation: ConsistencyPrompt) => {
  const config = getConfig()
  const fix = config.OCO_EMOJI
    ? `🐛 ${removeConventionalCommitWord(translation.commitFix)}`
    : translation.commitFix
  const description = config.OCO_DESCRIPTION
    ? translation.commitDescription
    : ''
  // English translation
  let fixEn = ''
  let descriptionEn = ''
  if (translation !== i18n['en']) {
    fixEn = config.OCO_EMOJI
      ? `\n\n🐛 ${removeConventionalCommitWord(i18n['en'].commitFix)}\n\n`
      : `\n\n${i18n['en'].commitFix}\n\n`
    descriptionEn = config.OCO_DESCRIPTION
      ? `${i18n['en'].commitDescription}`
      : ''
  }
  return `${fix}\n\n${description}${fixEn}${descriptionEn}`
}

const INIT_CONSISTENCY_PROMPT = (
  translation: ConsistencyPrompt,
): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
  role: 'assistant', //ChatCompletionRequestMessageRoleEnum.Assistant,
  content: getContent(translation),
})
const INIT_FIX_CONSISTENCY_PROMPT = (
  translation: ConsistencyPrompt,
): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
  role: 'assistant', //ChatCompletionRequestMessageRoleEnum.Assistant,
  content: getContentFix(translation),
})

export const getMainCommitPrompt = async (
  fullGitMojiSpec: boolean,
  context: string,
): Promise<Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>> => {
  const config = getConfig()
  switch (config.OCO_PROMPT_MODULE) {
    case '@commitlint':
      if (!(await utils.commitlintLLMConfigExists())) {
        note(
          `OCO_PROMPT_MODULE is @commitlint but you haven't generated consistency for this project yet.`,
        )
        await configureCommitlintIntegration()
      }

      // Replace example prompt with a prompt that's generated by OpenAI for the commitlint config.
      // eslint-disable-next-line no-case-declarations
      const commitLintConfig = await utils.getCommitlintLLMConfig()

      return [
        getCommitlintPrompts().INIT_MAIN_PROMPT(
          translation.localLanguage,
          commitLintConfig.prompts,
        ),
        INIT_DIFF_PROMPT,
        INIT_FIX_CONSISTENCY_PROMPT(
          commitLintConfig.consistency[
            translation.localLanguage
          ] as ConsistencyPrompt,
        ),
        INIT_CONSISTENCY_PROMPT(
          commitLintConfig.consistency[
            translation.localLanguage
          ] as ConsistencyPrompt,
        ),
      ]

    default:
      return [
        INIT_MAIN_PROMPT(translation.localLanguage, fullGitMojiSpec, context),
        INIT_DIFF_PROMPT,
        INIT_FIX_CONSISTENCY_PROMPT(translation),
        INIT_CONSISTENCY_PROMPT(translation),
      ]
  }
}
