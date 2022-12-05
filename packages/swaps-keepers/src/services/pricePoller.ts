import { ethers } from "ethers";
import fetch from "node-fetch";
import {
    LabelledToken,
    BinancePrice,
    BitfinexPrice,
    FTXPrice,
    CryptoComPrice,
    TokenPrices,
    ParsedTokenPrice,
} from "@mycelium-ethereum/swaps-js/types";
import {
    calcMedian,
    bitfinexBestAskPriceIndex,
    bitfinexBestBidPriceIndex,
    bitfinexSymbolIndex,
    binanceSymbolToKnownToken,
    ftxSymbolToKnownToken,
    bitfinexSymbolToKnownToken,
    cryptoComSymbolToKnownToken,
    tokensToBinanceQuery,
    tokensToBitfinexQuery,
    tokensToFTXQuery,
    tokensToCryptoComQuery,
    logger,
} from "@mycelium-ethereum/swaps-js";

// requirements
// https://www.notion.so/tracerdao/Keeper-Requirements-0f41638b5e5043e888eaba48c7f13d4a#d2f8606651cb4e128fdd39fd2a6b3f5b

type KnownSymbols =
    | typeof bitfinexSymbolToKnownToken
    | typeof ftxSymbolToKnownToken
    | typeof binanceSymbolToKnownToken
    | typeof cryptoComSymbolToKnownToken;

/**
 * Price feed poller which calculates the median prices periodically
 */
export class PricePoller {
    tokens: LabelledToken[];

    constructor(props: { tokens: LabelledToken[] }) {
        this.tokens = props.tokens;
    }

    setKnownTokens = (tokens_: LabelledToken[]): void => {
        this.tokens = tokens_;
    };

    fetchBinancePrices = async (): Promise<ParsedTokenPrice[]> => {
        const binancePrices: BinancePrice[] = (await fetch(tokensToBinanceQuery(this.tokens))
            .then((res) => res.json())
            .catch((err) => {
                console.error("Failed to fetch binance prices", err);
                throw Error(err);
            })) as any[];
        // https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#current-average-price
        // current average price is already between bestBid and bestAsk
        const parsedBinancePrices = this.parseAndOrderResults<BinancePrice>(
            binancePrices,
            binanceSymbolToKnownToken,
            (r) => ({ symbol: r.symbol, bestBid: r.price, bestAsk: r.price })
        );
        return parsedBinancePrices;
    };

    fetchCryptoComPrices = async (): Promise<ParsedTokenPrice[]> => {
        const cryptoComPrices = (await fetch(tokensToCryptoComQuery(/* this.tokens */))
            .then((res) => res.json())
            .catch((err) => {
                console.error("Failed to fetch ftx prices");
                throw Error(err);
            })) as { result: { data: any[] } };
        const filteredCryptoComPrices = cryptoComPrices.result.data.filter((cryptoComResult: CryptoComPrice) => {
            const s = cryptoComSymbolToKnownToken[cryptoComResult.i];
            return !!s && this.tokens.map((price) => price.knownToken).includes(s);
        });

        // https://exchange-docs.crypto.com/spot/index.html#public-get-ticker
        const parsedCryptoComPrices = this.parseAndOrderResults<CryptoComPrice>(
            filteredCryptoComPrices,
            cryptoComSymbolToKnownToken,
            (r) => ({ symbol: r.i, bestBid: r.b, bestAsk: r.a })
        );
        return parsedCryptoComPrices;
    };

    fetchFTXPrices = async (): Promise<ParsedTokenPrice[]> => {
        const ftxPrices = (await fetch(tokensToFTXQuery(/* this.tokens */))
            .then((res) => res.json())
            .catch((err) => {
                console.error("Failed to fetch ftx prices");
                throw Error(err);
            })) as { result: any[] };
        const filteredFTXPrices = ftxPrices.result.filter((ftxResult: FTXPrice) => {
            const s = ftxSymbolToKnownToken[ftxResult.name];
            return !!s && this.tokens.map((price) => price.knownToken).includes(s);
        });

        // https://docs.ftx.com/#get-markets
        const parsedFTXPrices = this.parseAndOrderResults<FTXPrice>(filteredFTXPrices, ftxSymbolToKnownToken, (r) => ({
            symbol: r.name,
            bestBid: r.bid,
            bestAsk: r.ask,
        }));
        return parsedFTXPrices;
    };

    fetchBitfinexPrices = async (): Promise<ParsedTokenPrice[]> => {
        const bitfinexPrices = (await fetch(tokensToBitfinexQuery(this.tokens))
            .then((res) => res.json())
            .catch((err) => {
                console.error("Failed to fetch bitFinex prices");
                throw Error(err);
            })) as any[];

        // https://docs.bitfinex.com/reference/rest-public-ticker
        const parsedBitfinexPrices = this.parseAndOrderResults<BitfinexPrice>(
            bitfinexPrices,
            bitfinexSymbolToKnownToken,
            (r) => ({
                symbol: r[bitfinexSymbolIndex],
                bestBid: r[bitfinexBestBidPriceIndex],
                bestAsk: r[bitfinexBestAskPriceIndex],
            })
        );
        return parsedBitfinexPrices;
    };

    fetchMedianPrices = async (): Promise<TokenPrices> => {
        const [binancePrices, ftxPrices, bitFinexPrices, cryptoComPrices] = await Promise.all([
            this.fetchBinancePrices(),
            this.fetchFTXPrices(),
            this.fetchBitfinexPrices(),
            this.fetchCryptoComPrices(),
        ]);

        const tokensLength = this.tokens.length;
        if (
            bitFinexPrices.length !== tokensLength &&
            ftxPrices.length !== tokensLength &&
            binancePrices.length !== tokensLength
        ) {
            // handle not all tokens are set
            logger.info("Failed to fetch median token prices: Not all tokens are set");
            return [];
        }
        const medianPrices = this.tokens.map((_t, i) => {
            const prices: ethers.BigNumber[] = [
                binancePrices[i].price,
                ftxPrices[i].price,
                bitFinexPrices[i].price,
                cryptoComPrices[i].price,
            ].filter((price) => !!price);
            const median = calcMedian(prices);
            return median;
        });
        return medianPrices;
    };

    fetchMedianPricesAsObject = async (): Promise<Record<string, ethers.BigNumber>> => {
        const medianPrices = await this.fetchMedianPrices();
        return medianPrices.reduce((o, price, i) => ({ ...o, [this.tokens[i].address]: price }), {});
    };

    /**
     * Returns a parsed list of results. In strict order of tokens
     */
    parseAndOrderResults = <P>(
        prices: P[],
        knownSymbols: KnownSymbols,
        destructure: (r: P) => {
            symbol: string;
            bestAsk: string | number;
            bestBid: string | number;
        }
    ): ParsedTokenPrice[] => {
        if (!Array.isArray(prices)) {
            return [];
        }
        const parsedResults: ParsedTokenPrice[] = prices.map((r: P) => {
            const { symbol, bestBid, bestAsk } = destructure(r);
            const knownToken = knownSymbols[symbol];
            if (!knownToken) {
                throw Error(`Unknown symbol ${symbol}`);
            }
            const parsedBestBid = ethers.utils.parseEther(bestBid.toString());
            const parsedBestAsk = ethers.utils.parseEther(bestAsk.toString());
            return {
                knownToken,
                price: parsedBestBid.add(parsedBestAsk).div(2),
            };
        });

        // missing results in return
        if (parsedResults.length !== this.tokens.length) {
            this.tokens.forEach((token) => {
                const tokenPrice = parsedResults.find((token_) => token_.knownToken === token.knownToken);
                if (!tokenPrice) {
                    parsedResults.push({
                        // @ts-ignore
                        price: undefined,
                        knownToken: token.knownToken,
                    });
                }
            });
        }
        const knownTokens = this.tokens.map((token) => token.knownToken);
        const sortedParsedResults = parsedResults.sort((a, b) => {
            const indexA = knownTokens.indexOf(a.knownToken);
            const indexB = knownTokens.indexOf(b.knownToken);
            return indexA - indexB;
        });
        return sortedParsedResults;
    };
}
export default PricePoller;
