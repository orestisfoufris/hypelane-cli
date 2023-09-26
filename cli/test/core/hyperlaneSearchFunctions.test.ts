import {describe, expect, it} from "bun:test";
import {createRangePairs} from "../../src/core/hyperlaneSearchFunctions.ts";
import {Err} from "../../src/utils/result.ts";

describe('HyperlaneSearchFunctions Tests', async () => {

    describe('createRangePairs', () => {

        it('should return error when batchSize is non-positive', () => {
            const result = createRangePairs(1, 10, -1);
            expect(result.kind).toBe('error');
            expect((result as Err<Error>).error.message).toBe('Batch size must be a positive number');
        });

        it('should return error when start is greater than end', () => {
            const result = createRangePairs(11, 10, 1);
            expect(result.kind).toBe('error');
            expect((result as Err<Error>).error.message).toBe('Start index must be less than or equal to end index');
        });

        it('should return correct range pairs', () => {
            const result = createRangePairs(1, 5, 2);
            if (result.kind === 'error') throw result.error; // fail the test if result is an error
            expect(result.value).toEqual([
                { start: 1, end: 2 },
                { start: 3, end: 4 },
                { start: 5, end: 5 }
            ]);
        });

        it('should return single range pair when start equals end', () => {
            const result = createRangePairs(5, 5, 2);
            if (result.kind === 'error') throw result.error;
            expect(result.value).toEqual([
                { start: 5, end: 5 }
            ]);
        });
    });
});