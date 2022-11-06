const fs = require('fs')
const svy21 = require('./svy21')
const allForecastAreas = require('./nowcast-sectors')

const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default
const centreOfMass = require('@turf/center-of-mass').default
const nearestPoint = require('@turf/nearest-point').default
const helpers = require('@turf/helpers')

const svgData = fs.readFileSync('cat1-sectors-small.svg').toString()

let X_0 = 75.452, Y_0 = 67.749

const paths = svgData.match(/<path d="([^"]+)" [\w ="#-.]* name="(\w+)"\/>/g).map(path => {
  let [_, d, sector] = path.match(/<path d="([^"]+)" [\w ="#-.]* name="(\w+)"\/>/)
  let parts = d.match(/(\-?\de\-?\d|[mlhvz]|\-?\d+\.*\d*)/g)
  let x_0 = X_0, y_0 = Y_0

  let coordinates = []
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i]
    if (part === 'm' || part === 'l') {
      let dx = parts[i + 1], dy = parts[i + 2]
      x_0 += parseFloat(dx)
      y_0 += parseFloat(dy)
      i += 2

      coordinates.push([x_0, y_0])
    } else if (part === 'v') {
      let dy = parts[i + 1]
      y_0 += parseFloat(dy)
      i += 1

      coordinates.push([x_0, y_0])
    } else if (part === 'h') {
      let dx = parts[i + 1]
      x_0 += parseFloat(dx)
      i += 1

      coordinates.push([x_0, y_0])
    } else if (part === 'z') {
      break
    } else {
      let dx = part, dy = parts[i + 1]
      x_0 += parseFloat(dx)
      y_0 += parseFloat(dy)
      i += 1

      coordinates.push([x_0, y_0])
    }
  }

  let svy21Coordinates = coordinates.map(([x, y]) => [x, 66 - y])
  let latlngCoordinates = svy21Coordinates.map(([e, n]) => svy21.computeLatLon(e, n).reverse())

  return { sector, coords: latlngCoordinates }
})

let geoJsonData = {
  type: "FeatureCollection",
  features: paths.map(path => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [path.coords]
    },
    properties: {
      sector: path.sector
    }
  }))
}


geoJsonData.features.forEach(sector => {
  let forecastAreas = allForecastAreas.features.filter(area => booleanPointInPolygon(area, sector))
  if (!forecastAreas.length) {
    let centre = centreOfMass(sector)
    closestArea = nearestPoint(centre, allForecastAreas)

    forecastAreas = [closestArea]
  }

  sector.properties.forecastAreas = forecastAreas.map(area => area.properties.name)
})

fs.writeFileSync('cat1-sectors.json', JSON.stringify(geoJsonData))
