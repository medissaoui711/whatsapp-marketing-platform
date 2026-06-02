import { runAllSeeds } from '../src/seeds';

runAllSeeds()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });


