# performance-k6

## Fast validation

Before pushing changes, run the same read-only checks used by the validation job:

```powershell
node .\scripts\checks\validate.mjs
```

This checks that the ServeRest OpenAPI contract still contains the required operations and that k6 can load every smoke, load, spike, stress, and endurance script. It requires Node.js, k6 on `PATH`, and an internet connection. It does not send requests to the API or create test data.

The GitHub Actions workflow also runs the smoke tests against `BASE_URL`. Those tests exercise API behavior and create temporary records; configure `BASE_URL` to an environment you are authorized to test before running them locally. See [`scripts/smoke/README.md`](scripts/smoke/README.md) for the commands and configuration.

The endurance profiles are short demonstrations (5 VUs for 1 minute) and are not run automatically in CI. See [`scripts/endurance/README.md`](scripts/endurance/README.md) before running them.
