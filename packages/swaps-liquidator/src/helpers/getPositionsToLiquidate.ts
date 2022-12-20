import { IPositionSchema } from "../models/position";
import { Vault } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { retry } from "./helpers";
import { BigNumber } from "ethers";
import { getCumulativeFundingRate, getLiquidationFee, getMarginFeeBps, getTokenPrice } from "./cachedGetters";

const MAX_LEVERAGE_BPS = process.env.MAX_LEVERAGE_BPS
    ? BigNumber.from(process.env.MAX_LEVERAGE_BPS)
    : BigNumber.from(500000);
const BASIS_POINTS_DIVISOR = 10000;

const getPositionsToLiquidate = async (vault: Vault, openPositions: IPositionSchema[]) => {
    const positionsOverMaxLeverage: IPositionSchema[] = [];
    await Promise.all(
        openPositions.map(async (position) => {
            const size = BigNumber.from(position.size);
            const liquidationMargin = size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE_BPS);

            const price = await getTokenPrice(position.indexToken, position.isLong, vault);
            const collateral = BigNumber.from(position.collateralAmount);
            const delta = getDelta(position, price);
            const remainingCollateral = collateral.add(delta);

            const fees = await calculateFees(position, vault);

            if (remainingCollateral.lt(fees)) {
                positionsOverMaxLeverage.push(position);
            } else if (remainingCollateral.lte(liquidationMargin)) {
                positionsOverMaxLeverage.push(position);
            }
        })
    );

    console.log(`Positions over max leverage: ${positionsOverMaxLeverage.length}`);

    // Confirm in contract that position is liquidatible
    const positionsToLiquidate: IPositionSchema[] = [];
    await Promise.all(
        positionsOverMaxLeverage.map(async (position) => {
            const liquidationState = await getLiquidationState(position, vault);
            if (liquidationState > 0) {
                console.log("ToLiquidatePosition******************************");
                console.log(`LiquidationState: ${liquidationState}`);
                console.log(position);
                positionsToLiquidate.push(position);
            }
        })
    );

    return positionsToLiquidate;
};

const getLiquidationState = async (dbPosition: IPositionSchema, vault: Vault) => {
    try {
        const liquidationState = await retry({
            fn: async () => {
                const [state] = await vault.validateLiquidation(
                    dbPosition.account,
                    dbPosition.collateralToken,
                    dbPosition.indexToken,
                    dbPosition.isLong,
                    false
                );
                return state;
            },
            shouldRetry: () => {
                return true;
            },
            maxRetries: 10,
            timeoutSeconds: 5,
        });

        if (!liquidationState) return 0;
        return liquidationState.toNumber();
    } catch (err) {
        console.error(err);
    }
};

const getDelta = (position: IPositionSchema, price: BigNumber) => {
    const size = BigNumber.from(position.size);
    const averagePrice = BigNumber.from(position.averagePrice);
    const priceDelta = position.isLong ? price.sub(averagePrice) : averagePrice.sub(price);
    return size.mul(priceDelta).div(averagePrice);
};

async function calculateFees(position: IPositionSchema, vault: Vault) {
    const fundingFee = await getFundingFee(position, vault);
    const positionFee = await getPositionFee(position, vault);
    const liquidationFee = await getLiquidationFee(vault);
    return fundingFee.add(positionFee).add(liquidationFee);
}

const FUNDING_RATE_PRECISION = 1000000;
async function getFundingFee(position: IPositionSchema, vault: Vault): Promise<BigNumber> {
    const cumulativeFundingRate = await getCumulativeFundingRate(position.indexToken, vault);
    const fundingRate = cumulativeFundingRate.sub(position.entryFundingRate);
    if (fundingRate.eq(0)) {
        return BigNumber.from(0);
    }
    return BigNumber.from(position.size).mul(fundingRate).div(FUNDING_RATE_PRECISION);
}

async function getPositionFee(position: IPositionSchema, vault: Vault) {
    const marginFeeBps = await getMarginFeeBps(vault);
    return BigNumber.from(position.size).mul(marginFeeBps).div(BASIS_POINTS_DIVISOR);
}

export default getPositionsToLiquidate;
