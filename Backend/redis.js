import { createClient } from "redis";

 const redisClient = createClient({ 
    url: process.env.REDIS_URL,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
    // Connection pool settings
    family: 5,
    keepAlive: true,
    // Retry strategy
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
    },
    // Reconnect on error
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
    }
});

redisClient.on("error", (err) => console.error("❌ Redis Client Error", err));
await redisClient.connect();

export default redisClient;