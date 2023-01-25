# Swaps Liquidator

## Setting up the Environment

To setup the environment, copy the `env.example` file to `.env` and set the variables.

| Variable Name            | Description                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPC_URL                  | A url to make RPC requests.                                                                                                                                         |
| FALLBACK_RPC_URL         | A fallback url to make RPC requests.                                                                                                                                |
| LIQUIDATOR_PRIVATE_KEY   | The private key of the liquidator wallet. This will need to be set in the `PositionManager.sol` contract. This can be checked by calling the `isLiquidator` method. |
| VAULT_ADDRESS            | Address for the `Vault.sol` contract                                                                                                                                |
| POSITION_MANAGER_ADDRESS | Address for the `PositionManager.sol` contract                                                                                                                      |
| PORT                     | The port at which the server can be accessed.                                                                                                                       |
| FROM_BLOCK               | The block from which to start syncing events. This should be set to the block where the `Vault.sol` contract was deployed.                                          |
| INTERVAL_MS              | Interval for the keeper to check for new events. Defaults to 60000 (1 minute).                                                                                      |
| MAX_PROCESS_BLOCK        | The max number of blocks the keeper will attempt to sync in a single `eth_getLogs` request. May depend on your node provider's allowance. Defaults to 2000.         |
| DB_URL                   | The URL to access the MongoDB database for storing the keeper data.                                                                                                 |
| IS_PAUSED                | Boolean. If true, will pause the keeper.                                                                                                                            |

## Running the Keeper

```
yarn dev:liquidator
```
