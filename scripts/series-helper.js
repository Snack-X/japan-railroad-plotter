const JRPlotter = require('../src/js/common/JRPlotter');
const topoRailroad = require('../dist/data/railroad.json');
const topoStation = require('../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

// console.log(app.plots.map(({ properties }) => `[ ${properties.lineHash}, ${properties.startHash}, ${properties.endHash} ], // ${properties.lineName} ${properties.startName} → ${properties.endName}`).join('\n'))

const routes = [
  [  228138242, 3225212912, 2299314070 ], // 東海道線 東京 → 熱海
  [ 2219478140,  141291071,  468870110 ], // 東海道線 熱海 → 大垣光
];

const targets = '東京駅  品川駅  横浜駅  小田原駅  沼津駅  静岡駅  浜松駅  豊橋駅  名古屋駅  岐阜駅  大垣駅'.split(/[\s駅\-・]+/);

const stations = [].concat(...routes.map(r => JRP.getStationsFromLine(r[0])));
for (const target of targets) {
  console.log(target);
  console.log(stations.filter(s => s.name === target).map(s => `${s.name} => ${s.hash}`).join('\n'));
  console.log('');
}
