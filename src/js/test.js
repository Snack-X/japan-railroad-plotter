const JRPlotter = require('./common/JRPlotter');
const findRoute = require('./common/findRoute');
const topoRailroad = require('../../dist/data/railroad.json');
const topoStation = require('../../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

function test2(railroadHash, startHash, endHash) {
  const railroads = JRP.getRailroadFeatures(railroadHash);

  const start = JRP.getStationFeature(startHash); // 岡谷
  const end = JRP.getStationFeature(endHash); // 塩尻

  const lineStrings = railroads.map(r => r.geometry.coordinates);
  const startCoord = start.geometry.coordinates;
  const endCoord = end.geometry.coordinates;

  findRoute(lineStrings, startCoord, endCoord);
}

function test3(railroadHash, startHash, middleHash, endHash) {
  const railroads = JRP.getRailroadFeatures(railroadHash);

  const start = JRP.getStationFeature(startHash);
  const middle = JRP.getStationFeature(middleHash);
  const end = JRP.getStationFeature(endHash);

  const lineStrings = railroads.map(r => r.geometry.coordinates);
  const startCoord = start.geometry.coordinates;
  const middleCoord = middle.geometry.coordinates;
  const endCoord = end.geometry.coordinates;

  findRoute(lineStrings, startCoord, middleCoord);
  findRoute(lineStrings, middleCoord, endCoord);
  findRoute(lineStrings, startCoord, endCoord);
}

// console.log(JRP.searchRailroads(''));
// console.log(JRP.getStationsFromLine());
// process.exit(0);

// 東日本旅客鉄道 - 中央線 / 下諏訪 - 辰野 - 塩尻
test3(3325678932, 2111621619, 193061657, 2144342683);

// 西日本旅客鉄道 - 北陸新幹線 / 糸魚川 - 富山
test2(1512023999, 979583867, 4178370045);
