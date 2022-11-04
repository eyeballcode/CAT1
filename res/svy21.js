// WGS84 Datum

let a = 6378137
let f = 1 / 298.257223563

// SVY21 Projection
let oLat = 1.366666
let oLon = 103.833333

let oE = 28001.642
let oN = 38744.572

let k = 1

// Derived Parameters

let b = a * (1 - f)
let e2 = (2 * f) - (f * f)
let e4 = e2 * e2
let e6 = e4 * e2
let A0 = 1 - (e2 / 4) - (3 * e4 / 64) - (5 * e6 / 256)
let A2 = (3 / 8) * (e2 + (e4 / 4) + (15 * e6 / 128))
let A4 = (15 / 256) * (e4 + (3 * e6 / 4))
let A6 = 35 * e6 / 3072

function calcM(lat) {
  let latR = lat * Math.PI / 180
  return a * ((A0 * latR) - (A2 * Math.sin(2 * latR)) + (A4 * Math.sin(4 * latR)) - (A6 * Math.sin(6 * latR)))
}

function calcRho(sin2Lat) {
  let num = a * (1 - e2)
  let denom = Math.pow(1 - e2 * sin2Lat, 3 / 2)

  return num / denom
}

function calcV(sin2Lat) {
  let poly = 1 - e2 * sin2Lat
  return a / Math.sqrt(poly)
}

function computeSVY21(lat, lon) {
  let latR = lat * Math.PI / 180
  let sinLat = Math.sin(latR)
  let sin2Lat = sinLat * sinLat
  let cosLat = Math.cos(latR)
  let cos2Lat = cosLat * cosLat
  let cos3Lat = cos2Lat * cosLat
  let cos4Lat = cos3Lat * cosLat
  let cos5Lat = cos4Lat * cosLat
  let cos6Lat = cos5Lat * cosLat
  let cos7Lat = cos6Lat * cosLat

  let rho = calcRho(sin2Lat)
  let v = calcV(sin2Lat)
  let psi = v / rho
  let t = Math.tan(latR)
  let w = (lon - oLon) * Math.PI / 180

  let M = calcM(lat)
  let Mo = calcM(oLat)

  let w2 = w * w
  let w4 = w2 * w2
  let w6 = w4 * w2
  let w8 = w6 * w2

  let psi2 = psi * psi
  let psi3 = psi2 * psi
  let psi4 = psi3 * psi

  let t2 = t * t
  let t4 = t2 * t2
  let t6 = t4 * t2

  // Compute Northing
  let nTerm1 = w2 / 2 * v * sinLat * cosLat
  let nTerm2 = w4 / 24 * v * sinLat * cos3Lat * (4 * psi2 + psi - t2)
  let nTerm3 = w6 / 720 * v * sinLat * cos5Lat * ((8 * psi4) * (11 - 24 * t2) - (28 * psi3) * (1 - 6 * t2) + psi2 * (1 - 32 * t2) - psi * 2 * t2 + t4)
  let nTerm4 = w8 / 40320 * v * sinLat * cos7Lat * (1385 - 3111 * t2 + 543 * t4 - t6)
  let N = oN + k * (M - Mo + nTerm1 + nTerm2 + nTerm3 + nTerm4)

  // Compute Easting
  let eTerm1 = w2 / 6 * cos2Lat * (psi - t2)
  let eTerm2 = w4 / 120 * cos4Lat * ((4 * psi3) * (1 - 6 * t2) + psi2 * (1 + 8 * t2) - psi * 2 * t2 + t4)
  let eTerm3 = w6 / 5040 * cos6Lat * (61 - 479 * t2 + 179 * t4 - t6)
  let E = oE + k * v * w * cosLat * (1 + eTerm1 + eTerm2 + eTerm3)

  return [ E / 1000, N / 1000 ]
}

function computeLatLon(localE, localN) {
  let E = localE * 1000
  let N = localN * 1000

  let Nprime = N - oN
  let Mo = calcM(oLat)
  let Mprime = Mo + (Nprime / k)
  let n = (a - b) / (a + b)
  let n2 = n * n
  let n3 = n2 * n
  let n4 = n2 * n2
  let G = a * (1 - n) * (1 - n2) * (1 + (9 * n2 / 4) + (225 * n4 / 64)) * (Math.PI / 180)
  let sigma = (Mprime * Math.PI) / (180 * G)

  let latPrimeT1 = ((3 * n / 2) - (27 * n3 / 32)) * Math.sin(2 * sigma)
  let latPrimeT2 = ((21 * n2 / 16) - (55 * n4 / 32)) * Math.sin(4 * sigma)
  let latPrimeT3 = (151 * n3 / 96) * Math.sin(6 * sigma)
  let latPrimeT4 = (1097 * n4 / 512) * Math.sin(8 * sigma)
  let latPrime = sigma + latPrimeT1 + latPrimeT2 + latPrimeT3 + latPrimeT4

  let sinLatPrime = Math.sin(latPrime)
  let sin2LatPrime = sinLatPrime * sinLatPrime

  let rhoPrime = calcRho(sin2LatPrime)
  let vPrime = calcV(sin2LatPrime)
  let psiPrime = vPrime / rhoPrime
  let psiPrime2 = psiPrime * psiPrime
  let psiPrime3 = psiPrime2 * psiPrime
  let psiPrime4 = psiPrime3 * psiPrime
  let tPrime = Math.tan(latPrime)
  let tPrime2 = tPrime * tPrime
  let tPrime4 = tPrime2 * tPrime2
  let tPrime6 = tPrime4 * tPrime2
  let Eprime = E - oE
  let x = Eprime / (k * vPrime)
  let x2 = x * x
  let x3 = x2 * x
  let x5 = x3 * x2
  let x7 = x5 * x2

  // Compute Latitude
  let latFactor = tPrime / (k * rhoPrime)
  let latTerm1 = latFactor * ((Eprime * x) / 2)
  let latTerm2 = latFactor * ((Eprime * x3) / 24) * ((-4 * psiPrime2) + (9 * psiPrime) * (1 - tPrime2) + (12 * tPrime2))
  let latTerm3 = latFactor * ((Eprime * x5) / 720) * ((8 * psiPrime4) * (11 - 24 * tPrime2) - (12 * psiPrime3) * (21 - 71 * tPrime2) + (15 * psiPrime2) * (15 - 98 * tPrime2 + 15 * tPrime4) + (180 * psiPrime) * (5 * tPrime2 - 3 * tPrime4) + 360 * tPrime4)
  let latTerm4 = latFactor * ((Eprime * x7) / 40320) * (1385 - 3633 * tPrime2 + 4095 * tPrime4 + 1575 * tPrime6)
  let lat = latPrime - latTerm1 + latTerm2 - latTerm3 + latTerm4

  // Compute Longitude
  let secLatPrime = 1 / Math.cos(lat)
  let lonTerm1 = x * secLatPrime
  let lonTerm2 = ((x3 * secLatPrime) / 6) * (psiPrime + 2 * tPrime2)
  let lonTerm3 = ((x5 * secLatPrime) / 120) * ((-4 * psiPrime3) * (1 - 6 * tPrime2) + psiPrime2 * (9 - 68 * tPrime2) + 72 * psiPrime * tPrime2 + 24 * tPrime4)
  let lonTerm4 = ((x7 * secLatPrime) / 5040) * (61 + 662 * tPrime2 + 1320 * tPrime4 + 720 * tPrime6)
  let lon = (oLon * Math.PI / 180) + lonTerm1 - lonTerm2 + lonTerm3 - lonTerm4

  return [lat / (Math.PI / 180), lon / (Math.PI / 180)]
}

module.exports = {
  computeSVY21,
  computeLatLon
}
