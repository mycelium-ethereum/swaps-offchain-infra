# Swaps-Keepers

## Setting up the Environment

To setup the environment, copy the `env.example` file to `.env` and set the variables.

| Variable Name            | Description                                                                                                                                                         |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RPC_URL | A url to make RPC requests. Can either be wss or https |
| FALLBACK_RPC_URL | A fallback url to make RPC requests. Can be either wss or https |
| PRIVATE_KEY | The private key of the liquidator wallet. This will need to be set in the `PositionManager.sol` contract. This can be checked by calling the `isLiquidator` method. |
| VAULT_PRICE_FEED | Address for the `VaultPriceFeed.sol` contract |
| POSITION_ROUTER | Address for the `PositionRouter.sol` contract |
| MAX_EXECUTION_RETRY | The max amount of times the PositionKeeper will try and execute positions. This is reset each time a new order comes in and is to prevent infinite retries. Defaults to 5 |
| MAX_EXECUTABLE_CHUNK | The max amount of orders included in an execution chunk. Since execution is unbounded there were network errors when executing to many orders and receivung to many event logs in return. Defaults to 25 |
| POSITION_KEEPER_INTERVAL_MS | Interval for the keeper to check if there are any outstanding orders. Defaults to 20 seconds |
| MAX_EXECUTION_RETRY | The max amount of times the PositionKeeper will try and execute positions. This is reset each time a new order comes in and is to prevent infinite retries. Defaults to 5 |
| MAX_EXECUTABLE_CHUNK | The max amount of orders included in an execution chunk. Since execution is unbounded there were network errors when executing to many orders and receivung to many event logs in return. Defaults to 25 |
| PRICE_KEEPER_FORCE_UDPATE_INTERVAL_MS | If there are no price updates and this interval is reached it will force and update. Defaults to 5 minutes |
| PRICE_KEEPER_INTERVAL_MS | Interval for the keeper to check if there are any outstanding orders. Defaults to 20 seconds |

## Install and Build
```
yarn
yarn run build
```

### Watcher Specific Variables.
These variables are specific to the Watcher. If you don't set them, defaults are in place.
```
WATCHER_STALE_THRESHOLD = Time in seconds before the Median price is considered stale in the watcher. Default = 5s
WATCHER_PRICE_DIFF_THRESHOLD = Percent (in 10^18 units) deviation that is acceptable between the median price and keeper price. Default = 5% (0.05×10^18)
```

# Docker
Make sure you have docker installed on your machine or environment.
You can check you have docker by running `docker -v` in your terminal of choice.

Create a swaps-keepers docker image with `npm run docker:build-keepers` or `yarn docker:build-keepers`. This images starts a `PriceKeeper` and `PositionKeeper`.
Create a watcher docker image with `npm run docker:build-watcher` or `yarn docker:build-watcher`.

The created image does not include the required env variables OR any of the optional watcher variables.
- RPC_URL - Network RPC (required)
- SIGNING_PRIVATE_KEY - permissioned account to call updatePrices (required)
- PRICE_FEED - price feed contract address (required)
- POSITION_ROUTER - position router contract address (required only for swaps-keepers)

## Run the image
Start running the `PriceKeeper` and `PositionKeeper`
- on Arbitrum `docker run -p 9111:9111 -e ARBITRUM_RPC="https://arb1.arbitrum.io/rpc" -e SIGNING_PRIVATE_KEY="A_PERMISSIONED_PRIVATE_KEY" -e PRICE_FEED="priceFeed address" -e POSITION_ROUTER="positionRouter address" swaps-keepers`
- on Arbitrum rinkeby `docker run -p 9111:9111 -e ARBITRUM_TESTNET_RPC="https://rinkeby.arbitrum.io/rpc" -e SIGNING_PRIVATE_KEY="A_PERMISSIONED_PRIVATE_KEY" -e PRICE_FEED="priceFeed address" POSITION_ROUTER="positionRouter address" swaps-keepers`

Start running the `Watcher`
- on Arbitrum `docker run -e NETWORK="42161" -e ARBITRUM_RPC="https://arb1.arbitrum.io/rpc" -e SIGNING_PRIVATE_KEY="<A_PERMISSIONED_PRIVATE_KEY>" swaps-watcher`
- on Arbitrum rinkeby `docker run -e NETWORK="421611" -e ARBITRUM_TESTNET_RPC="https://rinkeby.arbitrum.io/rpc" -e SIGNING_PRIVATE_KEY="<A_PERMISSIONED_PRIVATE_KEY>" swaps-watcher`

There is also the option of using a custom/private RPC in place of the public ones used here.

## Push New GCP Image
- `npm run docker:build-keepers`
- `docker tag swaps-keepers gcr.io/avian-direction-235610/swaps-keepers:version`
- `docker push gcr.io/avian-direction-235610/swaps-keepers:version
