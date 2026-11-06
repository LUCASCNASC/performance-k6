# Load tests do ServeRest

Os cenários exercitam os mesmos endpoints dos smoke tests: login, listagem/consulta de usuários, listagem/consulta de produtos e listagem/consulta de carrinhos. Como os dados do ambiente são apagados todas as noites, cada execução cria fixtures próprias no `setup` do k6 e as remove no `teardown`. Configuração, criação/limpeza dos dados e verificações compartilhadas ficam em [`scripts/common.js`](../common.js).

## Perfil padrão

O perfil padrão em `LOAD_OPTIONS` dura 1 minuto: sobe de 0 a 1 VU nos primeiros 10 segundos, chega a 5 VUs nos 10 segundos seguintes, mantém 5 VUs por 30 segundos e reduz a carga a zero nos últimos 10 segundos.

O cenário falha se algum check de contrato/status falhar ou se a taxa de requisições HTTP com erro atingir 5%. Não há threshold de latência definido, pois o contrato não estabelece um SLA.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\load\login.js
k6 run .\scripts\load\users.js
k6 run .\scripts\load\products.js
k6 run .\scripts\load\carts.js
```

Os testes usam `BASE_URL`, compartilhado com os smoke tests. Para sobrescrever o perfil de carga em uma execução, passe opções do k6 na linha de comando, por exemplo:

```powershell
k6 run --vus 3 --duration 30s .\scripts\load\products.js
```

Execute carga somente contra ambientes que você tem autorização para testar, pois cada execução cria e remove temporariamente dados e pode gerar carga significativa. Os testes de carga não são executados automaticamente no GitHub Actions para evitar gerar carga involuntária no serviço público ServeRest.
