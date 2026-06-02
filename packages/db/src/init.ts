import { testConnection } from './connection';
import { runMigrations } from './migrations/runner';
import { runAllSeeds } from './seeds';

export interface InitOptions {
  runMigrations?: boolean;
  runSeeds?: boolean;
  force?: boolean;
}

export async function initializeDatabase(options: InitOptions = {}): Promise<void> {
  const { runMigrations: shouldMigrate = true, runSeeds: shouldSeed = false } = options;

  console.log('Initializing database...');

  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('Cannot connect to database');
  }
  console.log('Database connection established');

  if (shouldMigrate) {
    await runMigrations({ dryRun: false, verbose: true });
  }

  if (shouldSeed) {
    await runAllSeeds();
  }

  console.log('Database initialization completed');
}

if (require.main === module) {
  const shouldMigrate = process.argv.includes('--migrate');
  const shouldSeed = process.argv.includes('--seed');
  const force = process.argv.includes('--force');

  initializeDatabase({ runMigrations: shouldMigrate, runSeeds: shouldSeed, force })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}


