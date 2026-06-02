import { FullConfig } from '@playwright/test';
import { seedDatabase } from './fixtures/seed';

async function globalSetup(config: FullConfig) {
  await seedDatabase();

  console.log('✅ Global setup completed');
}

export default globalSetup;
