import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const createRedisClient = (connectionName) => new Redis(redisUrl, {
	connectionName,
	lazyConnect: true,
	maxRetriesPerRequest: null,
	connectTimeout: 10000,
	keepAlive: 1000,
	retryStrategy: (attempts) => {
		if (attempts > 10) {
			console.error(`Redis max retries exceeded for ${connectionName}`);
			return new Error("Max retries exceeded");
		}

		return Math.min(50 * 2 ** attempts, 2000);
	}
});

export const redisClient = createRedisClient("quizbuzz-general");
export const pubClient = createRedisClient("quizbuzz-socket-pub");
export const subClient = createRedisClient("quizbuzz-socket-sub");

const attachSetEx = (client) => {
	client.setEx = (key, ttlSeconds, value) => client.set(key, value, "EX", ttlSeconds);
	return client;
};

attachSetEx(redisClient);
attachSetEx(pubClient);
attachSetEx(subClient);

for (const client of [redisClient, pubClient, subClient]) {
	client.on("error", (err) => console.error("❌ Redis Client Error:", err.message));
	client.on("connect", () => console.log("✅ Redis Client Connecting..."));
	client.on("ready", () => console.log("🚀 Redis Client Ready"));
	client.on("reconnecting", () => console.log("🔄 Redis Client Reconnecting..."));
	client.on("end", () => console.log("🔌 Redis Client Connection Ended"));
}

try {
	await Promise.all([
		redisClient.connect(),
		pubClient.connect(),
		subClient.connect()
	]);
} catch (err) {
	console.error("❌ Redis Initial Connection Failed:", err.message);
}

export default redisClient;
