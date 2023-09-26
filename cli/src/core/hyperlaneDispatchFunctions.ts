import {Contract, ethers, JsonRpcProvider, Log, LogDescription} from "ethers";
import {mailboxContractABI} from "../contracts/mailbox.ts";
import {HyperlaneConfig} from "../model/configuration.ts";
import {chain, Result} from "../utils/result.ts";
import {DispatchResult} from "../model/types.ts";
import {padded32} from "../utils/adressUtils.ts";

/**
 * Retrieves the message ID associated with a transaction.
 *
 * @param txHash - The transaction hash of the message.
 * @param mailboxContractAddress The address of the mailbox contract
 * @param provider - The JSON-RPC provider to interact with the Ethereum blockchain.
 * @returns A promise that resolves to the message ID as a string.
 */
export const getMessageId = async (
    txHash: string,
    mailboxContractAddress: string,
    provider: JsonRpcProvider
): Promise<Result<string, Error>> => {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
        return {kind: "error", error: new Error(`Unable to find receipt for transaction: ${txHash}`)};
    }

    const filter = {
        address: mailboxContractAddress,
        topics: [ethers.keccak256(ethers.toUtf8Bytes('DispatchId(bytes32)'))],
        fromBlock: receipt?.blockNumber,
        toBlock: receipt?.blockNumber,
    };

    const logs: [Log] = await provider.getLogs(filter);
    if (!logs.length) {
        return {kind: "error", error: new Error(`No logs found for transaction: ${txHash}`)};
    }

    let abi = new ethers.Interface(JSON.stringify(mailboxContractABI));

    const parsedLog: LogDescription | null = abi.parseLog(logs[0]);
    return {kind: "ok", value: parsedLog.args[0]};
}

export const payForGas = async (
    messageId: string,
    destinationDomain: number,
    gasAmount: bigint,
    refundAddress: string,
    fee: bigint,
    interchainGasPaymasterContract: Contract
): Promise<Result<string, Error>> => {
    try {
        const increasedFee = fee * BigInt(10);

        const payResult = await interchainGasPaymasterContract.payForGas(
            messageId,
            destinationDomain,
            gasAmount,
            refundAddress,
            {value: increasedFee}
        );

        await payResult.wait();

        return {kind: "ok", value: payResult.hash};
    } catch (error) {
        return {kind: "error", error: error};
    }
}

export const dispatchHyperlaneMessage = async (
    hyperlaneConfig: HyperlaneConfig,
    destinationDomain: number,
    recipientAddress: string,
    message: string,
    refundAddress: string
): Promise<Result<DispatchResult, Error>> => {
    try {
        const gas = await hyperlaneConfig.mailboxContract.dispatch.estimateGas(
            destinationDomain,
            padded32(recipientAddress),
            ethers.toUtf8Bytes(message)
        );

        const quote: bigint = await hyperlaneConfig.interchainGasPaymasterContract.quoteGasPayment(
            destinationDomain, BigInt(gas.toString())
        );

        const tx = await hyperlaneConfig.mailboxContract.dispatch(
            destinationDomain,
            padded32(recipientAddress),
            ethers.toUtf8Bytes(message),
        );

        const receipt = await tx.wait();
        const mailboxContractAddress = await hyperlaneConfig.mailboxContract.getAddress();

        const messageIdResult = await getMessageId(
            receipt.hash,
            mailboxContractAddress,
            hyperlaneConfig.jsonRpcProvider
        );

        return await chain(messageIdResult, async (messageId: string) => {
            const payResult = await payForGas(
                messageId,
                destinationDomain,
                BigInt(gas),
                refundAddress,
                quote,
                hyperlaneConfig.interchainGasPaymasterContract
            );

            return payResult.kind === 'ok'
                ? {
                    kind: "ok",
                    value: {
                        messageId: messageId,
                        dispatchTxHash: receipt.hash,
                        paymasterTxHash: payResult.value
                    } as DispatchResult
                }
                : payResult;
        });
    } catch (error) {
        return {kind: "error", error: error};
    }
}
