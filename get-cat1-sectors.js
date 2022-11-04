const { request, now } = require('./utils')
const cheerio = require('cheerio')

function HHMMToMoment(time) {
  let startOfDay = now().startOf('day')

  let hour = parseInt(time.slice(0, 2))
  let minute = parseInt(time.slice(2, 4))

  let moment = startOfDay.add(hour, 'hours').add(minute, 'minutes')
  return moment
}

async function getCAT1Sectors() {
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

    sectors.forEach(sector => cat1Sectors.push({ sector, start: startMoment.toDate(), end: endMoment.toDate() }))
  })

  let sorted = cat1Sectors.sort((a, b) => a.sector.localeCompare(b.sector))
  sorted.forEach(sector => sector.sector = sector.sector.replace(/^0/, ''))

  return sorted
}

async function getCAT1Status(sector) {
  let cat1Sectors = await getCAT1Sectors()
  let cat1Status = cat1Sectors.find(cat1Sector => cat1Sector.sector === sector)
  if (cat1Status) return { status: 'cat1', start: cat1Status.start, end: cat1Status.end }
  else return { status: 'clear' }
}

module.exports = {
  getCAT1Sectors,
  getCAT1Status
}
