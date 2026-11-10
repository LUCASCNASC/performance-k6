# Avaliação do upstream ServeRest — requisitos e critérios de aceite

> Auditoria feita em 2026-11-09 contra o código upstream (`C:\Projects\ServeRest`, clone de
> https://github.com/ServeRest/ServeRest, versão 3.2.2). Todas as evidências foram verificadas
> no código real, não apenas reportadas pelo assistente.

## Decisão de escopo (passo 1 do plano)

**Este projeto não altera o upstream.** O ServeRest é uma API didática: várias das situações
levanta­das são intencionais (cadastro público de admin, respostas 400 em vez de 404, `GET`
público de carrinhos) e sustentam o propósito educacional. O papel deste workspace é:

1. **Observar** o comportamento real via testes k6 (contrato, concorrência, contrato HTTP);
2. **Registrar** requisitos para um eventual "modo seguro" em fork — apenas como documento;
3. **Travar** o contrato esperado nos smokes, para detectar regressões no serviço hospedado.

Qualquer mudança no código do ServeRest só ocorreria em fork próprio, nunca no serviço
público `serverest.dev`.

## Evidências verificadas (passo 2 do plano)

| # | Alegação | Arquivo upstream | Confirmada |
|---|----------|------------------|------------|
| 1 | Token JWT assinado com email+senha e chave hardcoded | `src/services/auth-service.js` | ✅ |
| 2 | Cadastro persiste body cru; GET retorna `password` | `src/services/usuarios-service.js`, `src/controllers/usuarios-controller.js` | ✅ |
| 3 | `GET /carrinhos` e `GET /usuarios` sem autenticação | `src/routes/carrinhos-route.js` (só POST/DELETE exigem token) | ✅ |
| 4 | Baixa de estoque read-then-write, sem transação; carrinho criado depois da baixa | `src/services/produtos-service.js` (`updateQuantidadePorLote`), `src/services/carrinhos-service.js`, `src/controllers/carrinhos-controller.js` | ✅ |
| 5 | Handler 500 expõe `error.stack` e loga body da requisição | `src/middlewares/error-handler.js` | ✅ |
| 6 | Recurso inexistente responde 400; comprar sem carrinho responde 200 | `usuarios-controller.js`, `carrinhos-controller.js` | ✅ (decisão de contrato) |
| 7 | Cobertura 100% declarada, mas caminho crítico de estoque sob `istanbul ignore` | `.nycrc.json` + `produtos-service.js` | ✅ |
| 8 | Mutation testing comentado no CI/CD | `continuous_integration.yml`, `continuous_delivery.yml` | ✅ |
| 9 | Listagens sem paginação | `usuarios-controller.js`, `carrinhos-controller.js` | ✅ (decisão de contrato) |

Contrato local (`serverest.json`) corresponde 1:1 às rotas do `docs/swagger.json` upstream.

## Requisitos e critérios de aceite

### R1 — Concorrência de estoque (observação, não correção)

**Objetivo:** quantificar, com k6, se reservas simultâneas do mesmo produto produzem estoque
negativo ou "estoque perdido" (baixado sem carrinho correspondente).

**Implementação:** script `scripts/stress/cart-stock-race.js`.

Critérios de aceite:
- [ ] Script roda standalone com `k6 run scripts/stress/cart-stock-race.js`;
- [ ] Cria usuário admin, produto com estoque pequeno e conhecido (setup), N VUs disputando
      a mesma quantidade e limpa tudo no teardown (cancelar compra → deletar produto/usuário);
- [ ] Mede e reporta: taxa de 400 "quantidade insuficiente", estoque final do produto e
      diferença em relação ao esperado;
- [ ] Checks definem sucesso/falha do teste; thresholds em 100%;
- [ ] Nenhuma massa de teste permanece na API após a execução.

**Resultado esperado (hipótese a confirmar):** como a baixa é read-then-write sem lock,
duas reservas concorrentes sobre estoque insuficiente podem produzir `quantidade < 0` ou
pedidos além do estoque. O script serve para demonstrar o fenômeno, não para reprovar a API.

### R2 — Contrato HTTP travado nos smokes (regressão)

**Objetivo:** as peculiaridades do contrato são features documentadas; devem falhar o smoke
se mudarem sem aviso.

Critérios de aceite:
- [x] Smoke de produtos valida `400` com mensagem de produto não encontrado após exclusão
      (já existia) e novos checks: `400` "Já existe produto com esse nome" e `401` para
      escrita sem token;
- [x] Smoke de carrinhos valida `400` "Não é permitido ter mais de 1 carrinho" ao tentar
      carrinho duplo e o `200` com `Não foi encontrado carrinho para esse usuário` no
      cancelamento sem carrinho;
- [x] Smoke de usuários valida `400` "Este email já está sendo usado";
- [x] Validações existentes (201/200 e mensagens) continuam passando (executado em
      2026-11-09: users 16/16, products 24/24, carts 38/38 checks).

### R3 — Requisitos do "modo seguro" (documento, sem implementação)

Para um fork voltado a uso real, registrados como diretrizes, com critérios verificáveis
por revisão de código e testes de integração:

| Req | Descrição | Critério de aceite |
|-----|-----------|--------------------|
| S1 | Token não deve carregar senha; payload mínimo (sub, role, iat, exp) | decode do token não contém `password` |
| S2 | Chave de assinatura em variável de ambiente, sem fallback hardcoded | grep no código não encontra literal |
| S3 | Hash de senha (bcrypt/argon2) na persistência; login compara hash | registro no DB não contém senha em texto plano |
| S4 | Consultas de usuário não retornam `password` | `GET /usuarios*` sem o campo |
| S5 | Criação de admin apenas por admin autenticado | `POST /usuarios` com `administrador:true` sem token → 403 |
| S6 | `GET /carrinhos` autenticado | sem token → 401 |
| S7 | Reserva de estoque atômica (update condicional `$gte`/transação) | teste de concorrência não gera estoque negativo |
| S8 | Handler 500 sem stack/body na resposta; logs sem dado sensível | resposta 500 contém apenas `message` |
| S9 | 404 para recurso inexistente; 204/200 distintos para compra sem carrinho | difere do modo didático; é o critério do modo seguro |

### R4 — Qualidade dos testes upstream (observação para eventual PR)

- [ ] Remover `istanbul ignore` das funções de estoque e cobri-las (update/restore/lote),
      com testes de concorrência onde aplicável;
- [ ] Habilitar Stryker seletivamente (mínimo `services/*`) no CI;
- [ ] Só então propor PR ao upstream — um item por PR, com justificativa.

## Próximos passos

1. Implementar `scripts/stress/cart-stock-race.js` (R1) — em andamento neste repo;
2. Adicionar os checks de contrato da R2 aos smokes existentes;
3. Entregar R3 como documento revisável (este arquivo) — nada a codificar agora;
4. R4 depende de decisão de contribuir com o upstream; não bloqueia nada aqui.
