import chalk from 'chalk'

import { outro } from '@clack/prompts'

import currentPackage from '../../package.json' with { type: 'json' }
import { getOpenCommitLatestVersion } from '../version.js'

export const checkIsLatestVersion = async () => {
  const latestVersion = await getOpenCommitLatestVersion()

  if (latestVersion) {
    const currentVersion = currentPackage.version

    if (currentVersion !== latestVersion) {
      outro(
        chalk.yellow(
          `
You are not using the latest stable version of OpenCommit with new features and bug fixes.
Current version: ${currentVersion}. Latest version: ${latestVersion}.
🚀 To update run: npm i github:takuya-o/opencommit@latest.
        `,
        ),
      )
    }
  }
}
