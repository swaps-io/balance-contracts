# Balance Contracts 💰

## Development

- Ensure [`bun`](https://bun.sh) installed on machine
- Install dependencies: `bun install --frozen-lockfile` (`bun i --frozen-lockfile`)

### Compile

- `bun hc`

### Test

- `bun ht` (all tests)
- `bun htg \'Test name\'` (matching tests)

### Deploy

- `bun hid ignition/modules/BalanceCollector.ts` (local dry run)
- `bun hid ignition/modules/BalanceCollector.ts --network <...>`
