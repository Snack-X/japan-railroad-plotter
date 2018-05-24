console.error("* Analyzing station over line");

const topojson = require("topojson");

console.error("* Loading and converting data");

const topoRailroads = require("./japan-railway-railroad.json");
const railroads = topojson.feature(topoRailroads, topoRailroads.objects.railroads);

const topoStations = require("./japan-railway-station.json");
const stations = topojson.feature(topoStations, topoStations.objects.stations);

console.error(`* Number of railroads: ${railroads.features.length}`);
console.error(`* Number of stations: ${stations.features.length}`);

console.error("* Groupping railroads and stations");
const groupped = {};
for(let r = 0 ; r < railroads.features.length ; r++) {
  const railroad = railroads.features[r];
  const { coordinates } = railroad.geometry;
  const { lineName, company } = railroad.properties;
  const key = `${lineName}\xff${company}`;

  if(!groupped[key]) groupped[key] = { idxs: [], lines: [], stations: [] };
  groupped[key].idxs.push(r);
  groupped[key].lines.push(coordinates);
}

for(let s = 0 ; s < stations.features.length ; s++) {
  const station = stations.features[s];
  const { coordinates } = station.geometry;
  const { lineName, company, stationName } = station.properties;
  const key = `${lineName}\xff${company}`;

  groupped[key].stations.push({
    idx: s,
    coordinates: coordinates,
    stationName: stationName,
    between: false,
    minimal: Infinity,
  });
}

console.error("* Comparing coordinates");
function compareCoordinate(a, b) {
  return Math.round(a[0] * 100000) === Math.round(b[0] * 100000) &&
    Math.round(a[1] * 100000) === Math.round(b[1] * 100000);
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

let errorCount = 0;
for(const key in groupped) {
  const [ lineName, company ] = key.split("\xff");

  const overLines = groupped[key].stations.filter(station => {
    const s_coord = station.coordinates;
    let result = true;

    for(const coordinates of groupped[key].lines) {
      for(let i = 0 ; i < coordinates.length ; i++) {
        const r_coord = coordinates[i];
        const rn_coord = coordinates[i + 1];

        if(compareCoordinate(s_coord, r_coord)) {
          result = false;
          break;
        }

        // Try to find a point between line
        if(!rn_coord) continue;

        const startToMiddle = distance(r_coord[1], r_coord[0], s_coord[1], s_coord[0]),
              middleToEnd = distance(s_coord[1], s_coord[0], rn_coord[1], rn_coord[0]),
              startToEnd = distance(r_coord[1], r_coord[0], rn_coord[1], rn_coord[0]);
        if(Math.round(startToMiddle + middleToEnd) === Math.round(startToEnd.toFixed(2)))
          station.between = true;
      }

      if(result === false) break;
    }

    return result;
  });

  if(overLines.length === 0) continue;

  const output = overLines.map(obj => `${obj.stationName} [${obj.idx}] <${obj.between}>`);
  console.log(`[${lineName} / ${company} / ${groupped[key].idxs.join(", ")}]`);
  console.log(`  ${output.join("\n  ")}`);
  console.log("");
  errorCount += overLines.length;
}

console.error(` * ${errorCount} stations found`);
