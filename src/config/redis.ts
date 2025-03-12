import { env } from "../utils/env";

export default () => ({
  username: env.REDIS_USER || "",
  password: env.REDIS_PASSWORD || "",
  name: "feeder-api-client",
  socket: {
    host: env.REDIS_HOST || "",
    port: env.REDIS_PORT,
  },
});
