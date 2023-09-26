export const interchainGasPaymasterABI = [
    {
        name: "payForGas",
        inputs: [
            {type: "bytes32", name: "_messageId"},
            {type: "uint32", name: "_destinationDomain"},
            {type: "uint256", name: "_gasAmount"},
            {type: "address", name: "_refundAddress"},
        ],
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        name: "quoteGasPayment",
        inputs: [
            {type: "uint32", name: "_destinationDomain"},
            {type: "uint256", name: "_gasAmount"},
        ],
        outputs: [{type: "uint256", name: ""}],
        stateMutability: "view",
        type: "function",
    },
];