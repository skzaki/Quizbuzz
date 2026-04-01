import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error("Redis max retries exceeded");
                return new Error("Max retries exceeded");
            }
            return Math.min(retries * 50, 2000);
        },
        connectTimeout: 10000,
        keepAlive: 1000
    },
    pingInterval: 1000,
});

redisClient.on("error", (err) => console.error("❌ Redis Client Error:", err.message));
redisClient.on("connect", () => console.log("✅ Redis Client Connecting..."));
redisClient.on("ready", () => console.log("🚀 Redis Client Ready"));
redisClient.on("reconnecting", () => console.log("🔄 Redis Client Reconnecting..."));
redisClient.on("end", () => console.log("🔌 Redis Client Connection Ended"));

try {
    await redisClient.connect();
} catch (err) {
    console.error("❌ Redis Initial Connection Failed:", err.message);
}

export default redisClient;