import { Provider } from "@ethersproject/providers";
import PositionService, { IPositionService } from "./../services/position.service";
import ParameterService, { IParameterService } from "./../services/parameter.service";
import { Vault } from "@mycelium-ethereum/perpetual-swaps-contracts";
import { lastSyncedBlock } from "../utils/prometheus";
import { LogDescription } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const getOpenPositions = async (vault: Vault, provider: Provider) => {
    const maxProcessBlock = Number(process.env.MAX_PROCESS_BLOCK);

    const positionService: IPositionService = new PositionService();
    const parameterService: IParameterService = new ParameterService();

    let cursor = Number(process.env.FROM_BLOCK);

    const processedLastBlock = await parameterService.getParameter("PROCESSED_LAST_BLOCK");

    if (processedLastBlock) {
        cursor = Number(processedLastBlock.value);
        console.log("processedLastBlock =" + processedLastBlock.value);
    } else {
        parameterService.createNewParameter("PROCESSED_LAST_BLOCK", cursor.toString());
    }

    let lastBlock = await provider.getBlock("latest");

    console.log("lastBlock =" + lastBlock.number);

    while (cursor < lastBlock.number) {
        const fromBlock = cursor;
        const toBlock = Math.min(cursor + maxProcessBlock, lastBlock.number);
        console.log("Syncing blocks ::" + fromBlock + "-" + toBlock);

        const logs = await provider.getLogs({
            address: vault.address,
            fromBlock,
            toBlock,
        });

        for (const log of logs) {
            const event = vault.interface.parseLog(log);
            switch (event.name) {
                case "IncreasePosition":
                    await handleIncreasePosition(event, positionService, log.blockNumber);
                    break;
                case "DecreasePosition":
                    await handleDecreasePosition(event, positionService);
                    break;
                case "LiquidatePosition":
                    await handleLiquidatePosition(event, positionService, log.blockNumber);
                    break;
                case "UpdatePosition":
                    await handleUpdatePosition(event, positionService);
                    break;
                case "ClosePosition":
                    await handleClosePosition(event, positionService, log.blockNumber);
                    break;
            }
        }

        await parameterService.updateParameter("PROCESSED_LAST_BLOCK", toBlock.toString());
        lastSyncedBlock.set(toBlock);

        cursor = toBlock + 1;
    }

    const openPositions = await positionService.getPositions();

    return openPositions;
};

export default getOpenPositions;

async function handleIncreasePosition(event: LogDescription, positionService: PositionService, blockNumber: number) {
    const position = await positionService.getPosition(event.args.key);
    if (position) {
        const collateralAmount = BigNumber.from(position.collateralAmount)
            .add(event.args.collateralDelta)
            .sub(event.args.fee);
        const size = event.args.sizeDelta.add(position.size);

        position.collateralAmount = collateralAmount.toString();
        position.size = size.toString();
        await positionService.updatePosition(position);
    } else {
        const collateral = event.args.collateralDelta.sub(event.args.fee);
        await positionService.createNewPosition({
            key: event.args.key,
            collateralToken: event.args.collateralToken,
            indexToken: event.args.indexToken,
            account: event.args.account,
            isLong: event.args.isLong,
            size: event.args.sizeDelta.toString(),
            collateralAmount: collateral.toString(),
            averagePrice: "0",
            entryFundingRate: "0",
            blockNumber,
        });
    }
}

async function handleDecreasePosition(event: LogDescription, positionService: PositionService) {
    const position = await positionService.getPosition(event.args.key);
    if (position) {
        const collateralAmount = BigNumber.from(position.collateralAmount)
            .sub(event.args.collateralDelta)
            .sub(event.args.fee);
        const size = BigNumber.from(position.size).sub(event.args.sizeDelta);

        position.collateralAmount = collateralAmount.toString();
        position.size = size.toString();
        await positionService.updatePosition(position);
    } else {
        // This should never happen, but we'll log it so we don't block the process
        console.log(`DECREASE POSITION ERROR: Position not found ${event.args.key}`);
    }
}

async function handleUpdatePosition(event: LogDescription, positionService: PositionService) {
    const position = await positionService.getPosition(event.args.key);
    if (position) {
        position.averagePrice = event.args.averagePrice.toString();
        position.entryFundingRate = event.args.entryFundingRate.toString();
        await positionService.updatePosition(position);
    } else {
        // This should never happen, but we'll log it so we don't block the process
        console.log(`UPDATE POSITION ERROR: Position not found ${event.args.key}`);
    }
}

async function handleLiquidatePosition(event: LogDescription, positionService: PositionService, blockNumber: number) {
    await positionService.deletePosition(event.args.key, blockNumber);
}

async function handleClosePosition(event: LogDescription, positionService: PositionService, blockNumber: number) {
    await positionService.deletePosition(event.args.key, blockNumber);
}
