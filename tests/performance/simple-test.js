import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.5'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const healthRes = http.get('http://localhost:3000/api/health');
  
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  sleep(1);
}
