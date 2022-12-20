import { IPositionSchema } from "../models/position";
import colors from "colors";
import { PositionManager } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { liquidations, transactionErrors } from "../utils/prometheus";
import { ethers } from "ethers";

export const liquidateInBatches = async (positions: IPositionSchema[], positionManager: PositionManager) => {
    let cursor = 0;
    const positionsPerTransaction = 50;
    while (cursor < positions.length) {
        const batchPositions = positions.slice(cursor, cursor + positionsPerTransaction);

        if (batchPositions.length === 1) {
            console.log(`Liquidating ${batchPositions.length} position`);
            const position = batchPositions[0];

            const tx = await positionManager.liquidatePosition(
                position.account,
                position.collateralToken,
                position.indexToken,
                position.isLong,
                process.env.FEE_RECEIVER
            );

            const receipt = await tx.wait();

            console.log(colors.green(`Liquidated position ${position.key}`));
            console.log(colors.green(`Transaction hash: ${receipt.transactionHash}`));
            liquidations.inc();
        } else {
            const accounts = batchPositions.map((position) => position.account);
            const collateralTokens = batchPositions.map((position) => position.collateralToken);
            const indexTokens = batchPositions.map((position) => position.indexToken);
            const isLongs = batchPositions.map((position) => position.isLong);

            // For some reason, the last position in the batch is not liquidated
            // so we add a null value to the end of the arrays to fix this
            accounts.push(ethers.constants.AddressZero);
            collateralTokens.push(ethers.constants.AddressZero);
            indexTokens.push(ethers.constants.AddressZero);
            isLongs.push(false);

            console.log(colors.yellow(`Liquidating positions ${cursor} to ${cursor + batchPositions.length}...`));
            const tx = await positionManager.liquidatePositions(
                accounts,
                collateralTokens,
                indexTokens,
                isLongs,
                process.env.FEE_RECEIVER
            );

            const receipt = await tx.wait();

            console.log(colors.green(`Sent!`));
            console.log(colors.green(`Transaction hash: ${receipt.transactionHash}`));

            const errorEvents = receipt.events?.filter((event) => event.event === "LiquidationError") || [];
            if (errorEvents.length) {
                console.log(colors.red(`${errorEvents.length} liquidation errors occured`));
                errorEvents.forEach((event) => {
                    transactionErrors.inc();
                    console.log({
                        type: event.event,
                        account: event.args?.account,
                        indexToken: event.args?.indexToken,
                        reason: event.args?.reason,
                    });
                });
            }
            liquidations.inc(batchPositions.length - errorEvents.length);
        }
        cursor += positionsPerTransaction;
    }
};

export const liquidateOneByOne = async (positions: IPositionSchema[], positionManager: PositionManager) => {
    for (const position of positions) {
        console.log(colors.yellow(`Liquidating position ${position.account}`));
        const tx = await positionManager.liquidatePosition(
            position.account,
            position.collateralToken,
            position.indexToken,
            position.isLong,
            process.env.FEE_RECEIVER
        );
        const receipt = await tx.wait();
        console.log(colors.green(`Sent!`));
        console.log(colors.green(`Transaction hash: ${receipt.transactionHash}`));
        liquidations.inc(1);
    }
};
