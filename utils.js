const fetch = require('node-fetch')
const moment = require('moment')
require('moment-timezone')
moment.tz.setDefault('Asia/Singapore')

module.exports = {
  now: () => moment.tz('Asia/Singapore'),
  parseTime: (time, format) => {
    if (format)
      return moment.tz(time, format, 'Asia/Singapore')
    else
      return moment.tz(time, 'Asia/Singapore')
  },
  request: async (url, options={}) => {
    let start = +new Date()

    let body
    let error

    let maxRetries = (options ? options.maxRetries : null) || 3

    let fullOptions = {
      timeout: 2000,
      compress: true,
      highWaterMark: 1024 * 1024,
      ...options
    }


    for (let i = 0; i < maxRetries; i++) {
      try {
        body = await fetch(url, fullOptions)
        break
      } catch (e) {
        error = e
      }
    }

    if (!body && error) {
      if (error.message && error.message.toLowerCase().includes('network timeout')) {
        let totalTime = fullOptions.timeout * maxRetries
        let logMessage = `${totalTime}ms ${url}`
        if (global.loggers) global.loggers.fetch.log(logMessage)
        else console.log(logMessage)

        error.timeoutDuration = totalTime
      }
      throw error
    }

    if (body && body.status.toString()[0] !== '2') {
      let err = new Error('Bad Request Status')
      err.status = body.status
      err.response = await (options.raw ? body.buffer() : body.text())
      throw err
    }

    let size = body.headers.get('content-length')
    if (options.stream) {
      let end = +new Date()
      let diff = end - start

      let logMessage = `${diff}ms ${url}`
      if (global.loggers) global.loggers.fetch.log(logMessage)
      else console.log(logMessage)

      return body.body
    }
    let returnData = await (options.raw ? body.buffer() : body.text())
    if (!size) size = returnData.length

    let end = +new Date()
    let diff = end - start

    let logMessage = `${diff}ms ${url} ${size}R`
    if (global.loggers) global.loggers.fetch.log(logMessage)
    else console.log(logMessage)

    return returnData
  }
}
