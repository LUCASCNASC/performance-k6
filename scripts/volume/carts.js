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
  return createVolumeFixture('carts', VOLUME_RECORD_COUNT);
}

export function teardown(fixture) {
  teardownVolumeFixture(fixture);
}

export default function (fixture) {
  const response = http.get(`${BASE_URL}/carrinhos`, {
    tags: { name: 'volume.carts.list' },
  });
  const expectedIds = fixture.carts.map((cart) => cart.cartId);

  checkJsonResponse(
    response,
    'Listagem de carrinhos com volume',
    (body) =>
      Number.isInteger(body.quantidade) &&
      Array.isArray(body.carrinhos) &&
      body.quantidade >= expectedIds.length &&
      expectedIds.every((id) => body.carrinhos.some((cart) => cart._id === id)),
  );
}
