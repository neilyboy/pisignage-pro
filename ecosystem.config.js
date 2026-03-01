module.exports = {
  apps: [
    {
      name: 'pisignage',
      cwd: __dirname,
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      max_memory_restart: '512M',
      restart_delay: 3000,
    },
  ],
};
