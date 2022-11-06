const { request, now, parseTime } = require('./utils')
const cheerio = require('cheerio')
const allCAT1Sectors = require('./res/cat1-sectors')
const centreOfMass = require('@turf/center-of-mass').default
const nearestPointOnLine = require('@turf/nearest-point-on-line').default
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default

let sectorOrder = '1N,1S,L1,L2,L3,L4,02,3S,3N,04,05,06,07,8N,8S,09,10N,10S,11W,11E,12,13N,13S,14,15,16N,16S,17,18W,18E,19N,19S'.split(',')

function HHMMToMoment(time) {
  let startOfDay = now().startOf('day')

  let hour = parseInt(time.slice(0, 2))
  let minute = parseInt(time.slice(2, 4))

  let moment = startOfDay.add(hour, 'hours').add(minute, 'minutes')
  return moment
}

async function getCAT1SectorsFromTelegramCore() {
  let telegramData = JSON.parse(await request('https://t.me/s/ArmyCAT1', {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  }))

  let $ = cheerio.load(telegramData)
  let lastMessage = $('.tgme_widget_message_wrap:last-child .tgme_widget_message_text').text()

  let cat1Times = lastMessage.match(/\((\d{4})-(\d{4})\)([\w,]+)/g) || []
  let cat1Sectors = []

  cat1Times.forEach(time => {
    let [_, start, end, rawSectors] = time.match(/\((\d{4})-(\d{4})\)([\w,]+)/)
    let sectors = rawSectors.split(',')

    let startMoment = HHMMToMoment(start)
    let endMoment = HHMMToMoment(end)

    if (endMoment < startMoment) endMoment.add(1, 'day')

    sectors.forEach(sector => cat1Sectors.push({ sector: sector.replace(/^0/, ''), start: startMoment.toDate(), end: endMoment.toDate(), src: 'telegram' }))
  })

  return cat1Sectors
}

let telegramCache, telegramCacheTime

async function getCAT1SectorsFromTelegram() {
  if (telegramCache && (new Date() - telegramCacheTime) < 1000 * 60 * 2) return telegramCache

  telegramCache = await getCAT1SectorsFromTelegramCore()
  telegramCacheTime = new Date()
  return telegramCache
}

async function getCAT1SectorsFromForecastCore() {
  let forecastData = JSON.parse(await request('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast'))
  if (forecastData.items[0]) {
    let thunderAreas = forecastData.items[0].forecasts.filter(area => area.forecast.toLowerCase().includes('thunder'))
    let affectedCAT1Sectors = allCAT1Sectors.features.filter(sector => thunderAreas.some(area => sector.properties.forecastAreas.includes(area.area)))

    let start = new Date()
    let end = new Date(forecastData.items[0].valid_period.end)

    return affectedCAT1Sectors.map(sector => ({ sector: sector.properties.sector, start, end, src: 'forecast' }))
  }

  return []
}

let forecastCache, forecastCacheTime

async function getCAT1SectorsFromForecast() {
  if (forecastCache && (new Date() - forecastCacheTime) < 1000 * 60 * 5) return forecastCache

  forecastCache = await getCAT1SectorsFromForecastCore()
  forecastCacheTime = new Date()
  return forecastCache
}

async function getCAT1SectorsFromLightningCore() {
  let lightningData = JSON.parse(await request('http://www.weather.gov.sg/lightning/LightningStrikeServlet/', {
    method: 'POST',
    body: JSON.stringify({
      lightningType: "TL"
    })
  }))

  let minLatitude = 1.162043, maxLatitude = 1.482493
  let minLongitude = 103.581959, maxLongitude = 104.097408

  let timeNow = now()
  let recentRelevantLightning = lightningData.filter(lightning => {
    let { latitude, longitude } = lightning

    return (minLatitude < latitude && latitude < maxLatitude) && (minLongitude < longitude && longitude < maxLongitude)
  }).map(lightning => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [ lightning.longitude, lightning.latitude ]
    },
    properties: {
      time: parseTime(lightning.time, 'DD-MM-YYYY HH:mm:ss'),
      type: lightning.type
    }
  })).filter(lightning => timeNow.diff(lightning.properties.time, 'minutes') < 15).sort((a, b) => b.properties.time - a.properties.time)

  let groundLightning = recentRelevantLightning.filter(lightning => lightning.properties.type === 'G')
  let cloudLightning = recentRelevantLightning.filter(lightning => lightning.properties.type === 'C')
  let relevantLightning = [
    ...groundLightning,
    ...cloudLightning.slice(0, 100)
  ]

  if (relevantLightning.length === 0) return []

  let sectorOutlines = allCAT1Sectors.features.map(sector => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: sector.geometry.coordinates[0]
    },
    properties: {
      ...sector.properties,
      originalPolygon: sector
    }
  }))

  let sectorLightningCount = {}
  relevantLightning.forEach(lightning => {
    let nearbySectors = sectorOutlines.filter(sector => {
      if (booleanPointInPolygon(lightning, sector.properties.originalPolygon)) return true

      let snapped = nearestPointOnLine(sector.geometry, lightning.geometry, { units: 'kilometers' })

      return snapped.properties.dist < 1.5
    })

    nearbySectors.forEach(sector => {
      if (!sectorLightningCount[sector.properties.sector]) sectorLightningCount[sector.properties.sector] = 0
      sectorLightningCount[sector.properties.sector]++
    })
  })

  let start = now().startOf('minute').add(-5, 'min')
  let end = start.clone().add(20, 'min')
  return Object.keys(sectorLightningCount).filter(sector => sectorLightningCount[sector] >= 5).map(sector => ({
    sector, start, end, src: 'lightning'
  }))
}

let lightningCache, lightningCacheTime

async function getCAT1SectorsFromLightning() {
  if (lightningCache && (new Date() - lightningCacheTime) < 1000 * 60 * 5) return lightningCache

  lightningCache = await getCAT1SectorsFromLightningCore()
  lightningCacheTime = new Date()
  return lightningCache
}


async function getCAT1Sectors() {
  let telegramSectorData = []
  let forecastSectorData = []
  let lightningSectorData = []

  await Promise.all([
    (async function() {
      telegramSectorData = await getCAT1SectorsFromTelegram()
    })(),
    (async function() {
      forecastSectorData = await getCAT1SectorsFromForecast()
    })(),
    (async function() {
      lightningSectorData = await getCAT1SectorsFromLightning()
    })()
  ])

  let telegramSectors = telegramSectorData.map(sector => sector.sector)
  let missingForecastSectors = forecastSectorData.filter(sector => !telegramSectors.includes(sector.sector))

  let combinedSectors = telegramSectorData.concat(missingForecastSectors)

  let sorted = combinedSectors.sort((a, b) => sectorOrder.indexOf(a.sector) - sectorOrder.indexOf(b.sector))
  return sorted
}

async function getCAT1Status(sector) {
  let cat1Sectors = await getCAT1Sectors()
  let cat1Status = cat1Sectors.find(cat1Sector => cat1Sector.sector === sector)
  if (cat1Status) return { status: 'cat1', start: cat1Status.start, end: cat1Status.end, src: cat1Status.src }
  else return { status: 'clear' }
}

module.exports = {
  getCAT1Sectors,
  getCAT1Status
}

getCAT1Sectors().then(r=>console.log(r))
