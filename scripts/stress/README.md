# Stress tests do ServeRest

Os cenários exercitam autenticação e consultas de usuários, produtos e carrinhos, aumentando a carga em etapas para observar o comportamento da API sob carga sustentada. Os testes usam uma fixture criada antes do início da carga e a removem ao final; os dados não dependem de registros preexistentes, que podem ser apagados diariamente.

## Perfil padrão

O perfil de `STRESS_OPTIONS` dura 115 segundos: sobe para 5 VUs em 10 segundos, 10 em 15 segundos, 20 em 20 segundos, 30 em 30 segundos e 40 em mais 30 segundos; depois reduz a carga a zero em 10 segundos. Os thresholds exigem 100% de checks bem-sucedidos e menos de 5% de requisições HTTP com erro. Se o sistema ultrapassar esses limites, o k6 reportará a execução como falha; use as métricas e o último estágio estável para identificar a capacidade observada.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\stress\login.js
k6 run .\scripts\stress\users.js
k6 run .\scripts\stress\products.js
k6 run .\scripts\stress\carts.js
```

`BASE_URL` seleciona o ambiente; o padrão é `https://serverest.dev`. Cada teste cria e remove temporariamente os dados necessários, por isso execute-o somente em um ambiente no qual essas operações estejam autorizadas.

Stress tests podem degradar o serviço e não são executados automaticamente no GitHub Actions. Comece em um ambiente controlado; ajuste estágios e VUs na linha de comando somente quando o ambiente e a capacidade disponível forem conhecidos.
