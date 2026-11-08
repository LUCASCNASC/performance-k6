# Endurance tests do ServeRest

Os cenários demonstram uma carga estável e prolongada sobre autenticação ou consultas de usuários, produtos e carrinhos. Para evitar uma execução longa ou excessiva por padrão, o perfil é somente uma demonstração: mantém 5 VUs por 1 minuto, além de 10 segundos para subida e 10 segundos para encerramento (80 segundos no total).

Cada script cria uma fixture antes da carga e a remove ao final. Os testes não dependem de dados preexistentes, que podem ser apagados diariamente. A execução requer acesso autorizado ao ambiente configurado em `BASE_URL`; por padrão, usa `https://serverest.dev`.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\endurance\login.js
k6 run .\scripts\endurance\users.js
k6 run .\scripts\endurance\products.js
k6 run .\scripts\endurance\carts.js
```

O perfil tem thresholds de 100% de checks bem-sucedidos e menos de 5% de requisições HTTP com erro. Esses limites são critérios da demonstração, não um SLA do ServeRest.

Endurance tests podem manter carga por longos períodos e não são executados automaticamente na pipeline. Este perfil curto é apenas uma representação didática; qualquer aumento de duração ou VUs deve ser feito conscientemente e somente em um ambiente autorizado e preparado.
