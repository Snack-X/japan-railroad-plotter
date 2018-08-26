const JRPlotter = require('../src/js/common/JRPlotter');
const topoRailroad = require('../dist/data/railroad.json');
const topoStation = require('../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

// console.log(app.plots.map(({ properties }) => `[ ${properties.lineHash}, ${properties.startHash}, ${properties.endHash} ], // ${properties.lineName} ${properties.startName} → ${properties.endName}`).join('\n'))

const routes = [
  [ 3282245463, 1236888564, 1953892116 ], // 南海本線 難波 → 泉佐野
  [ 2250351118, 3511915283, 1875608977 ], // 空港線 泉佐野 → 関西空港
];

const targets = '難波駅 - 新今宮駅 - 天下茶屋駅 - 堺駅 - 岸和田駅 - 泉佐野駅 - りんくうタウン駅 - 関西空港駅'.split(/[\s駅\-]+/);

const stations = [].concat(...routes.map(r => JRP.getStationsFromLine(r[0])));
for (const target of targets) {
  console.log(target);
  console.log(stations.filter(s => s.name === target).map(s => `${s.name} => ${s.hash}`).join('\n'));
  console.log('');
}
