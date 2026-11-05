import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  checkJsonStatusResponse,
  SMOKE_OPTIONS,
  uniqueSuffix,
} from '../common.js';

export const options = SMOKE_OPTIONS;

export default function () {
  const email = __ENV.USER_EMAIL;
  const password = __ENV.USER_PASSWORD;
  const hasEmail = Boolean(email);
  const hasPassword = Boolean(password);

  if (hasEmail !== hasPassword) {
    check(false, {
      'Login: USER_EMAIL e USER_PASSWORD configurados juntos': (configured) => configured,
    });
    return;
  }

  let userId;

  try {
    let credentials = { email, password };

    if (!hasEmail) {
      const suffix = uniqueSuffix();
      const user = {
        nome: `k6 smoke login ${suffix}`,
        email: `k6.smoke.login.${suffix}@example.com`,
        password: `Smoke-${suffix}`,
        administrador: 'false',
      };
      const createResponse = http.post(`${BASE_URL}/usuarios`, JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'smoke.login.create-user' },
      });
      const created = checkJsonStatusResponse(
        createResponse,
        'Cadastro do usuário temporário de login',
        201,
        (body) =>
          body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
      );
      if (!created) return;

      userId = created._id;
      credentials = { email: user.email, password: user.password };
    }

    const response = http.post(`${BASE_URL}/login`, JSON.stringify(credentials), {
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
  } finally {
    if (userId) {
      const cleanupResponse = http.del(
        `${BASE_URL}/usuarios/${encodeURIComponent(userId)}`,
        null,
        { tags: { name: 'smoke.login.cleanup-user' } },
      );
      checkJsonStatusResponse(
        cleanupResponse,
        'Limpeza do usuário temporário de login',
        200,
        (body) =>
          body.message === 'Registro excluído com sucesso' ||
          body.message === 'Nenhum registro excluído',
      );
    }
  }
}
