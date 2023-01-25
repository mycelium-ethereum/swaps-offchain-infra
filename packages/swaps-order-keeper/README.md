# Swaps Order Keeper

## Setting up the Environment

To setup the environment, copy the `env.example` file to `.env` and set the variables.

| Variable Name            | Description                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPC_URL                  | A url to make RPC requests.                                                                                                                                            |
| FALLBACK_RPC_URL         | A fallback url to make RPC requests.                                                                                                                                   |
| PRIVATE_KEY              | The private key of the order keeper wallet. This will need to be set in the `PositionManager.sol` contract. This can be checked by calling the `isOrderKeeper` method. |
| VAULT_ADDRESS            | Address for the `Vault.sol` contract                                                                                                                                   |
| POSITION_MANAGER_ADDRESS | Address for the `PositionManager.sol` contract                                                                                                                         |
| ORDER_BOOK_ADDRESS       | Address for the `OrderBook.sol` contract                                                                                                                               |
| USDG_ADDRESS             | Address for the `USDG.sol` contract                                                                                                                                    |
| PORT                     | The port at which the server can be accessed.                                                                                                                          |
| START_BLOCK              | The block from which to start syncing events. This should be set to the block where the `OrderBook.sol` contract was deployed.                                         |
| INTERVAL_MS              | Interval for the keeper to check for new events. Defaults to 60000 (1 minute).                                                                                         |
| FEE_RECEIVER_ADDRESS     | The address to which order fees are paid out                                                                                                                           |
| DB_URL                   | The URL to access the MongoDB database for storing the keeper data.                                                                                                    |
| IS_PAUSED                | Boolean. If true, will pause the keeper.                                                                                                                               |

## Running the Keeper

```
yarn dev:order-keeper
```
