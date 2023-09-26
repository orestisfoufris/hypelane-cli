import {ethers, JsonRpcProvider, Log, LogDescription} from "ethers";
import {chain, Result} from "../utils/result.ts";
import {mailboxContractABI} from "../contracts/mailbox.ts";
import {padded32} from "../utils/adressUtils.ts";
import {RangePair} from "../model/types.ts";

/**
 * Retrieves messages between specified block numbers and processes them using the provided `consumeFn`.
 *
 * @param origin - The origin parameter for the messages.
 * @param destination - The destination parameter for the messages.
 * @param senderAddress - The sender's address.
 * @param recipientAddress - The recipient's address.
 * @param mailboxContractAddress - The address of the mailbox contract.
 * @param fromBlock - The starting block number for retrieving messages.
 * @param toBlock - The ending block number for retrieving messages.
 * @param rangeSize - The range of blocks to retrieve messages from.
 * @param provider - The JSON RPC provider.
 * @param consumeFn - A function to process each message body.
 *
 * @returns An array of promises or an Error if any occur during retrieval or processing.
 */
export const getMessages = async (
    origin: number,
    destination: number,
    senderAddress: string,
    recipientAddress: string,
    mailboxContractAddress: string,
    fromBlock: number,
    toBlock: number,
    rangeSize: number,
    provider: JsonRpcProvider,
    consumeFn: (messageBody: string) => Promise<Result<null, Error>>
): Promise<Result<Promise<void>[], Error>> => {

    const pairsResult: Result<RangePair[], Error> = createRangePairs(fromBlock, toBlock, rangeSize);
    const processMessageBodies = async (messageBodies: string[]): Promise<Result<void, Error>> => {
        for (const messageBody of messageBodies) {
            const consumeResult = await consumeFn(messageBody);
            if (consumeResult.kind === 'error') return consumeResult;
        }
    };

    const processRangePair = async (rangePair: RangePair): Promise<Result<void, Error>> =>
        chain(
            await getDispatchLogs(
                origin,
                destination,
                senderAddress,
                recipientAddress,
                mailboxContractAddress,
                rangePair.start,
                rangePair.end,
                provider
            ),
            processMessageBodies
        );

    return await chain(pairsResult, async (pairs: RangePair[]) => {
        const promises = pairs.map(async (pair) => {
            await processRangePair(pair);
        })
        return {kind: "ok", value: promises}
    });
};

const extractMessageBody = (parsedLogs: [LogDescription]): Result<[string], Error> => {
    try {
        const decoder = new TextDecoder('utf-8', {fatal: true});

        const messages = parsedLogs.map((parsedLog: LogDescription) => {
            const message = parsedLog.args.message;

            // message encodes more than the actual body thus the offset
            const BODY_OFFSET = 77;

            // remove '0x' prefix if exists and slice from BODY_OFFSET
            // `* 2` is used because message is a hexadecimal string, and each hexadecimal character represents 4 bits
            const bodyHex = message.startsWith('0x')
                ? message.slice(2 + BODY_OFFSET * 2)
                : message.slice(BODY_OFFSET * 2);

            const bodyBuffer = Buffer.from(bodyHex, 'hex');
            return decoder.decode(bodyBuffer);
        });

        return {kind: "ok", value: messages};
    } catch (error) {
        return {kind: "error", error: error};
    }
}
const getDispatchLogs = async (
    origin: number,
    destination: number,
    senderAddress: string,
    recipientAddress: string,
    mailboxContractAddress: string,
    fromBlock: number,
    toBlock: number,
    provider: JsonRpcProvider
): Promise<Result<[string], Error>> => {
    try {
        const abi = new ethers.Interface(JSON.stringify(mailboxContractABI));

        const eventSignature = ethers.id('Dispatch(address,uint32,bytes32,bytes)');

        const filter = {
            address: mailboxContractAddress,
            topics: [
                eventSignature,
                padded32(senderAddress),
                padded32(ethers.toBeHex(destination)),
                padded32(recipientAddress),
            ],
            fromBlock: fromBlock,
            toBlock: toBlock,
        };

        const logs: Log[] = await provider.getLogs(filter);

        const parsedLogs: (LogDescription | null)[] = logs
            .map((log: Log) => abi.parseLog(log))
            .filter((parsedLog: LogDescription | null) => parsedLog !== null);

        return extractMessageBody(parsedLogs as [LogDescription]);
    } catch (error) {
        return {kind: "error", error: error};
    }
}

export const createRangePairs = (
    start: number,
    end: number,
    batchSize: number
): Result<RangePair[], Error> => {
    if (batchSize <= 0) return { kind: 'error', error: new Error("Batch size must be a positive number") };
    if (start > end) return { kind: 'error', error: new Error("Start index must be less than or equal to end index") };

    const rangeCount = Math.ceil((end - start + 1) / batchSize);
    const ranges: RangePair[] = Array.from({ length: rangeCount }, (_, idx) => {
        const rangeStart = start + idx * batchSize;
        const rangeEnd = Math.min(rangeStart + batchSize - 1, end);
        return { start: rangeStart, end: rangeEnd };
    });

    return { kind: 'ok', value: ranges };
};
