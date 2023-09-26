import {JsonRpcProvider} from "ethers";

export const getBalance = async (address: string, provider: JsonRpcProvider): Promise<bigint> => {
    return await provider.getBalance(address);
}

export const getTopBlockNumber = async (provider: JsonRpcProvider): Promise<number> => {
    return await provider.getBlockNumber();
}
