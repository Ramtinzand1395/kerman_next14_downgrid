module.exports = {
  apps: [
    {
      name: "kermanatari",
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "kermanatari-gallery-sync",
      cwd: __dirname,
      script: "./scripts/gallery-sync-worker.mjs",
      interpreter: "node",
      node_args: "--env-file=.env",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
