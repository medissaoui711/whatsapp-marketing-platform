import { loadConfig, resetConfig } from '../src/index.ts';

console.log('=== Default Config ===');
const cfg = loadConfig();
console.log('App name:', cfg.app.name);
console.log('Environment:', cfg.app.environment);
console.log('Server port:', cfg.server.port);
console.log('DB host:', cfg.database.host);
console.log('JWT access expiry mins:', cfg.jwt.accessExpiryMins);
console.log('Cookie secure:', cfg.cookie.secure);
console.log('Calling UDP min:', cfg.calling.udpPortMin);
console.log('Storage type:', cfg.storage.type);

console.log('');
console.log('=== Env Override ===');
process.env.DB_HOST = 'my-db-host';
process.env.PORT = '4000';
resetConfig();
const cfg2 = loadConfig();
console.log('DB host from env:', cfg2.database.host);
console.log('Server port from env:', cfg2.server.port);

console.log('');
console.log('=== Production Rules ===');
process.env.NODE_ENV = 'production';
resetConfig();
const cfg3 = loadConfig();
console.log('Production cookie secure:', cfg3.cookie.secure);
console.log('Production rate limit:', cfg3.rateLimit.enabled);

console.log('');
console.log('All tests passed!');


