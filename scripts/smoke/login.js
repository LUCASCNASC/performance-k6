import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, options } from './common.js';

export { options };

export default function () {
  const payload = JSON.stringify({
    email: __ENV.USER_EMAIL || 'fulano@qa.com',
    password: __ENV.USER_PASSWORD || 'teste',
  });

  const response = http.post(`${BASE_URL}/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'smoke.login' },
  });

  let body;
  try {
    body = JSON.parse(response.body);
  } catch (error) {
    check(response, {
      'Login: HTTP 200': (res) => res.status === 200,
      'Login: corpo JSON válido': () => false,
    });
    return;
  }

  check(response, {
    'Login: HTTP 200': (res) => res.status === 200,
    'Login: mensagem de sucesso': () => body !== null && body.message === 'Login realizado com sucesso',
    'Login: token de autorização presente': () => body !== null && typeof body.authorization === 'string' && body.authorization.length > 0,
  });
}
