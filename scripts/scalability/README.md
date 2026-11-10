# Scalability tests do ServeRest

Os cenários aumentam gradualmente a quantidade de usuários virtuais para observar como a API responde conforme a concorrência cresce. O perfil é uma demonstração de baixo impacto: 1, 2, 3 e 5 VUs em etapas de 10 segundos, seguidas por 10 segundos de encerramento (50 segundos no total).

Cada script cria uma fixture antes da execução e a remove no teardown. Os dados não dependem de registros preexistentes e não precisam persistir de um dia para o outro. O teste de login reutiliza uma conta temporária; usuários, produtos e carrinhos usam consultas de leitura durante a carga.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\scalability\login.js
k6 run .\scripts\scalability\users.js
k6 run .\scripts\scalability\products.js
k6 run .\scripts\scalability\carts.js
```

`BASE_URL` seleciona o ambiente; o padrão é `https://serverest.dev`. Cada execução cria e remove temporariamente os dados necessários. Execute somente em um ambiente autorizado e confira a saída do k6 para confirmar que o teardown terminou sem erros.

Os thresholds exigem 100% de checks bem-sucedidos e menos de 5% de requisições HTTP com erro. Eles são critérios de verificação do script, não um SLA nem uma indicação automática da capacidade da aplicação. Compare as métricas de duração e taxa de erro entre as etapas de carga para observar a tendência.

Scalability tests são executados manualmente e não fazem parte da pipeline. O perfil padrão é intencionalmente limitado; não aumente a carga em serviços compartilhados sem autorização e ambiente preparado.
