import http from 'k6/http';
import { BASE_URL, checkJsonStatusResponse, SMOKE_OPTIONS } from '../common.js';

export const options = SMOKE_OPTIONS;

export default function () {
  const payload = JSON.stringify({
    email: __ENV.USER_EMAIL || 'fulano@qa.com',
    password: __ENV.USER_PASSWORD || 'teste',
  });

  const response = http.post(`${BASE_URL}/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'smoke.login' },
  });

  checkJsonStatusResponse(
    response,
    'Login',
    200,
    (body) =>
      body.message === 'Login realizado com sucesso' &&
      typeof body.authorization === 'string' &&
      body.authorization.length > 0,
  );
}
