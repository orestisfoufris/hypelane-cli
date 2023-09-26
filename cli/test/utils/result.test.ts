import {describe, expect, it} from "bun:test";
import {chain, Err, Ok} from "../../src/utils/result.ts";

describe('chain function', () => {
    it('should return Err if initial result is Err', async () => {
        const errorResult: Err<Error> = {
            kind: 'error',
            error: new Error('Initial error'),
        };

        const chainedResult = await chain(errorResult, () => {
            return { kind: 'ok', value: 'someValue' };
        });

        expect(chainedResult).toBe(errorResult);
    });

    it('should correctly chain Ok result with synchronous function', async () => {
        const okResult: Ok<string> = {
            kind: 'ok',
            value: 'someValue',
        };

        const chainedResult = await chain(okResult, (value) => {
            return { kind: 'ok', value: value + 'Chained' };
        });

        expect(chainedResult).toEqual({ kind: 'ok', value: 'someValueChained' });
    });

    it('should correctly chain Ok result with asynchronous function', async () => {
        const okResult: Ok<number> = {
            kind: 'ok',
            value: 5,
        };

        const chainedResult = await chain(okResult, async (value) => {
            return new Promise<Ok<number>>((resolve) => { // Specify the type here
                setTimeout(() => {
                    resolve({ kind: 'ok', value: value * 2 });
                }, 100);
            });
        });

        expect(chainedResult).toEqual({ kind: 'ok', value: 10 });
    });

    it('should return Err if the chained function throws an error', async () => {
        const okResult: Ok<string> = {
            kind: 'ok',
            value: 'someValue',
        };

        const chainedResult = await chain(okResult, (_value: string) => {
            return { kind: 'error', error: new Error('Chained error') };
        });

        expect(chainedResult.kind).toBe('error');
        if (chainedResult.kind === 'error') {
            expect(chainedResult.error).toEqual(new Error('Chained error'));
        }
    });

    it('should return Err if the 2nd chained function throws an error', async () => {
        const okResult: Ok<string> = {
            kind: 'ok',
            value: 'someValue',
        };

        const lastResult: Ok<string> = {
            kind: 'ok',
            value: 'someOtherValue',
        };

        const errorResult = await chain(
            okResult, (_value: string) => {
                return ({ kind: 'error', error: new Error('Error result') });
        });

        const chainedResult = await chain(errorResult, () => lastResult);

        expect(chainedResult.kind).toBe('error');
        if (chainedResult.kind === 'error') {
            expect(chainedResult.error).toEqual(new Error('Error result'));
        }
    });

});