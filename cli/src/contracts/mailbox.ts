export const mailboxContractABI = [
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "bytes32", "name": "messageId", "type": "bytes32"}
        ],
        "name": "DispatchId",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
            {"indexed": true, "internalType": "uint32", "name": "destination", "type": "uint32"},
            {"indexed": true, "internalType": "bytes32", "name": "recipient", "type": "bytes32"},
            {"indexed": false, "internalType": "bytes", "name": "message", "type": "bytes"}
        ],
        "name": "Dispatch",
        "type": "event"
    },
    {
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"internalType": "uint32", "name": "_destinationDomain", "type": "uint32"},
            {"internalType": "bytes32", "name": "_recipientAddress", "type": "bytes32"},
            {"internalType": "bytes", "name": "_messageBody", "type": "bytes"}
        ],
        "name": "dispatch",
        "outputs": [
            {"internalType": "bytes32", "name": "outMessageId", "type": "bytes32"}
        ]
    },
    {
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"internalType": "bytes", "name": "_metadata", "type": "bytes"},
            {"internalType": "bytes", "name": "_message", "type": "bytes"}
        ],
        "name": "process",
        "outputs": []
    }
];
