module.exports = {
  apps: [
    {
      name: "api-server",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "campaign-worker",
      script: "src/workers/campaignWorker.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        WORKER_CONCURRENCY: 2,
      },
    },
  ],
};
