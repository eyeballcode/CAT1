let config = {}
try {
  config = require('./config.json')
} catch (e) {}

if (process.env.PORT) config.port = process.env.PORT

module.exports = config
