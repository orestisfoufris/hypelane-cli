export type DispatchCliParams = {
    command: 'dispatch';
    key: string;
    origin: number;
    mailbox: string;
    paymaster: string;
    rpc: string;
    destination: number;
    address: string;
    refundAddress: string;
    message: string;
};

export type DispatchResult = {
    messageId: string,
    dispatchTxHash: string,
    paymasterTxHash: string
};

export type SearchCliParams = {
    command: 'search';
    origin: number;
    mailbox: string;
    destination: number;
    senderAddress: string;
    recipientAddress: string;
    originRpcUrl: string;
};

export type RangePair = {
    start: number,
    end: number
}