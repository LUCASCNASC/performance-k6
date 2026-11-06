import http from 'k6/http';
import { BASE_URL, checkJsonResponse, createFixture, SMOKE_OPTIONS, teardownFixture } from '../common.js';

export const options = SMOKE_OPTIONS;

export function setup() {
  return createFixture('users');
}

export function teardown(fixture) {
  teardownFixture(fixture);
}

export default function (fixture) {
  const usersResponse = http.get(`${BASE_URL}/usuarios`, {
    tags: { name: 'smoke.users.list' },
  });
  checkJsonResponse(
    usersResponse,
    'Listagem de usuários',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.usuarios),
  );

  const userResponse = http.get(`${BASE_URL}/usuarios/${encodeURIComponent(fixture.user.id)}`, {
    tags: { name: 'smoke.users.get' },
  });
  checkJsonResponse(
    userResponse,
    'Consulta de usuário por ID',
    (body) => typeof body._id === 'string' && typeof body.email === 'string',
  );
}
