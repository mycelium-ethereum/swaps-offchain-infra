# Swaps Offchain Infrastructure

Monorepo for offchain infrastructure services.

# Packages

## [@mycelium-ethereum/swaps-js](packages/swaps-js)

A simple js package that contains reused types, utils and constants

## [@mycelium-ethereum/swaps-keepers](packages/swaps-keepers)

Swaps position and price keepers

## [@mycelium-ethereum/swaps-prices](packages/swaps-prices)

A seperate pricing service which uses the same websockets as the priceKeepers, serves these prices over a websocket and http server.
