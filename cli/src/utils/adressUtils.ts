import {ethers} from "ethers";

export const padded32 = (input: string) => {
    return ethers.zeroPadValue(input, 32);
}

export const stringify = (obj: object): string => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v)