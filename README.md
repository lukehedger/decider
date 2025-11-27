# Decider

decider pattern in typescript

## Implementations

There are two implementations of the decider pattern:

- `decide.ts` - pure decide, no evolve (or, fold)
- `evolve.ts` - full decider pattern (decide and evolve)

## Test

Run all tests:

```sh
bun test
```

Run tests for a specific step, for example:

```sh
bun test -t CreatePayment
```

Run tests in watch mode:

```sh
bun test --watch
```
