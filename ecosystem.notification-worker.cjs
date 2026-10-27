module.exports = {
  apps: [
    {
      name: "kerman-notification-worker",
      script: "workers/notification-worker.mjs",
      interpreter: "node",
      node_args: "--env-file=.env",
      instances: 2,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        NOTIFICATION_BATCH_SIZE: "25",
        NOTIFICATION_MAX_ATTEMPTS: "5",
        NOTIFICATION_LEASE_MS: "120000",
        NOTIFICATION_POLL_MS: "2000",
      },
    },
  ],
};
