import {
  createBinanceWsFeeds,
  createBitfinexWsFeeds,
  /* createFtxWsFeeds, */
  createCryptoComWsFeeds,
  createCoinbaseWsFeeds,
  KnownToken,
  WebsocketClient,
} from '@mycelium-ethereum/swaps-js';
import { PriceStore } from '../services/priceStore';
import { wsErrors } from '../utils/prometheus';

const priceEmitter = new PriceStore();

// const wsConfig = {
  // Subaccount nickname
  // subAccountName: 'sub1',

  // how long to wait (in ms) before deciding the connection should be terminated & reconnected
  // pongTimeout: 1000,

  // how often to check (in ms) that WS connection is still alive
  // pingInterval: 10000,

  // how long to wait before attempting to reconnect (in ms) after connection is closed
  // reconnectTimeout: 500,

  // override which URL to use for websocket connections
  // wsUrl: 'wss://example.ftx.com/ws'
// };
//
const onError = (info: any) => {
  console.error(info);
  wsErrors.inc({ key: info.wsKey });
  wsErrors.inc();
}

// binance client setup
const binanceClient = new WebsocketClient('binance', {
  wsUrl: `wss://stream.binance.com/stream`,
});
binanceClient.on('update', (data) => priceEmitter.storePrice('binance', data))
binanceClient.on('error', onError)

// crypto.com client setup
const cryptoComClient = new WebsocketClient('cryptoCom', {
  wsUrl: `wss://stream.crypto.com/v2/market`,
});
cryptoComClient.on('update', (data) => priceEmitter.storePrice('cryptoCom', data))
cryptoComClient.on('error', onError)

// ftx client setup
const ftxClient = new WebsocketClient('ftx', {
  wsUrl: 'wss://ftx.com/ws/'
})
ftxClient.on('update', data => priceEmitter.storePrice('ftx', data));
ftxClient.on('error', onError)

// bitfinexClient client setup
const bitfinexClient = new WebsocketClient('bitfinex', {
  wsUrl: 'wss://api-pub.bitfinex.com/ws/2'
})
bitfinexClient.on('update', data => priceEmitter.storePrice('bitfinex', data));
bitfinexClient.on('error', onError)

// coinbase client setup
const coinbaseClient = new WebsocketClient('coinbase', {
  wsUrl: 'wss://ws-feed.exchange.coinbase.com'
})
coinbaseClient.on('update', data => priceEmitter.storePrice('coinbase', data));
coinbaseClient.on('error', onError)


/**
 * Subscribes each feed to a list of known tokens
 */
export const subscribeWsFeeds = (tokens: KnownToken[]) => {
  bitfinexClient.subscribe(createBitfinexWsFeeds(tokens))
  // tempoarily pause streaming of FTX markets
  // ftxClient.subscribe(createFtxWsFeeds(tokens))
  binanceClient.subscribe(createBinanceWsFeeds(tokens))
  cryptoComClient.subscribe(createCryptoComWsFeeds(tokens))
  coinbaseClient.subscribe(createCoinbaseWsFeeds(tokens))
}

export default priceEmitter;
