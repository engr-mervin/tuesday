import redis, { RedisClientType } from "redis";

let redisClient: RedisClientType;
const RETRY_ATTEMPTS = 5;

(async function () {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        reconnectStrategy: (attempts) => {
          //Retry 5 times.
          if (attempts > RETRY_ATTEMPTS) {
            return false;
          }
          const jitter = Math.floor(Math.random() * 200);
          const delay = Math.max(Math.pow(2, attempts) * 50, 2000);
          return jitter + delay;
        },
      },
    });

    redisClient.on("error", (err: Error) => {
      console.log("Redis Client failed connecting.", err);
    });

    redisClient.on("ready", () => {
      console.log("Redis Client is connected.");
    });

    await redisClient.connect();
    return true;
  } catch (err) {
    console.error("Failed connecting to redis.");
    return false;
  }
})();

export { redisClient };
