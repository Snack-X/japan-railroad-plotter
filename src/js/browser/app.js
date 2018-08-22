require('../../scss/app.scss');

const LZString = require('lz-string');
const $ = require('umbrellajs');

$.prototype.removeAttr = function (name) {
  this.each(node => node.removeAttribute(name));
};

const JRPlotter = require('../common/JRPlotter');
const { REV_RAILROAD, REV_STATION } = require('../common/dataRevision');
const fragments = require('./fragments');

const log = (...args) => {
  console.log(`[${new Date().toLocaleString()}]`, ...args);
};

//==============================================================================

const STATE_IDLE = 0,
      STATE_SELECTING_RAILROAD = 1,
      STATE_SELECTING_START = 2,
      STATE_SELECTING_END = 3;

class App {
  async start() {
    $('.loading').addClass('active');

    await this.initJRPlotter();
    this.initGoogleMaps();
    this.initEvents();

    this.state = STATE_IDLE;

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

    $('.search-input input').on('input', this.onSearchInput.bind(this));
    $('.state-cancel').on('click', this.resetSearchState.bind(this));

    // Hover & Modals
    $('.button-show-modal-import-jrp').on('click', () => {
      $('.modal-import-jrp').addClass('active');
      $('.modal-import-jrp textarea').value = '';
      $('.modal-import-jrp textarea').focus();
    });

    $('.button-show-modal-export-jrp').on('click', () => {
      // const plots = JSON.stringify(JRP.plots.map(p => p.properties));
      // const output = LZString.compressToBase64(plots);

      $('.modal-export-jrp').addClass('active');
      $('.modal-export-jrp textarea').value = output;
      $('.modal-export-jrp textarea').select();
    });

    $('.button-show-modal-export-polyline').on('click', () =>  {
      // const data = [];
    
      // JRP.plots.forEach(plot => {
      //   data.push(
      //     `${plot.properties.company} - ${plot.properties.lineName} - ` +
      //     `${plot.properties.startName} -> ${plot.properties.endName}`
      //   );
      //   data.push(google.maps.geometry.encoding.encodePath(plot.object.getPath()));
      // });
    
      // const output = data.join("\n");
    
      $('.modal-export-polyline').addClass('active');
      $('.modal-export-polyline textarea').value = output;
      $('.modal-export-polyline textarea').select();
    });

    $('.button-show-modal-export-kml').on('click', () => {
    });

    // Modals
    $('.modal .modal-close').on('click', e => {
      $(e.target).closest('.modal').removeClass('active');
    });

    // $('.modal-action-import-jrp').addEventListener('click', importPlotsFromBase64);
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

    this.state = STATE_IDLE;
    delete this.stateRailroadType;
    delete this.stateRailroadHash;
    delete this.stateStartHash;
    delete this.stateEndHash;

    delete this.previewFeatures;
    delete this.previewFeature;

    this.previewPolylines = this.statePolylines;
    this.previewMarker = this.stateMarker;
    this.clearPreviewFeatures();
    this.clearPreviewFeature();

    delete this.statePolylines;
    delete this.stateMarker;
  }

  enableSearchState(line) {
    $('.search-state').addClass('active');
    $('.state-current').text(line);

    $('.search-input input').attr('disabled', 'disabled');
  }

  setSearchStateStation(station) {
    if (this.state === STATE_SELECTING_START)
      $('.state-start').text(station);
    else if (this.state === STATE_SELECTING_END)
      $('.state-end').text(station);
  }
  // #endregion

  // #region Search railroads
  onSearchInput(e) {
    const input = e.target.value.trim();
    if (input === '') {
      this.state = STATE_IDLE;
      return;
    }

    this.state = STATE_SELECTING_RAILROAD;
    this.displayRailroadResults(input);
  }

  onRailroadMouseEnter(e) {
    const $target = $(e.target);
    const type = $target.data('type');

    if (type === 'line') {
      const hash = parseInt($target.data('hash'));
      const features = this.JRP.getRailroadFeatures(hash);
      
      this.previewFeatures = features;
    }

    this.displayPreviewFeatures();
  }

  onRailroadMouseLeave(e) {
    this.clearPreviewFeatures();
  }

  onRailroadClick(e) {
    const $target = $(e.target).closest('.search-item');
    const type = $target.data('type');
    const hash = parseInt($target.data('hash'));

    this.state = STATE_SELECTING_START;

    this.stateRailroadType = type;
    this.stateRailroadHash = hash;
    this.statePolylines = this.previewPolylines;
    delete this.previewFeatures;
    delete this.previewPolylines;

    this.enableSearchState($target.find('.name-primary').text());
    this.displayStationResults(type, hash);
  }

  //

  displayRailroadResults(keyword) {
    $('.search-result').empty();

    const result = this.JRP.searchRailroads(keyword);

    result.forEach(railroad => {
      let $li;

      if (railroad.type === 'line') {
        $li = fragments.searchItem(railroad.line, railroad.company);
        $li.data('hash', railroad.hash);
      }

      $li.data('type', railroad.type);

      $('.search-result').append($li);
    });

    $('.search-result .search-item')
      .on('mouseenter', this.onRailroadMouseEnter.bind(this))
      .on('mouseleave', this.onRailroadMouseLeave.bind(this))
      .on('click', this.onRailroadClick.bind(this));
  }

  clearPreviewFeatures() {
    if (this.previewPolylines) {
      for (let i = 0 ; i < this.previewPolylines.length ; i++) {
        this.previewPolylines[i].setMap(null);
        delete this.previewPolylines[i];
      }

      this.previewPolylines = [];
    }
  }

  displayPreviewFeatures() {
    this.clearPreviewFeatures();

    const previewPolylines = this.previewFeatures.map(f =>
      new google.maps.Polyline({
        path: f.geometry.coordinates.map(([ lng, lat ]) => ({ lat, lng })),
        strokeColor: '#FF0000',
        strokeWeight: 1,
        map: this.map,
      })
    );

    this.previewPolylines = previewPolylines;
  }
  // #endregion

  // #region Select stations
  onStationMouseEnter(e) {
    const $target = $(e.target);
    const hash = parseInt($target.data('hash'));
    const feature = this.JRP.getStationFeature(hash);

    this.setSearchStateStation($target.find('.name-primary').text());

    this.previewFeature = feature;
    this.displayPreviewFeature();
  }

  onStationMouseLeave(e) {
    this.clearPreviewFeature();
  }

  onStationClick(e) {
    const $target = $(e.target).closest('.search-item');
    const hash = parseInt($target.data('hash'));

    if (this.state === STATE_SELECTING_START) {
      this.state = STATE_SELECTING_END;

      this.stateStartHash = hash;
      this.stateMarker = this.previewMarker;

      delete this.previewFeature;
      delete this.previewMarker;
    }
    else if (this.state === STATE_SELECTING_END) {
      // this.stateRailroadType
      // this.stateRailroadHash
      // this.stateStartHash ~ hash
    }
  }

  //

  displayStationResults(type, hash) {
    $('.search-result').empty();

    let result = [];

    if (type === 'line')
      result = this.JRP.getStationsFromLine(hash);

    result.forEach(station => {
      const $li = fragments.searchItem(station.name, station.id);
      $li.data('hash', station.hash);

      $('.search-result').append($li);
    });    

    $('.search-result .search-item')
      .on('mouseenter', this.onStationMouseEnter.bind(this))
      .on('mouseleave', this.onStationMouseLeave.bind(this))
      .on('click', this.onStationClick.bind(this));
  }

  clearPreviewFeature() {
    if (this.previewMarker) {
      this.previewMarker.setMap(null);
      delete this.previewMarker;
    }
  }

  displayPreviewFeature() {
    this.clearPreviewFeature();

    const [ lng, lat ] = this.previewFeature.geometry.coordinates;
    const previewMarker = new google.maps.Marker({
      position: { lat, lng },
      label: this.state === STATE_SELECTING_START ? '始' : '終',
      map: this.map,
    });

    this.previewMarker = previewMarker;
  }
  // #endregion
}

//==============================================================================

const app = new App();
app.start()
  .then(() => { })
  .catch(err => { console.error(err); });
