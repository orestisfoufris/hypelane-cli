import {Result} from "../utils/result.ts";
import {FailedResponse, Message} from "../model/apiResponse.ts";

export type Delivered = {
    status: 'delivered'
}

export type Pending = {
    status: 'pending'
}

export type Failed = {
    status: 'failed'
}

export type MessageStatus = Delivered | Pending | Failed;

export type HyperlaneExplorerClient = {
    fetchMessageById: (messageId: string) => Promise<Result<[Message], Error>>;
    pollUntilDelivered: (messageId: string, maxTimeoutMs: number, maxIntervalMs: number) => Promise<Result<MessageStatus, Error>>;
};

export const createHyperlaneExplorerClient = (baseUrl: string): HyperlaneExplorerClient => {
    const createUrl = (action: string, messageId: string): string =>
        `${baseUrl}?${action}&id=${messageId}`;

    const createFailedResponse = (name: string, message: string, status: number): FailedResponse => ({
        name,
        message,
        status,
    });

    const fetchMessageById = async (messageId: string): Promise<Result<[Message], Error>> => {
        const action = 'module=message&action=get-messages';
        const url = createUrl(action, messageId);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });

            if (!response) {
                return {
                    kind: 'error',
                    error: createFailedResponse('MessageFetchError', `Explorer response was undefined. Try again later!`, 500)
                };
            }

            if (!response.ok) {
                return {
                    kind: 'error',
                    error: createFailedResponse('MessageFetchError', `HTTP failed. Status was: ${response.status}`, response.status)
                };
            }

            const {result} = await response.json();
            return {kind: 'ok', value: result};
        } catch (error) {
            return {
                kind: 'error',
                error: createFailedResponse('Error', `Failed to fetch message by id: ${messageId}. Error: ${error}`, 500)
            };
        }
    };

    const pollUntilDelivered = async (
        messageId: string,
        maxTimeoutMs: number,
        maxIntervalMs: number,
    ): Promise<Result<MessageStatus, Error>> => {
        try {
            const endTime = Date.now() + maxTimeoutMs;

            const exponentialBackoffPoll = async (interval: number): Promise<Result<MessageStatus, Error>> => {
                if (Date.now() > endTime) return {kind: "ok", value: {status: 'pending'}};

                const response = await fetchMessageById(messageId);
                if (response.kind === "error") return response;

                const status = response.value[0].status;

                if (status === 'delivered') return {kind: "ok", value: {status: 'delivered'}};
                if (status === 'failed') return {kind: "ok", value: {status: 'failed'}};

                await delay(Math.min(interval, maxIntervalMs));

                return exponentialBackoffPoll(interval * 2);
            };

            return exponentialBackoffPoll(1000);
        } catch (error) {
            return {kind:"error", error: error};
        }
    };

    function delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return {fetchMessageById, pollUntilDelivered};
};
