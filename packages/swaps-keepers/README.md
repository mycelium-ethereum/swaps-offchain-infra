# Swaps-Keepers

## Setting up the Environment

To setup the environment, copy the `env.example` file to `.env` and set the variables.

| Variable Name                         | Description                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPC_URL                               | A url to make RPC requests. Can either be wss or https                                                                                                                                                    |
| FALLBACK_RPC_URL                      | A fallback url to make RPC requests. Can be either wss or https                                                                                                                                           |
| SIGNING_PRIVATE_KEY                   | The private key of the price keeper wallet. This will need to be set in the `FastPriceFeed.sol` contract. This can be checked by calling the `isUpdater` method.                                          |
| VAULT_PRICE_FEED                      | Address for the `VaultPriceFeed.sol` contract                                                                                                                                                             |
| POSITION_ROUTER                       | Address for the `PositionRouter.sol` contract                                                                                                                                                             |
| MAX_EXECUTION_RETRY                   | The max amount of times the PositionKeeper will try and execute positions. This is reset each time a new order comes in and is to prevent infinite retries. Defaults to 5                                 |
| MAX_EXECUTABLE_CHUNK                  | The max amount of orders included in an execution chunk. Since execution is unbounded there were network errors when executing to many orders and receiving too many event logs in return. Defaults to 25 |
| POSITION_KEEPER_INTERVAL_MS           | Interval for the keeper to check if there are any outstanding orders. Defaults to 20 seconds                                                                                                              |
| PRICE_KEEPER_FORCE_UDPATE_INTERVAL_MS | If there are no price updates and this interval is reached it will force and update. Defaults to 5 minutes                                                                                                |
| PRICE_KEEPER_INTERVAL_MS              | Interval for the keeper to check if there are any outstanding orders. Defaults to 20 seconds                                                                                                              |

## Install and Build

```
yarn
npx nx run swaps-keepers:build
```

### Watcher Specific Variables.

These variables are specific to the Watcher. If you don't set them, defaults are in place.

```
WATCHER_STALE_THRESHOLD = Time in seconds before the Median price is considered stale in the watcher. Default = 5s
WATCHER_PRICE_DIFF_THRESHOLD = Percent (in 10^18 units) deviation that is acceptable between the median price and keeper price. Default = 5% (0.05×10^18)
```
