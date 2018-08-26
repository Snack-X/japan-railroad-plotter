const JRPlotter = require('./src/common/JRPlotter');
const findRoute = require('./src/common/findRoute');
const topoRailroad = require('../dist/data/railroad.json');
const topoStation = require('../dist/data/station.json');
const JRP = new JRPlotter(topoRailroad, topoStation);

function test2(railroadHash, startHash, endHash) {
  const railroads = JRP.getRailroadFeatures(railroadHash);

  const start = JRP.getStationFeature(startHash);
  const end = JRP.getStationFeature(endHash);

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

// 東京都 - 12号線大江戸線 / 都庁前 - 東新宿
test2(1820178030, 1561681981, 512764409);

const encoder = string => Buffer.from(string, 'binary').toString('base64');
const decoder = string => Buffer.from(string, 'base64').toString('binary');

const sampleJRP1 = 'NobwRANglgdgpgOQIYFs5gFxkODGh+7UKnmgcLqBbvmADRgDGA9igA5IwCemYgunKB7uoKOmgRdqAiSYGUEwBD/gc9NAv2p9AkP/kwAZwAuSAE7zWAUQBCABgDMAfQBMRrQA5dANhkLl85GlZEZcGABN12/UYOmtWgIxOrnboWID+eYAKioBvOoC0coB0mjI0ENRKrADEcAAs/n4GMgDuUC7yABaYfgC+ZODQ8MGsnIANpoCeeqQUNPSMLFicvIKiEtIU1iruuoYGfv7+uUOKKnVhUXGBbliaY0aTk/4rC2CAWsqAWJoJ1EkpWOlZfjn5hSWYBpXVsIioIWCAjjqAvmnNrVS0DGYrEA/pGAU9NADTmvWE4ikVjmqjWHj0fgAnFt/Ci4TY9kcVqN9Kj0TsKM4XHsGoByTUAVGknM5pLQZADsOgARm4KAUiqUMI8qpAXntAI7mgHdbAS/E4dIFYEVQ/qw2Y2fHIxnovyMrHzN6sSk0kmuJVqokBPVkrXSwA1crTkmkAGY28zmHQ6W5ch5Pfm1M1gQWAdGVxW0AZ1WIKIbKYYM5PCDRMpsTI9ivYLLSbo+iDM6TeTAErpgDuLK3nMCpPwmEtMl33HnumqvexYH2i/3/SVdMD1gRhgYahFgdYEnIZbwMrvZvMpxFja4GAe+Y1gUnkwC/ioAKTJ9gHTTfNpAyUFkZHSzzkV3nPT21sDLv7tQEttsd+XxkbjvsTMxaSwKzWnhrLtd4x/InLFroWi7F6gDuqYA4HKABcJG4XFuO57uW3IVHy1Z7IAJdqALRhF6BlKraireEbDN2vb/l4M7DmBUG/j2SKTsYOhvnOQReoAPTaAHMMgD3XjBhZwbu+53EhVYCl6gDCyoAztbYc2rA3vw0Kdu+xG0TkU7+IxRF7OxXFjjRE7KVkWgzExpqnoAvm6AM/u3GpLxCEcgJZRCSe7znhKV7SfhslyoRUZ/pOgGMhkFGnoAtOaADJ61Ekb5JiTIx85eoAt6aALu6lnWfxroYMhx41u8gDp2oA7DGSa5dbuX04ZdgaOQ6Iy5EKXsiXhUp6ZVeYhmxaegBYXoAoYrJdufGIfZAC6QA';

const decoded = JRP.decodeJRP1(sampleJRP1);
console.log(decoded);

const encoded = JRP.encodeJRP2(decoded, encoder);
console.log(encoded);

const decoded2 = JRP.decodeJRP2(encoded, decoder);
console.log(decoded2);
