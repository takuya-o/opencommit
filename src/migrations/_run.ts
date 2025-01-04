import fs from 'fs'
import { homedir } from 'os'
import { join as pathJoin } from 'path'
import { migrations } from './_migrations'
import { outro } from '@clack/prompts'
import chalk from 'chalk'
import {
  getConfig,
  getIsGlobalConfigFileExist,
  hideKEY,
  //getIsGlobalConfigFileExist,
  OCO_AI_PROVIDER_ENUM,
  writeGlobalConfig,
} from '../commands/config'

const migrationsFile = pathJoin(homedir(), '.opencommit_migrations')

const getCompletedMigrations = (): string[] => {
  if (!fs.existsSync(migrationsFile)) {
    return []
  }
  const data = fs.readFileSync(migrationsFile, 'utf-8')
  return data ? JSON.parse(data) : []
}

const saveCompletedMigration = (
  migrationName: string | undefined = undefined,
) => {
  const completedMigrations = getCompletedMigrations()
  if (migrationName) completedMigrations.push(migrationName)
  fs.writeFileSync(migrationsFile, JSON.stringify(completedMigrations, null, 2))
}

export const runMigrations = async () => {
  // if no config file, we assume it's a new installation and no migrations are needed
  // いやぁ 環境変数だけで設定しているし if (!getIsGlobalConfigFileExist()) return;

  if (
    getConfig({ setDefaultValues: false }).OCO_AI_PROVIDER ===
    OCO_AI_PROVIDER_ENUM.TEST
  )
    return

  const completedMigrations = getCompletedMigrations()

  let isMigrated = false

  for (const migration of migrations) {
    if (!completedMigrations.includes(migration.name)) {
      try {
        console.log('Applying migration', migration.name)
        migration.run()
        console.log('Migration applied successfully', migration.name)
        completedMigrations.push(migration.name)
      } catch (error) {
        outro(
          `${chalk.red('Failed to apply migration')} ${
            migration.name
          }: ${error}`,
        )
        process.exit(1)
      }

      isMigrated = true
    }
  }

  if (isMigrated) {
    console.info('Config', hideKEY(getConfig({ setDefaultValues: false })))
    if (getIsGlobalConfigFileExist()) {
      // TODO: キャッシュをwriteしたいのでgetConfig()しているのでGlobalConfig以外に書いてあるものもGlobalConfigに書いてしまう
      writeGlobalConfig(getConfig())
      saveCompletedMigration()
      outro(
        `${chalk.green(
          '✔',
        )} Migrations to your default config ~/.opencommit write successfully.`,
      )
    }
    outro(
      `${chalk.green(
        '✔',
      )} Migrations to your config were applied successfully.`,
    )
    //process.exit(0);
  }
}
