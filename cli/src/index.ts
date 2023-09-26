import figlet from "figlet";
import {program} from 'commander';
import chalk from 'chalk';
import {DispatchCliParams, DispatchResult, SearchCliParams} from "./model/types.ts";
import {chain, Result} from "./utils/result.ts";
import {getDomainNumbers, sanitizeUserInput} from "./utils/userInput.ts";
import {buildHyperlaneConfig, destinationDomainPerChain} from "./configuration.ts";
import {dispatchHyperlaneMessage} from "./core/hyperlaneDispatchFunctions.ts";
import {createHyperlaneExplorerClient} from "./core/hyperlaneExplorerClient.ts";
import {getMessages} from "./core/hyperlaneSearchFunctions.ts";
import {getTopBlockNumber} from "./core/evmFunctions.ts";
import {ethers} from "ethers";

program
    .command('dispatchMessage')
    .description('Dispatch a message over Hyperlane.')
    .option('-k --key <key>', 'Optional Private key', 'ef7e060cc3ae336d31b8aa0b0cc45b35c91292c02196adf8074c5b0e0ebc9b54')
    .requiredOption('-o, --origin <origin>', 'Origin chain')
    .requiredOption('-m, --mailbox <mailbox>', 'Mailbox address')
    .requiredOption('-p, --paymaster <paymaster>', 'GasPaymaster address')
    .requiredOption('-r, --rpc <rpc>', 'RPC URL')
    .requiredOption('-dc, --destination <destination>', 'Destination chain')
    .requiredOption('-a, --address <address>', 'Destination address')
    .requiredOption('-ra, --refundAddress <refundAddress>', 'An address for the extra fees to be refunded')
    .requiredOption('-me, --message <message>', 'Message to be sent')
    .action(async (options) => {
        const {key, origin, mailbox, paymaster, rpc, destination, address, refundAddress, message} = sanitizeUserInput(options);

        const domains = getDomainNumbers(destination, origin, destinationDomainPerChain);

        await chain(domains, async (domainsIds: Record<number, number>) => {
            const cliParams: DispatchCliParams = {
                command: 'dispatch',
                key,
                origin: domainsIds[1],
                mailbox,
                paymaster,
                rpc,
                destination: domainsIds[0],
                address,
                refundAddress,
                message
            }
            await runDispatch(cliParams).catch(console.error);

            return {kind: "ok", value: 'runDispatch command run successfully'}
        })

    });

program.description(chalk.green.bold.italic("A simple CLI for sending messages over Hyperlane."));

program
    .command('search')
    .description('Search for messages between a sender address and recipient on a given network')
    .requiredOption('-o, --origin <origin>', 'Origin chain')
    .requiredOption('-m, --mailbox <mailbox>', 'Mailbox address')
    .requiredOption('-dc, --destination <destination>', 'Destination chain')
    .requiredOption('-sa, --senderAddress <senderAddress>', 'Sender address')
    .requiredOption('-ra, --recipientAddress <recipientAddress>', 'Recipient address')
    .requiredOption('-r, --originRpcUrl <originRpcUrl>', 'Origin RPC URL')
    .action(async (options) => {
        const {origin, mailbox, destination, senderAddress, recipientAddress, originRpcUrl} = sanitizeUserInput(options);
        const domains = getDomainNumbers(destination, origin, destinationDomainPerChain);

        const parsedLogResults = await chain(domains, async (domainsIds: Record<number, number>) => {
            const searchParams: SearchCliParams = {
                command: 'search',
                origin: domainsIds[1],
                mailbox,
                destination: domainsIds[0],
                senderAddress,
                recipientAddress,
                originRpcUrl,
            }
            return await runSearch(searchParams).catch(console.error);
        })

        if (parsedLogResults && parsedLogResults.kind === "error") {
            console.log(`There was an error trying to fetch messages: ${parsedLogResults.error.message}`);
        }
    });

const runDispatch = async (cliParams: DispatchCliParams): Promise<void> => {

    const hyperlaneConfig = buildHyperlaneConfig(
        cliParams.rpc,
        cliParams.mailbox,
        cliParams.paymaster,
        cliParams.key
    );

    const dispatchMessageFn = async (): Promise<Result<DispatchResult, Error>> => dispatchHyperlaneMessage(
        hyperlaneConfig,
        cliParams.destination,
        cliParams.address,
        cliParams.message,
        cliParams.refundAddress
    );
    const res = await dispatchMessageFn();

    const maxTimeoutMs = 120_000;
    const maxIntervalMs = 5_000;

    const messageResult = await chain(res, async (dispatchResult: DispatchResult) => {
        console.log(JSON.stringify(dispatchResult));

        const baseUrl = 'https://explorer.hyperlane.xyz/api';
        const hyperlaneApiClient = createHyperlaneExplorerClient(baseUrl);
        return await hyperlaneApiClient.pollUntilDelivered(
            dispatchResult.messageId,
            maxTimeoutMs,
            maxIntervalMs
        );
    });

    switch (messageResult.kind) {
        case "ok":
            switch (messageResult.value.status) {
                case "delivered":
                    console.log(chalk.green.bold("Your message was delivered successfully"));
                    break;
                case "failed":
                    console.log(chalk.red.bold("Your message was failed"));
                    break;
                case "pending":
                    console.log(chalk.cyan.bold(`Your message was still pending after ${(maxTimeoutMs / 1000)} seconds`));
                    break;
            }
            break;
        case "error":
            console.log(`There was an error during message dispatching: ${messageResult.error}`);
            break;
    }
}

const runSearch = async (searchParams: SearchCliParams): Promise<Result<null, Error>> => {
    const provider = new ethers.JsonRpcProvider(searchParams.originRpcUrl);
    const latestBlock = await getTopBlockNumber(provider);
    const consumeFn = async (messageBody: string): Promise<Result<null, Error>> => {
        console.log(`MessageBody: ${messageBody}`);
        return {kind: "ok", value: null}
    }

    const fromBlock = Math.max(1, latestBlock - 1_000_000);
    const results = await getMessages(
        searchParams.origin,
        searchParams.destination,
        searchParams.senderAddress,
        searchParams.recipientAddress,
        searchParams.mailbox,
        fromBlock,
        latestBlock,
        50_000,
        provider,
        consumeFn
    );

    return chain(results, async (promises) => {
        await Promise.all(promises);
        return {kind: "ok", value: null}
    })
}

const getArgs = (): string[] => {
    const args = process.argv;
    if (!args.slice(2).length) {
        program.outputHelp();
        return [];
    }

    return args;
}
async function main() {
    const body = figlet.textSync("Welcome  to  Hyperlane  Demo  CLI !");
    console.log(chalk.green.bold.italic(body));

    const args = getArgs();
    program.parse(args);
}

await main();