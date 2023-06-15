const http = require('http')
const app = require('./server')
const config = require('./config')

let server = http.createServer(app)

server.listen(config.port)
