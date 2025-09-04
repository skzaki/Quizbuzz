// stores/paymentStore.js
import redisClient from '../redis.js';

class PaymentStore {
    constructor() {
        this.keyPrefix = 'payment:';
        this.statsKeyPrefix = 'payment:stats:';
        this.listKeyPrefix = 'payment:list:';
        this.defaultTTL = 3600; // 1 hour
    }

    // Generate cache key for payments list
    generateListKey(filters, pagination, sorting) {
        const keyData = {
            filters: filters || {},
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
            sort: sorting || {}
        };
        return `${this.listKeyPrefix}${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
    }

    // Get single payment from cache
    async getPayment(paymentId) {
        try {
            const key = `${this.keyPrefix}${paymentId}`;
            const cached = await redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Redis get payment error:', error);
            return null;
        }
    }

    // Set single payment in cache
    async setPayment(paymentId, paymentData, ttl = this.defaultTTL) {
        try {
            const key = `${this.keyPrefix}${paymentId}`;
            await redisClient.setEx(key, ttl, JSON.stringify(paymentData));
        } catch (error) {
            console.error('Redis set payment error:', error);
        }
    }

    // Get payments list from cache
    async getPaymentsList(filters, pagination, sorting) {
        try {
            const key = this.generateListKey(filters, pagination, sorting);
            const cached = await redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Redis get payments list error:', error);
            return null;
        }
    }

    // Set payments list in cache
    async setPaymentsList(filters, pagination, sorting, data, ttl = 300) { // 5 minutes for lists
        try {
            const key = this.generateListKey(filters, pagination, sorting);
            await redisClient.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Redis set payments list error:', error);
        }
    }

    // Get payment statistics from cache
    async getPaymentStats(dateRange, groupBy) {
        try {
            const key = `${this.statsKeyPrefix}${dateRange.startDate}_${dateRange.endDate}_${groupBy}`;
            const cached = await redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Redis get payment stats error:', error);
            return null;
        }
    }

    // Set payment statistics in cache
    async setPaymentStats(dateRange, groupBy, data, ttl = 1800) { // 30 minutes
        try {
            const key = `${this.statsKeyPrefix}${dateRange.startDate}_${dateRange.endDate}_${groupBy}`;
            await redisClient.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.error('Redis set payment stats error:', error);
        }
    }

    // Delete payment from cache
    async deletePayment(paymentId) {
        try {
            const key = `${this.keyPrefix}${paymentId}`;
            await redisClient.del(key);
        } catch (error) {
            console.error('Redis delete payment error:', error);
        }
    }

    // Clear all payment list caches (call when payments are modified)
    async clearListCaches() {
        try {
            const keys = await redisClient.keys(`${this.listKeyPrefix}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error('Redis clear list caches error:', error);
        }
    }

    // Clear stats caches
    async clearStatsCaches() {
        try {
            const keys = await redisClient.keys(`${this.statsKeyPrefix}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error('Redis clear stats caches error:', error);
        }
    }
}

export const paymentStore = new PaymentStore();