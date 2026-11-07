import http from 'k6/http';
import {
  BASE_URL,
  checkJsonResponse,
  checkJsonStatusResponse,
  SMOKE_OPTIONS,
  uniqueSuffix,
} from '../common.js';

export const options = SMOKE_OPTIONS;

export default function () {
  const suffix = uniqueSuffix();
  const user = {
    nome: `k6 smoke ${suffix}`,
    email: `k6.smoke.${suffix}@example.com`,
    password: `Smoke-${suffix}`,
    administrador: 'false',
  };
  let userId;

  // Break skips the remaining requests but still reaches cleanup below.
  do {
    const usersResponse = http.get(`${BASE_URL}/usuarios`, {
      tags: { name: 'smoke.users.list' },
    });
    if (
      !checkJsonResponse(
        usersResponse,
        'Listagem de usuários',
        (body) => Number.isInteger(body.quantidade) && Array.isArray(body.usuarios),
      )
    ) {
      break;
    }

    const createResponse = http.post(`${BASE_URL}/usuarios`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'smoke.users.create' },
    });
    const created = checkJsonStatusResponse(
      createResponse,
      'Cadastro de usuário',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!created) break;
    userId = created._id;

    const userResponse = http.get(`${BASE_URL}/usuarios/${encodeURIComponent(userId)}`, {
      tags: { name: 'smoke.users.get' },
    });
    if (
      !checkJsonResponse(
        userResponse,
        'Consulta de usuário por ID',
        (body) => body._id === userId && body.email === user.email,
      )
    ) {
      break;
    }

    const updatedUser = Object.assign({}, user, { nome: `${user.nome} atualizado` });
    const updateResponse = http.put(
      `${BASE_URL}/usuarios/${encodeURIComponent(userId)}`,
      JSON.stringify(updatedUser),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'smoke.users.update' },
      },
    );
    if (
      !checkJsonStatusResponse(
        updateResponse,
        'Atualização de usuário',
        200,
        (body) => body.message === 'Registro alterado com sucesso',
      )
    ) {
      break;
    }

    const updatedResponse = http.get(`${BASE_URL}/usuarios/${encodeURIComponent(userId)}`, {
      tags: { name: 'smoke.users.verify-update' },
    });
    if (
      !checkJsonResponse(
        updatedResponse,
        'Verificação da atualização de usuário',
        (body) => body._id === userId && body.nome === updatedUser.nome,
      )
    ) {
      break;
    }

    const deleteResponse = http.del(`${BASE_URL}/usuarios/${encodeURIComponent(userId)}`, null, {
      tags: { name: 'smoke.users.delete' },
    });
    const deleted = checkJsonStatusResponse(
      deleteResponse,
      'Exclusão de usuário',
      200,
      (body) => body.message === 'Registro excluído com sucesso',
    );
    if (!deleted) break;

    const deletedUserResponse = http.get(
      `${BASE_URL}/usuarios/${encodeURIComponent(userId)}`,
      { tags: { name: 'smoke.users.verify-delete' } },
    );
    if (
      !checkJsonStatusResponse(
        deletedUserResponse,
        'Verificação da exclusão de usuário',
        400,
        (body) => body.message === 'Usuário não encontrado',
      )
    ) {
      break;
    }
    userId = null;
  } while (false);

  if (userId) {
    const cleanupResponse = http.del(
      `${BASE_URL}/usuarios/${encodeURIComponent(userId)}`,
      null,
      { tags: { name: 'smoke.users.cleanup' } },
    );
    checkJsonStatusResponse(
      cleanupResponse,
      'Limpeza do usuário de smoke',
      200,
      (body) =>
        body.message === 'Registro excluído com sucesso' ||
        body.message === 'Nenhum registro excluído',
    );
  }
}
