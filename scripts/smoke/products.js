import http from 'k6/http';
import { BASE_URL, PRODUCT_ID, checkJsonResponse, options } from './common.js';

export { options };

export default function () {
  const productsResponse = http.get(`${BASE_URL}/produtos`, {
    tags: { name: 'smoke.products.list' },
  });
  checkJsonResponse(
    productsResponse,
    'Listagem de produtos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.produtos),
  );

  const productResponse = http.get(`${BASE_URL}/produtos/${encodeURIComponent(PRODUCT_ID)}`, {
    tags: { name: 'smoke.products.get' },
  });
  checkJsonResponse(
    productResponse,
    'Consulta de produto por ID',
    (body) => typeof body._id === 'string' && typeof body.nome === 'string',
  );
}
