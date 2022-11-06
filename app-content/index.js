let getLocBtn = document.getElementById('get-loc')
let getCAT1Btn = document.getElementById('get-cat1-status')
let sectorField = document.getElementById('sector')
let statusField = document.getElementById('cat1-status')

function getHHMM(time) {
  let hours = time.getHours()
  let minutes = time.getMinutes()
  let mainTime = ''

  if (hours < 10) mainTime += '0'

  mainTime += hours || 0
  mainTime += ':'

  if (minutes < 10) mainTime += '0'
  mainTime += minutes

  return mainTime
}

getLocBtn.addEventListener('click', async () => {
  navigator.geolocation.getCurrentPosition(async coords => {
    let { latitude, longitude } = coords.coords

    let response = await fetch('/get-sector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify({
        lat: latitude, lng: longitude
      })
    })

    let sector = await response.text()
    sectorField.value = sector
  })
})

getCAT1Btn.addEventListener('click', async () => {
  let sector = sectorField.value
  if (sector === 'null') return statusField.value = 'Unknown'

  let response = await fetch('/get-cat1-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify({
      sector
    })
  })

  let cat1Status = await response.json()

  if (cat1Status.status === 'cat1') {
    statusField.value = `${getHHMM(new Date(cat1Status.start))}-${getHHMM(new Date(cat1Status.end))}`
  } else {
    statusField.value = 'Clear'
  }
})
