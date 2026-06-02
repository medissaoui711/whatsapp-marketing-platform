import http from 'k6/http';
import { check, sleep } from 'k6';

let sharedToken = null;

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
  },
};

function loginOnce() {
  if (sharedToken) return sharedToken;
  
  const res = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    tenantSlug: 'demo-company',
    email: 'owner@demo.com',
    password: 'SecurePassword123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (res.status === 200) {
    sharedToken = res.json('accessToken');
    console.log(`✅ Login successful`);
  }
  
  return sharedToken;
}

export default function () {
  const token = loginOnce();
  if (!token) return;
  
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // اختبارات الـ APIs
  const healthRes = http.get('http://localhost:3000/api/health');
  check(healthRes, { 'health': (r) => r.status === 200 });
  
  const templatesRes = http.get('http://localhost:3000/api/whatsapp/templates', { headers });
  check(templatesRes, { 'templates': (r) => r.status === 200 });
  
  const contactsRes = http.get('http://localhost:3000/api/contacts?page=1&pageSize=10', { headers });
  check(contactsRes, { 'contacts': (r) => r.status === 200 });
  
  sleep(0.5);
}
