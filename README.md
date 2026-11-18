# performance-k6

## Fast validation

Before pushing changes, run the same validation checks used by the workflow:

```powershell
node .\scripts\checks\validate.mjs
node .\scripts\checks\validate-fixtures.mjs
```

The first command validates a pinned ServeRest OpenAPI contract and asks k6 to load every script. The second runs the load-test fixtures against a local API stub to verify setup and teardown; it does not call ServeRest or create remote data. Both commands require Node.js and k6 on `PATH`; the first also needs internet access to download the contract.

The GitHub Actions workflow also runs smoke tests against `BASE_URL`. Those tests exercise API behavior and create temporary records; run them only against an environment you are authorized to test. See [`scripts/smoke/README.md`](scripts/smoke/README.md) for the commands and configuration.

Load, spike, stress, endurance, scalability, and volume tests require `BASE_URL` to be set explicitly, to avoid accidentally generating traffic against the public default. They are not run automatically in CI. Check each category's README before running them.

Shared configuration, response checks, fixture lifecycle, and k6 profiles are separated into modules under [`scripts/lib/`](scripts/lib/); [`scripts/common.js`](scripts/common.js) re-exports them for the scenario scripts.
