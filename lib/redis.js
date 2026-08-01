import Redis from "ioredis";

let redis;
if (!global._redis) {
  if (process.env.REDIS_URL) {
    global._redis = new Redis(process.env.REDIS_URL);
  } else {
    global._redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }
  global._redis.on("error", (err) => {
    console.error("Redis error:", err);
  });
}
redis = global._redis;
export default redis;
