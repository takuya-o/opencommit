#!/usr/bin/env node

import { hookCommand, isHookCalled } from './commands/githook.js';
import { checkIsLatestVersion } from './utils/checkIsLatestVersion';
import { cli } from 'cleye';
import { commit } from './commands/commit';
import { configCommand } from './commands/config';
import packageJSON from '../package.json' assert { type: 'json' };
import { prepareCommitMessageHook } from './commands/prepare-commit-msg-hook';

const extraArgs = process.argv.slice(2);

cli(
  {
    version: packageJSON.version,
    name: 'opencommit',
    commands: [configCommand, hookCommand],
    flags: {},
    ignoreArgv: (type) => type === 'unknown-flag' || type === 'argument',
    help: { description: packageJSON.description }
  },
  async () => {
    await checkIsLatestVersion();

    if (await isHookCalled()) {
      prepareCommitMessageHook();
    } else {
      commit(extraArgs);
    }
  },
  extraArgs
);
