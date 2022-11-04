let config = {}
try {
  config = require('./config.json')
} catch (e) {}

if (process.env.PORT) config.httpPort = process.env.PORT

module.exports = config
