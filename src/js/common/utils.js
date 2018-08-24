/**
 * Calculate length of a LineString in meters
 * @param {[number, number][]} lineString [Longitude, Latitude][]
 */
function geoLength(lineString) {
  if (lineString.length < 2) return 0;

  let result = 0;

  for (let i = 1 ; i < lineString.length ; i++)
    result += geoDistance(
      lineString[i - 1][1], lineString[i - 1][0],
      lineString[i    ][1], lineString[i    ][0]
    );

  return result;
}

/**
 * Calculate distance of two points in meters
 * @param {Number} lat1
 * @param {Number} lng1
 * @param {Number} lat2
 * @param {Number} lng2
 */
function geoDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula
  const R = 6371000; // in meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check two points are (almost) same
 * @param {Number} lat1
 * @param {Number} lng1
 * @param {Number} lat2
 * @param {Number} lng2
 */
function geoCompare(lat1, lng1, lat2, lng2) {
  return Math.round(lat1 * 100000) === Math.round(lat2 * 100000) &&
    Math.round(lng1 * 100000) === Math.round(lng2 * 100000);
}

/**
 * Calculate 32bit hash
 * @param {String} str
 */
function hash32(str) {
  let hash = 5381, i = str.length;
  while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
  return hash >>> 0;
}

module.exports = {
  geo: {
    length: geoLength,
    distance: geoDistance,
    compare: geoCompare,
  },
  hash32: hash32
};
