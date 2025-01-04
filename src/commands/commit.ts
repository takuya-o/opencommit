import {
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
} from '@clack/prompts'
import chalk from 'chalk'
import { execa } from 'execa'
import { generateCommitMessageByDiff } from '../generateCommitMessageFromGitDiff'
import {
  assertGitRepo,
  getChangedFiles,
  getDiff,
  getStagedFiles,
  gitAdd,
} from '../utils/git'
import { trytm } from '../utils/trytm'
import { getConfig } from './config'

const getGitRemotes = async () => {
  const { stdout } = await execa('git', ['remote'])
  return stdout.split('\n').filter(remote => Boolean(remote.trim()))
}

// Check for the presence of message templates
const checkMessageTemplate = (extraArgs: string[]): string | false => {
  const config = getConfig()
  for (const key in extraArgs) {
    if (
      extraArgs[key].includes(config.OCO_MESSAGE_TEMPLATE_PLACEHOLDER as string)
    )
      return extraArgs[key]
  }
  return false
}

// eslint-disable-next-line max-lines-per-function
const generateCommitMessageFromGitDiff = async (
  diff: string,
  extraArgs: string[],
  _context: string,
  fullGitMojiSpec: boolean,
  skipCommitConfirmation: boolean,
): Promise<void> => {
  const config = getConfig()
  const messageTemplate = checkMessageTemplate(extraArgs)
  await assertGitRepo()

  const commitSpinner = spinner()
  commitSpinner.start('Generating the commit message')
  try {
    let commitMessage = await generateCommitMessageByDiff(diff)

    if (typeof messageTemplate === 'string') {
      commitMessage = messageTemplate.replace(
        config?.OCO_MESSAGE_TEMPLATE_PLACEHOLDER as string,
        commitMessage,
      )
    }
    commitSpinner.stop('📝 Commit message generated')

    outro(
      `Generated commit message:
${chalk.grey('——————————————————')}
${commitMessage}
${chalk.grey('——————————————————')}`,
    )

    const isCommitConfirmedByUser =
      skipCommitConfirmation ||
      (await confirm({
        message: 'Confirm the commit message?',
      }))

    if (isCancel(isCommitConfirmedByUser)) process.exit(1)

    if (isCommitConfirmedByUser) {
      // current: && !isCancel(isCommitConfirmedByUser)
      const committingChangesSpinner = spinner()
      committingChangesSpinner.start('Committing the changes')
      const { stdout } = await execa('git', [
        'commit',
        '-m',
        commitMessage,
        ...extraArgs,
      ])
      committingChangesSpinner.stop(
        `${chalk.green('✔')} Successfully committed`,
      )

      outro(stdout)

      // user isn't pushing, return early
      if (config?.OCO_DISABLE_GIT_PUSH === true) return

      const remotes = await getGitRemotes()

      // user isn't pushing, return early
      if (config.OCO_GITPUSH === false) return

      if (!remotes.length) {
        const { stdout } = await execa('git', ['push'])
        if (stdout) outro(stdout)
        process.exit(0)
      }

      if (remotes.length === 1) {
        const isPushConfirmedByUser = await confirm({
          message: 'Do you want to run `git push`?',
        })

        if (isCancel(isPushConfirmedByUser)) process.exit(1)

        if (isPushConfirmedByUser) {
          const pushSpinner = spinner()

          pushSpinner.start(`Running 'git push ${remotes[0]}'`)

          const { stdout } = await execa('git', [
            'push',
            '--verbose',
            remotes[0],
          ])

          pushSpinner.stop(
            `${chalk.green('✔')} Successfully pushed all commits to ${
              remotes[0]
            }`,
          )

          if (stdout) outro(stdout)
        } else {
          outro('`git push` aborted')
          process.exit(0)
        }
      } else {
        const skipOption = `don't push`
        const selectedRemote = (await select({
          message: 'Choose a remote to push to',
          options: [...remotes, skipOption].map(remote => ({
            value: remote,
            label: remote,
          })),
        })) as string

        if (isCancel(selectedRemote)) process.exit(1)

        if (selectedRemote !== skipOption) {
          const pushSpinner = spinner()

          pushSpinner.start(`Running 'git push ${selectedRemote}'`)

          const { stdout } = await execa('git', ['push', selectedRemote])

          if (stdout) outro(stdout)

          pushSpinner.stop(
            `${chalk.green(
              '✔',
            )} successfully pushed all commits to ${selectedRemote}`,
          )
        }
      }
    } else {
      const regenerateMessage = await confirm({
        message: 'Do you want to regenerate the message?',
      })

      if (isCancel(regenerateMessage)) process.exit(1)

      if (regenerateMessage) {
        await generateCommitMessageFromGitDiff(
          diff,
          extraArgs,
          '', // ?
          fullGitMojiSpec,
          false, // ?
        )
      }
    }
  } catch (error) {
    commitSpinner.stop(
      `${chalk.red('✖')} Failed to generate the commit message`,
    )

    console.log(error)

    const err = error as Error
    outro(`${chalk.red('✖')} ${err?.message || err}`)
    process.exit(1)
  }
}

// eslint-disable-next-line max-lines-per-function
export async function commit(
  extraArgs: string[] = [],
  context: string = '',
  isStageAllFlag: boolean = false,
  fullGitMojiSpec: boolean = false,
  skipCommitConfirmation: boolean = false,
) {
  if (isStageAllFlag) {
    const changedFiles = await getChangedFiles()

    if (changedFiles) await gitAdd({ files: changedFiles })
    else {
      outro('No changes detected, write some code and run `oco` again')
      process.exit(1)
    }
  }

  const [stagedFiles, errorStagedFiles] = await trytm(getStagedFiles())
  const [changedFiles, errorChangedFiles] = await trytm(getChangedFiles())

  if (!changedFiles?.length && !stagedFiles?.length) {
    outro(chalk.red('No changes detected'))
    process.exit(1)
  }

  intro('open-commit')
  if (errorChangedFiles ?? errorStagedFiles) {
    outro(`${chalk.red('✖')} ${errorChangedFiles ?? errorStagedFiles}`)
    process.exit(1)
  }

  const stagedFilesSpinner = spinner()

  stagedFilesSpinner.start('Counting staged files')

  if (!stagedFiles.length) {
    stagedFilesSpinner.stop('No files are staged')
    const isStageAllAndCommitConfirmedByUser = await confirm({
      message: 'Do you want to stage all files and generate commit message?',
    })

    if (isCancel(isStageAllAndCommitConfirmedByUser)) process.exit(1)

    if (isStageAllAndCommitConfirmedByUser) {
      await commit(extraArgs, context, true, fullGitMojiSpec)
      process.exit(1)
    }

    if (stagedFiles.length === 0 && changedFiles.length > 0) {
      const files = (await multiselect({
        message: chalk.cyan('Select the files you want to add to the commit:'),
        options: changedFiles.map(file => ({
          value: file,
          label: file,
        })),
      })) as string[]

      if (isCancel(files)) process.exit(1)

      await gitAdd({ files })
    }

    await commit(extraArgs, context, false, fullGitMojiSpec)
    process.exit(1)
  }

  stagedFilesSpinner.stop(
    `${stagedFiles.length} staged files:\n${stagedFiles.map(file => `  ${file}`).join('\n')}`,
  )

  const [, generateCommitError] = await trytm(
    generateCommitMessageFromGitDiff(
      await getDiff({ files: stagedFiles }),
      extraArgs,
      context,
      fullGitMojiSpec,
      skipCommitConfirmation,
    ),
  )

  if (generateCommitError) {
    outro(`${chalk.red('✖')} ${generateCommitError}`)
    process.exit(1)
  }

  process.exit(0)
}
