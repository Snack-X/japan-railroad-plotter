function calculateLength(lineString) {
  if(lineString.length < 2) return 0;

  let result = 0;

  for(let i = 1 ; i < lineString.length ; i++)
    result += distance(
      lineString[i - 1][1], lineString[i - 1][0],
      lineString[i    ][1], lineString[i    ][0]
    );

  return result;
}

function distance(lat1, lng1, lat2, lng2) {
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

module.exports = { calculateLength, distance };
