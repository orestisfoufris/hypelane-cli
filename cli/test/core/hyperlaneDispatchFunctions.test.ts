import {describe, expect, it, jest} from "bun:test";
import {getMessageId, payForGas} from "../../src/core/hyperlaneDispatchFunctions.ts";
import {Contract, JsonRpcProvider} from "ethers";
import {fail} from "assert";


describe('HyperlaneDispatchFunctions Tests', () => {

    describe('getMessageId', () => {
        it('should return error if receipt is not found', async () => {
            const mockProvider = {
                getTransactionReceipt: jest.fn().mockResolvedValue(null),
            } as JsonRpcProvider;

            const txHash = 'someHash';
            const result = await getMessageId(
                txHash,
                'someAddress',
                mockProvider
            );

            switch (result.kind) {
                case "ok":
                    fail("Should have failed as getTransactionReceipt returned null");
                    break;
                case "error":
                    expect(result.error).toBeInstanceOf(Error);
                    expect(result.error.message).toBe(`Unable to find receipt for transaction: ${txHash}`);
                    break;
            }
        });
    });

    describe('payForGas', () => {
        it('should return the expected tx hash', async () => {
            const expectedHash = 'payForGasTxHash';
            const mockWait = jest.fn();
            const mockPayForGas = jest.fn();

            const mockPayMasterContract = {
                payForGas: mockPayForGas.mockResolvedValue({ wait: mockWait, hash: expectedHash }),
            } as Contract;

            const result = await payForGas(
                'someId',
                1,
                BigInt(100),
                'someAddress',
                BigInt(10),
                mockPayMasterContract
            );

            switch (result.kind) {
                case "ok":
                    expect(result.value).toBe(expectedHash);
                    break;
                case "error":
                    fail("Should have failed succeeded");
                    break;
            }

            expect(mockWait).toHaveBeenCalledTimes(1);
            expect(mockPayForGas).toHaveBeenCalledTimes(1);
            expect(mockPayForGas).toHaveBeenCalled()

            const lastCall = mockPayForGas.mock.lastCall;
            expect(lastCall).toEqual(["someId", 1, 100n, "someAddress", { value: 100n}]);
        });
    });

});
