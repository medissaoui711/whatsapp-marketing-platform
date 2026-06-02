import { initializeDatabase } from '@repo/db/src/init';

let initialized = false;

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  const shouldMigrate = process.env.RUN_MIGRATIONS === 'true';
  const shouldSeed = process.env.SEED_DATABASE === 'true';

  await initializeDatabase({
    runMigrations: shouldMigrate,
    runSeeds: shouldSeed,
  });

  initialized = true;
  console.log('Database initialization complete');
}


