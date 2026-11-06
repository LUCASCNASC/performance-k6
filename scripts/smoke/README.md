# Smoke tests do ServeRest

Os scripts cobrem as consultas de usuários, produtos e carrinhos e a autenticação documentadas em `serverest.json`. Cada execução roda uma vez, com um VU. Configurações, criação de dados temporários e verificações compartilhadas estão em [`scripts/common.js`](../common.js).

Como os dados do ambiente são apagados todas as noites, cada execução cria os próprios dados de teste no `setup` do k6 e os remove no `teardown`. O cenário de usuários cria um usuário; o de produtos cria um usuário administrador e um produto; o de carrinhos cria um usuário administrador, um produto e um carrinho. O cenário de login cria um usuário para autenticar. Se a limpeza falhar, o script reporta erro explicitamente.

## Executar

Na raiz do repositório, rode cada script com k6:

```powershell
k6 run .\scripts\smoke\login.js
k6 run .\scripts\smoke\users.js
k6 run .\scripts\smoke\products.js
k6 run .\scripts\smoke\carts.js
```

Por padrão, as chamadas usam `https://serverest.dev`. A única variável necessária para apontar os testes a outro ambiente é:

| Variável | Padrão | Usada por |
| --- | --- | --- |
| `BASE_URL` | `https://serverest.dev` | Todos |

Exemplo no PowerShell:

```powershell
$env:BASE_URL = "https://serverest.dev"
```

Execute somente em um ambiente no qual a criação e remoção temporária desses dados esteja autorizada.

## GitHub Actions

O workflow [API checks](../../.github/workflows/api-checks.yml) é executado em `push`, `pull_request` e sob demanda. Ele valida o contrato OpenAPI e a sintaxe/carregamento dos scripts k6, executa cada smoke test em seu próprio job e verifica a disponibilidade da API com `GET /produtos`.

O ServeRest não documenta um endpoint dedicado de health check; por isso, o job `health` usa `GET /produtos` e valida o status HTTP e o formato básico da resposta. O job `tests` valida o contrato e carrega os scripts de smoke e carga com `k6 inspect`; este repositório ainda não contém uma suíte pytest ou testes unitários separados.

Para apontar o workflow a outro ambiente, configure a variável de repositório `SERVEREST_BASE_URL`. Os dados de teste são criados e removidos durante cada execução dos smoke tests.

Os cenários de carga e seu perfil padrão estão documentados em [`scripts/load/README.md`](../load/README.md).
