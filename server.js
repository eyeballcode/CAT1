const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default
const helpers = require('@turf/helpers')
const cat1Sectors = require('./cat1-sectors')
const { getCAT1Status, getCAT1Sectors } = require('./get-cat1-sectors')

let app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.text())

app.set('x-powered-by', false)
app.set('strict routing', false)

app.use('/', express.static(path.join(__dirname, 'app-content'), {
  maxAge: 5000
}))

app.post('/get-sector', (req, res) => {
  let { lat, lng } = req.body
  let currentLocation = helpers.point([lng, lat])

  let currentSector = cat1Sectors.features.find(sector => booleanPointInPolygon(currentLocation, sector))

  res.end(currentSector ? currentSector.properties.sector : null)
})

app.post('/get-cat1-status', async (req, res) => {
  let { sector } = req.body

  res.json(await getCAT1Status(sector))
})

app.get('/get-cat1-sectors', async (req, res) => {
  res.json(await getCAT1Sectors())
})

module.exports = app