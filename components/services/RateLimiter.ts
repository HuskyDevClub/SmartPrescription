/**
 * RateLimiter class for React Native
 * Limits a function to a maximum number of calls within a specified time window
 */
import {UserDataService} from "@/components/services/UserDataService";

export class RateLimiter {
    private readonly storageKey: string;
    private readonly maxCalls: number;
    private readonly timeWindowMs: number;

    /**
     * Create a new rate limiter
     * @param {string} key - Unique identifier for this rate limiter
     * @param {number} maxCalls - Maximum number of calls allowed in the time window
     * @param {number} timeWindowMs - Time window in milliseconds
     */
    constructor(key: string, maxCalls: number = 60, timeWindowMs: number = 3600000) { // Default: 60 calls per hour
        this.storageKey = `rate_limiter_${key}`;
        this.maxCalls = maxCalls;
        this.timeWindowMs = timeWindowMs;
    }

    /**
     * Wraps a function with rate limiting
     * @param {Function} fn - The function to be rate limited
     * @returns {Function} - Rate limited function
     */
    limit<T extends (...args: any[]) => PromiseLike<any>>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
        return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
            const canExecute = await this.canExecute();

            if (canExecute) {
                await this.recordExecution();
                return await fn(...args) as Awaited<ReturnType<T>>;
            } else {
                throw new Error(`Rate limit exceeded. Maximum ${this.maxCalls} calls per ${this.timeWindowMs / 60000} minutes. Please try again in ${Math.ceil(await this.getTimeUntilReset() / 60000)} minutes.`);
            }
        };
    }

    /**
     * Checks if the function can be executed without exceeding rate limits
     * @returns {Promise<boolean>}
     */
    async canExecute(): Promise<boolean> {
        try {
            const records = await this.getExecutionRecords();
            const now = Date.now();

            // Filter out records outside the current time window
            const validRecords = records.filter(timestamp =>
                now - timestamp < this.timeWindowMs
            );

            return validRecords.length < this.maxCalls;
        } catch (error) {
            console.error('Rate limiter error:', error);
            return false;
        }
    }

    /**
     * Records a new execution timestamp
     * @returns {Promise<void>}
     */
    async recordExecution(): Promise<void> {
        try {
            const records = await this.getExecutionRecords();
            const now = Date.now();

            // Add current timestamp and remove old records
            const updatedRecords = [
                ...records.filter(timestamp => now - timestamp < this.timeWindowMs),
                now
            ];

            await UserDataService.set(this.storageKey, JSON.stringify(updatedRecords));
        } catch (error) {
            console.error('Failed to record execution:', error);
        }
    }

    /**
     * Gets stored execution records
     * @returns {Promise<number[]>} - Array of execution timestamps
     */
    async getExecutionRecords(): Promise<number[]> {
        try {
            const records = await UserDataService.get(this.storageKey);
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('Failed to get execution records:', error);
            return [];
        }
    }

    /**
     * Gets the time until the rate limit resets (oldest record expires)
     * @returns {Promise<number>} Time in milliseconds until reset
     */
    async getTimeUntilReset(): Promise<number> {
        const records = await this.getExecutionRecords();
        const now = Date.now();

        if (records.length === 0) return 0;

        // Sort records to find the oldest one
        records.sort((a, b) => a - b);

        // Calculate when the oldest record will expire
        const oldestRecord = records[0];
        const expiryTime = oldestRecord + this.timeWindowMs;

        return Math.max(0, expiryTime - now);
    }

    /**
     * Gets the number of remaining calls allowed in the current time window
     * @returns {Promise<number>}
     */
    async getRemainingCalls(): Promise<number> {
        const records = await this.getExecutionRecords();
        const now = Date.now();

        const validRecords = records.filter(timestamp =>
            now - timestamp < this.timeWindowMs
        );

        return Math.max(0, this.maxCalls - validRecords.length);
    }

    /**
     * Resets the rate limiter by clearing all stored execution records
     * @returns {Promise<void>}
     */
    async reset(): Promise<void> {
        try {
            await UserDataService.set(this.storageKey, JSON.stringify([]));
        } catch (error) {
            console.error('Failed to reset rate limiter:', error);
        }
    }
}
