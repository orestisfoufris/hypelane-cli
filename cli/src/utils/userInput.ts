import {OptionValues} from "commander";
import {Result} from "./result.ts";
import {DomainPerChain} from "../configuration.ts";

export const getDomainNumbers = (
    destination: string,
    origin: string,
    destinationDomainPerChain: DomainPerChain
): Result<[number, number], Error> => {
    const destinationDomain = destinationDomainPerChain[destination];
    const originDomain = destinationDomainPerChain[origin];

    if(!destinationDomain || !originDomain) {
        const err = new Error(`Invalid destination and/or origin chains. Supported chains are: ${Object.keys(destinationDomainPerChain).join(', ')}`);
        return {kind: "error", error: err};
    }

    return {kind: "ok", value: [destinationDomain, originDomain]};
};


export const sanitizeUserInput = (opts: OptionValues) => {
    for (const key in opts) {
        if (typeof opts[key] === 'string') {
            opts[key] = opts[key].trim();
        }
    }

    return opts;
}
