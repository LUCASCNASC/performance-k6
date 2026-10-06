import http from 'k6/http';
import { BASE_URL, USER_ID, checkJsonResponse, options } from './common.js';

export { options };

export default function () {
  const usersResponse = http.get(`${BASE_URL}/usuarios`, {
    tags: { name: 'smoke.users.list' },
  });
  checkJsonResponse(
    usersResponse,
    'Listagem de usuários',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.usuarios),
  );

  const userResponse = http.get(`${BASE_URL}/usuarios/${encodeURIComponent(USER_ID)}`, {
    tags: { name: 'smoke.users.get' },
  });
  checkJsonResponse(
    userResponse,
    'Consulta de usuário por ID',
    (body) => typeof body._id === 'string' && typeof body.email === 'string',
  );
}
