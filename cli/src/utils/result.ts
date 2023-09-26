export type Ok<T> = {
    kind: 'ok';
    value: T;
}

export type Err<E extends Error> = {
    kind: 'error';
    error: E;
    //retryable: boolean; // This can be added to differentiate between things we can retry (e.g connection hiccups) and things we can't (e.g 400 HTTP Errors)
}

export type Result<T, E extends Error> = Ok<T> | Err<E>;

/**
 * Chains `result` with a transformation function `fn`. If the `Result` is
 * of kind 'ok', it applies the transformation function `fn` to its value; If the `Result`
 * is of kind 'error', it immediately returns the `Result` with its error
 *
 * @param result - The initial `Result` to chain
 * @param fn - A transformation function to apply
 *
 **/
export const chain = async <T, U, E extends Error>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E> | Promise<Result<U, E>>
): Promise<Result<U, E>> => {
    if (result.kind === 'error') {
        return result;
    }

    try {
        const nextResult = fn(result.value);
        if (nextResult instanceof Promise) {
            return await nextResult;
        }
        return nextResult;
    } catch (error: E) {
        return { kind: 'error', error: error };
    }
}
