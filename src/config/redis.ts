export default () => ({
  username: process.env.REDIS_USER || '',
  password: process.env.REDIS_PASSWORD || '',
  socket: {
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT || '0', 10),
  },
});
