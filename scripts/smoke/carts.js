import http from 'k6/http';
import { BASE_URL, CART_ID, checkJsonResponse, options } from './common.js';

export { options };

export default function () {
  const cartsResponse = http.get(`${BASE_URL}/carrinhos`, {
    tags: { name: 'smoke.carts.list' },
  });
  checkJsonResponse(
    cartsResponse,
    'Listagem de carrinhos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.carrinhos),
  );

  const cartResponse = http.get(`${BASE_URL}/carrinhos/${encodeURIComponent(CART_ID)}`, {
    tags: { name: 'smoke.carts.get' },
  });
  checkJsonResponse(
    cartResponse,
    'Consulta de carrinho por ID',
    (body) => typeof body._id === 'string' && Array.isArray(body.produtos),
  );
}
