import {afterEach, beforeEach, describe, expect, it, jest} from "bun:test";
import {createHyperlaneExplorerClient, HyperlaneExplorerClient} from "../../src/core/hyperlaneExplorerClient.ts";
import {FailedResponse, Message} from "../../src/model/apiResponse.ts";

const getTestMessage = (status: string = 'delivered'): Message => {
    const message = {
        id: '1',
        status: status,
        sender: '0xe623c02525904f1e99850cb8bef4f04dff06f093',
        recipient: '0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35',
        originDomainId: 1,
        destinationDomainId: 2,
        nonce: 1,
        body: 'test message',
        originTransaction: {
            from: '0xe623c02525904f1e99850cb8bef4f04dff06f093',
            transactionHash: '0x17e7611077a05b6a2982bc510c50bd2ba50582ca066b29f2c9f01889011d6d15',
            blockNumber: 123456,
            gasUsed: 21000,
            timestamp: 1625252400,
        }
    };

    if (status === 'delivered') {
        message['destinationTransaction'] = {
            from: '0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35',
            transactionHash: '0xeb72c18cb324313ac6cb834a6d6c8358f45833ecfef1ef66f0765601a424b10f',
            blockNumber: 654321,
            gasUsed: 31500,
            timestamp: 1625252500,
        }
    }

    return message as Message;
}

describe('HyperlaneExplorerClient Tests', () => {
    let client: HyperlaneExplorerClient;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        (global as any).fetch = fetchMock;
        client = createHyperlaneExplorerClient('https://baseurl.com');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    })

    describe('fetchMessageById', () => {
        it('should return a message when the fetch is successful', async () => {
            const message: Message = getTestMessage();

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ result: [message] }),
            });

            const result = await client.fetchMessageById('someId');

            expect(result).toEqual({ kind: 'ok', value: [message] });
        });

        it('should return an error when the fetch is not successful',async () => {
            const errorResponse: FailedResponse = {
                name: 'MessageFetchError',
                message: "HTTP failed. Status was: 404",
                status: 404,
            };

            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await client.fetchMessageById('someId');

            expect(result).toEqual({ kind: 'error', error: errorResponse });
        });
    });

    describe('pollUntilDelivered', () => {
        it('should return a success message when the status is delivered', async () => {
            const message: Message = getTestMessage();

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ result: [message] }),
            });

            const result = await client.pollUntilDelivered(
                'someId',
                100,
                10
            );

            expect(result).toEqual({ kind: 'ok', value: {status: 'delivered'} });
        });

        it('should return an error when the fetch fails', async () => {
            const errorResponse: FailedResponse = {
                name: 'MessageFetchError',
                message: "HTTP failed. Status was: 404",
                status: 404,
            };

            fetchMock.mockResolvedValue({
                ok: false,
                status: 404,
            });

            const result = await client.pollUntilDelivered('someId', 100, 10);

            expect(result).toEqual({ kind: 'error', error: errorResponse });
        });

        it('should return a pending status if we message stays undelivered', async () => {
            const message: Message = getTestMessage('pending');

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ result: [message] }),
            });

            const result = await client.pollUntilDelivered(
                'someId',
                100,
                10
            );

            expect(result).toEqual({ kind: 'ok', value: {status: 'pending'} });
        });
    });
});

