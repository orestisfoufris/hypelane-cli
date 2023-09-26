import {Contract, ethers, JsonRpcProvider} from "ethers";
import {interchainGasPaymasterABI} from "./contracts/interchainGasPaymaster.ts";
import {mailboxContractABI} from "./contracts/mailbox.ts";

export type DomainPerChain = Record<string, number>;

export const destinationDomainPerChain: DomainPerChain = {
    arbitrum: 421613,
    optimism: 420,
    goerli: 5,
    sepolia: 11155111,
    polygon: 80001
}

export type HyperlaneConfig = {
    jsonRpcProvider: JsonRpcProvider,
    mailboxContract: Contract,
    interchainGasPaymasterContract: Contract,
}

export const buildHyperlaneConfig = (
    rpcUrl: string,
    mailboxContractAddress,
    interchainGasPaymasterContractAddress,
    senderPrivateKey: string
): HyperlaneConfig => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const senderWallet = new ethers.Wallet(senderPrivateKey, provider);

    const mailboxContract = new ethers.Contract(mailboxContractAddress, mailboxContractABI, senderWallet);
    const interchainGasPaymasterContract = new ethers.Contract(interchainGasPaymasterContractAddress, interchainGasPaymasterABI, senderWallet);

    return {
        jsonRpcProvider: provider,
        mailboxContract: mailboxContract,
        interchainGasPaymasterContract: interchainGasPaymasterContract
    }
}
