const topojson = require('topojson-client');
const utils = require('./utils');

const TYPE_PRIORITY = { line: 1, series: 2, route: 3 };

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
      
    }

    const start = this.getStationFeature(startHash),
          end = this.getStationFeature(endHash);

    if (!start || !end) return null;
    
    // [ lng, lat ]
    const startCoord = start.geometry.coordinates,
          endCoord = end.geometry.coordinates;
  }
}

module.exports = JRPlotter;
