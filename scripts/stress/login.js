import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, createFixture, STRESS_OPTIONS, teardownFixture } from '../common.js';

export const options = STRESS_OPTIONS;

export function setup() {
  return createFixture('login');
}

export function teardown(fixture) {
  teardownFixture(fixture);
}

export default function (fixture) {
  const payload = JSON.stringify({
    email: fixture.user.email,
    password: fixture.user.password,
  });

  const response = http.post(`${BASE_URL}/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'stress.login' },
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
