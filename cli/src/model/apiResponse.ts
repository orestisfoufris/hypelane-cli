export type OriginTransaction = {
    from: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: number;
    timestamp: number;
}

export type DestinationTransaction = {
    from: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: number;
    timestamp: number;
}

export type Message = {
    id: string;
    status: string;
    sender: string;
    recipient: string;
    originDomainId: number;
    destinationDomainId: number;
    nonce: number;
    body: string;
    originTransaction: OriginTransaction;
    destinationTransaction: DestinationTransaction;
}

export interface FailedResponse extends Error {
    status: number
}
