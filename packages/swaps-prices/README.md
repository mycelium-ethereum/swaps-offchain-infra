# Swaps Prices

Pricing reposititory for Mycelium Perpetual Swaps.
Exposes a websocket which streams price aggregations from each of the CEX's as well as a REST endpoint to access these prices.

### Setup

Install required packages with `yarn` or `npm install`

### Running

You can run this service locally or dockerize.
To run locally simply start the servie with `yarn dev`

## Websocket

An example client is written in `./test/client.ts` and can be started by running `yarn client`.

Note: It is required to ping the server every 60 seconds otherwise the server will automatically close the connection

### Websocket Events

Messages are emitted when the median price changes.
Example event

```
{
    t: // type of event will be 'update'
    s: // token symbol
    p: // median price (in 10^18 decimals)
    l: // last median price (in 10^18 decimals, can be used to calculate difference)
}
```

To determine if this update will trigger a price update, the keepers check if the delta between `p` and `l` is above some threshold.

### REST Endpoint

This services exposes a `/prices` route which emits the current median prices for each of the networks tokens. These prices are formatted in 10^30 decimals.
Requires `network` query param which can be one of

-   Arbitrum mainnet `42161`
-   Arbitrum Goerli `421613`
-   (Deprecated) Arbitrum Rinkeby `421611`

The route returns an object of the structure

```
{
    [key: Address]: {
        price": string, // (median price of asset in 10^30)
        medianAge: number, // (median age of prices. This gets updated each time a price is stored in the priceStore from the CEX. Useful to detect stale prices when websockets arent functioning as they should. Can fall back on some other price stream or fire an alert)
        ...CEX_PRICES, // (more key value price pairs relating to each of the centralised exchanges feeding the price for this asset)
    }
}
```
