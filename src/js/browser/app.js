const LZString = require('lz-string');
const $ = require('umbrellajs');
$.prototype.removeAttr = function (name) {
  this.each(node => node.removeAttribute(name));
};

const JRPlotter = require('../common/JRPlotter');
const { REV_RAILROAD, REV_STATION } = require('../common/dataRevision');

const States = require('./app.states');
const log = (...args) => {
  console.log(`[${new Date().toLocaleString()}]`, ...args);
};

//==============================================================================

class App {
  async start() {
    $('.loading').addClass('active');

    await this.initJRPlotter();
    this.initGoogleMaps();
    this.initEvents();

    this.state = States.IDLE;
    this.plots = [];

    $('.loading').removeClass('active');
  }

  // #region Initialization
  async initJRPlotter() {
    const revisionDefault = { railroad: 0, station: 0 };
    const revisionLocal = JSON.parse(localStorage.getItem('revision'));
    const revision = revisionLocal || revisionDefault;

    const cachedRailroad = localStorage.getItem('railroad');
    const cachedStation = localStorage.getItem('station');

    let topoRailroad, topoStation;

    if (revision.railroad < REV_RAILROAD || !cachedRailroad) {
      log('railroad cache is outdated, downloading');
      const res = await fetch('dist/data/railroad.json?r=' + REV_RAILROAD);
      const data = await res.text();
      topoRailroad = JSON.parse(data);
  
      log('compressing and saving railroad cache');
      const compressed = LZString.compressToUTF16(data);
      localStorage.setItem('railroad', compressed);
    }
    else {
      log('railroad cache is up to date, decompressing');
      const decompressed = LZString.decompressFromUTF16(cachedRailroad);
      topoRailroad = JSON.parse(decompressed);
    }
  
    if (revision.station < REV_STATION || !cachedStation) {
      log('station cache is outdated, downloading');
      const res = await fetch('dist/data/station.json?r=' + REV_STATION);
      const data = await res.text();
      topoStation = JSON.parse(data);
  
      log('compressing and saving station cache, compressing');
      const compressed = LZString.compressToUTF16(data);
      localStorage.setItem('station', compressed);
    }
    else {
      log('station cache is up to date, decompressing');
      const decompressed = LZString.decompressFromUTF16(cachedStation);
      topoStation = JSON.parse(decompressed);
    }

    log('JRP data loaded');
    const revisionToSave = { railroad: REV_RAILROAD, station: REV_STATION };
    localStorage.setItem('revision', JSON.stringify(revisionToSave));
  
    log('Initializing JRPlotter');
    this.JRP = new JRPlotter(topoRailroad, topoStation);
  
    log('everything has loaded, ready to go!');
  }

  initGoogleMaps() {
    this.map = new google.maps.Map($('#google-map').first(), {
      center: { lat: 37, lng: 137 },
      zoom: 5,
    });
  }

  initEvents() {
    // Hovers
    $('.button-hide-hovers').on('click', () => {
      $('body').addClass('hovers-hidden');
    });

    $('.button-show-hovers').on('click', () => {
      $('body').removeClass('hovers-hidden');
    });

    // Search & State
    $('.search-input input').on('input', this.eventSearchInput.bind(this));
    $('.state-cancel').on('click', this.resetSearchState.bind(this));

    // Modals
    $('.modal .modal-close').on('click', e => {
      $(e.target).closest('.modal').removeClass('active');
    });

    $('.button-show-modal-import-jrp').on('click', this.showModalImportJrp.bind(this));
    $('.modal-action-import-jrp').on('click', this.eventModalImportJrp.bind(this));

    $('.button-show-modal-export-jrp').on('click', this.showModalExportJrp.bind(this));

    $('.button-show-modal-export-polyline').on('click', this.showModalExportPolyline.bind(this));
    $('.modal-export-polyline input').on('input', this.showModalExportPolyline.bind(this));

    $('.button-show-modal-export-kml').on('click', this.showModalExportKml.bind(this));
  }
  // #endregion

  // #region Google Maps Helpers
  newGooglePolyline(lineString, color, width) {
    return new google.maps.Polyline({
      path: lineString.map(([ lng, lat ]) => ({ lat, lng })),
      strokeColor: color,
      strokeWeight: width,
      map: this.map,
    });
  }

  newGoogleMarker(point, text) {
    const [ lng, lat ] = point;  
    return new google.maps.Marker({
      position: { lat, lng },
      label: text,
      map: this.map,
    });
  }
  // #endregion

  // #region State
  resetSearchState() {
    $('.search-result').empty();

    $('.search-input input').removeAttr('disabled');
    $('.search-input input').first().value = '';

    $('.search-state').removeClass('active');
    $('.state-current').text('');
    $('.state-start').text('');
    $('.state-end').text('');

    this.state = States.IDLE;

    this.unsetPreviewRailroads();
    this.unsetStateRailroads();

    this.unsetPreviewStations();
    this.unsetStateStations();
  }

  enableSearchState(line) {
    $('.search-state').addClass('active');
    $('.state-current').text(line);

    $('.search-input input').attr('disabled', 'disabled');
  }

  setSearchStateStation(station) {
    if (this.state === States.SELECTING_START)
      $('.state-start').text(station);
    else if (this.state === States.SELECTING_END)
      $('.state-end').text(station);
  }
  // #endregion
}

require('./app.railroads')(App);
require('./app.stations')(App);
require('./app.plots')(App);
require('./app.modals')(App);

//==============================================================================

require('../../scss/app.scss');

const app = new App();
app.start()
  .then(() => { })
  .catch(err => { console.error(err); });

window.app = app;
