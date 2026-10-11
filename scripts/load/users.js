import http from 'k6/http';
import { BASE_URL, LOAD_OPTIONS, USER_ID, checkJsonResponse } from '../common.js';

export const options = LOAD_OPTIONS;

export default function () {
  const usersResponse = http.get(`${BASE_URL}/usuarios`, {
    tags: { name: 'load.users.list' },
  });
  checkJsonResponse(
    usersResponse,
    'Listagem de usuários',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.usuarios),
  );

  const userResponse = http.get(`${BASE_URL}/usuarios/${encodeURIComponent(USER_ID)}`, {
    tags: { name: 'load.users.get' },
  });
  checkJsonResponse(
    userResponse,
    'Consulta de usuário por ID',
    (body) => typeof body._id === 'string' && typeof body.email === 'string',
  );
}
