export type LabelledToken = {
    address: string;
    knownToken: KnownToken;
};

export type PriceFeedToken = LabelledToken & {
    precision: number;
};

export enum KnownToken {
    ETH = "ETH",
    BTC = "BTC",
    LINK = "LINK",
    UNI = "UNI",
    FXS = "FXS",
    CRV = "CRV",
    BAL = "BAL",
}
