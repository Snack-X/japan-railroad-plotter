const JRPlotter = require('../src/js/common/JRPlotter');
const topoRailroad = require('../dist/data/railroad.json');
const topoStation = require('../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

// console.log(app.plots.map(({ properties }) => `[ ${properties.lineHash}, ${properties.startHash}, ${properties.endHash} ], // ${properties.lineName} ${properties.startName} → ${properties.endName}`).join('\n'))

const routes = [
  [ 2607508661,  183437565, 1358614613 ], // 鹿児島線 熊本 → 八代
  [ 1657494880, 2787597531,  246708082 ], // 肥薩線 八代 → 吉松
];

const targets = '熊本駅 - 新八代駅 - 八代駅 - 坂本駅 - 一勝地駅 - 渡駅 - 人吉駅 - 大畑駅 - 矢岳駅 - 真幸駅 - 吉松駅'.split(/[\s駅\-・→（）]+/).filter(s => s !== '');

const stations = [].concat(...routes.map(r => JRP.getStationsFromLine(r[0])));
for (const target of targets) {
  console.log(target);
  console.log(stations.filter(s => s.name === target).map(s => `${s.name} => ${s.hash}`).join('\n'));
  console.log('');
}
