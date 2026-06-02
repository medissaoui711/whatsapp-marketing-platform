import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    error_rate: ['rate<0.1'],
    http_req_duration: ['p(95)<10000'],
  },
};

const testCases = [
  { name: 'Health Check', method: 'GET', url: '/api/health' },
  { name: 'Get Templates', method: 'GET', url: '/api/whatsapp/templates' },
  { name: 'Get Contacts', method: 'GET', url: '/api/contacts?page=1&pageSize=10' },
];

function login() {
  const res = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (res.status === 200) {
    return res.json('accessToken');
  }
  return null;
}

export default function () {
  const token = login();
  
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  for (const test of testCases) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    let response;
    
    if (test.method === 'GET') {
      response = http.get(`http://localhost:3000${test.url}`, { headers });
    } else {
      response = http.post(`http://localhost:3000${test.url}`, {}, { headers });
    }
    
    const success = response.status >= 200 && response.status < 500;
    errorRate.add(!success);
    
    check(response, {
      [`${test.name} status OK`]: (r) => r.status >= 200 && r.status < 500,
    });
    
    sleep(0.5);
  }
  
  sleep(1);
}
