const LZString = require('lz-string');
const topojson = require('topojson-client');
const { hash32 } = require('../common/utils');

const findRoute = require('./findRoute');
const utils = require('./utils');

const TYPE_PRIORITY = { line: 1, series: 2, route: 3 };
const TYPE_ID = {
  line: 1, series: 2, route: 3,
  '1': 'line', '2': 'series', '3': 'routes',
};

const JRP2_BYTES_PER_OBJECT = 18;

class JRPlotter {
  constructor(topoRailroad, topoStation) {
    this.railroads = topojson.feature(topoRailroad, topoRailroad.objects.railroads);
    this.stations = topojson.feature(topoStation, topoStation.objects.stations);

    this.railroadHashes = new Map();
    this.stationHashes = new Map();

    this.mapLineStation = new Map();

    // Calculate hashes & fill helper maps
    for (let i = 0 ; i < this.railroads.features.length ; i++) {
      const railroad = this.railroads.features[i];
      const { company, lineName } = railroad.properties;
      const hash = utils.hash32(`${company}\xff${lineName}`);

      if (!this.railroadHashes.has(hash)) {
        this.railroadHashes.set(hash, {
          indexes: [],
          company: company,
          line: lineName,
        });
      }

      this.railroadHashes.get(hash).indexes.push(i);
    }

    for (let i = 0 ; i < this.stations.features.length ; i++) {
      const station = this.stations.features[i];
      const { company, lineName, groupId, stationName } = station.properties;
      const hash = utils.hash32(groupId);

      if (!this.stationHashes.has(hash)) {
        this.stationHashes.set(hash, {
          index: i,
          id: groupId,
          name: stationName,
          company: company,
          line: lineName,
        });
      }

      const lineHash = utils.hash32(`${company}\xff${lineName}`);
      if (!this.mapLineStation.has(lineHash))
        this.mapLineStation.set(lineHash, []);

      this.mapLineStation.get(lineHash).push({
        index: i,
        hash: hash,
        id: groupId,
        name: stationName,
      });
    }
  }

  getRailroadFeatures(hash) {
    hash = parseInt(hash);

    const info = this.railroadHashes.get(hash);
    if (!info) return false;

    const features = info.indexes.map(index => this.railroads.features[index]);
    return features;
  }

  searchRailroads(keyword) {
    const hits = [];

    // Find from features
    const featureHits = this.railroads.features.filter(f => (
      f.properties.lineName.includes(keyword) ||
      f.properties.company.includes(keyword)
    ));

    const featureHashes = {};
    featureHits.forEach(f => {
      const key = `${f.properties.company}\xff${f.properties.lineName}`;
      const hash = utils.hash32(key);

      if (!(hash in featureHashes)) {
        featureHashes[hash] = true;
        hits.push({
          type: 'line',
          hash: hash,
          company: f.properties.company,
          line: f.properties.lineName,
          features: this.getRailroadFeatures(hash),
        });
      }
    });

    // Find from aliases

    // Find from series

    hits.sort((a, b) => (
      (TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]) ||
      (a.company && b.company && a.company.localeCompare(b.company)) ||
      a.line.localeCompare(b.line)
    ));

    return hits;
  }

  getStationsFromLine(hash) {
    hash = parseInt(hash);

    const stations = this.mapLineStation.get(hash);
    if (!stations) return false;

    stations.sort((a, b) => a.id.localeCompare(b.id));
    return stations;
  }

  getStationFeature(hash) {
    hash = parseInt(hash);

    const info = this.stationHashes.get(hash);
    if (!info) return false;

    const feature = this.stations.features[info.index];
    return feature;
  }

  getRoute(type, railroadHash, startHash, endHash) {
    let lineStrings;

    if (type === 'line') {
      lineStrings = this.getRailroadFeatures(railroadHash).map(f => f.geometry.coordinates);
    }

    const start = this.getStationFeature(startHash),
          end = this.getStationFeature(endHash);

    if (!start || !end) return null;

    // [ lng, lat ]
    const startCoord = start.geometry.coordinates,
          endCoord = end.geometry.coordinates;

    // Calculate
    const route = findRoute(lineStrings, startCoord, endCoord);
    return route;
  }

  decodeJRP1(data) {
    const decompressed = LZString.decompressFromBase64(data);
    const parsed = JSON.parse(decompressed);

    const objects = parsed.map(object => ({
      type: 'line',
      lineHash: hash32(`${object.company}\xff${object.lineName}`),
      startHash: hash32(object.start),
      endHash: hash32(object.end),
      color: object.color,
      width: object.width,
    }));

    return objects;
  }

  decodeJRP2(data, decoder) {
    if (!data.startsWith('JRP2-')) return false;

    const decoded = decoder(data.slice(5));
    if (decoded.length % JRP2_BYTES_PER_OBJECT !== 0) return false;

    const buf = new ArrayBuffer(decoded.length);
    const view = new DataView(buf);
    for (let i = 0 ; i < decoded.length ; i++)
      view.setUint8(i, decoded.charCodeAt(i));

    const objects = [];
    for (let i = 0 ; i < decoded.length ; i += JRP2_BYTES_PER_OBJECT) {
      const object = {
        type: TYPE_ID[view.getUint8(i + 0)],
        lineHash: view.getUint32(i + 1),
        startHash: view.getUint32(i + 5),
        endHash: view.getUint32(i + 9),
        color: '#' + [
          view.getUint8(i + 13),
          view.getUint8(i + 14),
          view.getUint8(i + 15),
        ].map(v => v.toString(16).padStart(2, '0')).join(''),
        width: view.getUint16(i + 16),
      };
      objects.push(object);
    }

    return objects;
  }

  encodeJRP2(objects, encoder) {
    const buf = new ArrayBuffer(objects.length * JRP2_BYTES_PER_OBJECT);
    const view = new DataView(buf);

    for (let i = 0 ; i < objects.length ; i++) {
      const object = objects[i];
      const offset = i * JRP2_BYTES_PER_OBJECT;

      view.setUint8(offset + 0, TYPE_ID[object.type]);
      view.setUint32(offset + 1, object.lineHash);
      view.setUint32(offset + 5, object.startHash);
      view.setUint32(offset + 9, object.endHash);

      const regex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/;
      const match = object.color.match(regex);
      if (!match) return;
      view.setUint8(offset + 13, parseInt(match[1], 16));
      view.setUint8(offset + 14, parseInt(match[2], 16));
      view.setUint8(offset + 15, parseInt(match[3], 16));

      view.setUint16(offset + 16, object.width);
    }

    let binary = '';
    for (let i = 0 ; i < buf.byteLength ; i++)
      binary += String.fromCharCode(view.getUint8(i));

    const encoded = encoder(binary);
    return 'JRP2-' + encoded;
  }
}

module.exports = JRPlotter;
