import http from 'k6/http';
import {
  BASE_URL,
  checkJsonResponse,
  createVolumeFixture,
  teardownVolumeFixture,
  VOLUME_OPTIONS,
  VOLUME_RECORD_COUNT,
} from '../common.js';

export const options = VOLUME_OPTIONS;

export function setup() {
  return createVolumeFixture('users', VOLUME_RECORD_COUNT);
}

export function teardown(fixture) {
  teardownVolumeFixture(fixture);
}

export default function (fixture) {
  const response = http.get(`${BASE_URL}/usuarios`, {
    tags: { name: 'volume.users.list' },
  });
  const expectedIds = fixture.users.map((user) => user.id);

  checkJsonResponse(
    response,
    'Listagem de usuários com volume',
    (body) =>
      Number.isInteger(body.quantidade) &&
      Array.isArray(body.usuarios) &&
      body.quantidade >= expectedIds.length &&
      expectedIds.every((id) => body.usuarios.some((user) => user._id === id)),
  );
}
