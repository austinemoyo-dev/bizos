module.exports = {
  apps: [
    {
      name: 'bizos-frontend',
      script: '/var/www/bizos/frontend/.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/var/log/bizos/frontend-error.log',
      out_file: '/var/log/bizos/frontend-out.log',
      time: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
      watch: false,
    },
  ],
};
