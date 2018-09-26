const JRPlotter = require('../src/js/common/JRPlotter');
const topoRailroad = require('../dist/data/railroad.json');
const topoStation = require('../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

// console.log(app.plots.map(({ properties }) => `[ ${properties.lineHash}, ${properties.startHash}, ${properties.endHash} ], // ${properties.lineName} ${properties.startName} → ${properties.endName}`).join('\n'))

const routes = [
];

const targets = ''.split(/[\s駅\-・（）]+/).filter(s => s !== '');

const stations = [].concat(...routes.map(r => JRP.getStationsFromLine(r[0])));
for (const target of targets) {
  console.log(target);
  console.log(stations.filter(s => s.name === target).map(s => `${s.name} => ${s.hash}`).join('\n'));
  console.log('');
}
