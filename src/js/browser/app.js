const LZString = require('lz-string');
const $ = require('umbrellajs');
window.$ = $;

const JRPlotter = require('../common/JRPlotter');
const { VERSION_RAILROAD, VERSION_STATION } = require('../common/dataRevision');

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

    $('.loading').removeClass('active');
  }

  async initJRPlotter() {
    const revisionDefault = { railroad: 0, station: 0 };
    const revisionLocal = JSON.parse(localStorage.getItem('revision'));
    const revision = revisionLocal || revisionDefault;

    const cachedRailroad = localStorage.getItem('railroad');
    const cachedStation = localStorage.getItem('station');

    let topoRailroad, topoStation;

    if (revision.railroad < VERSION_RAILROAD || !cachedRailroad) {
      log('railroad cache is outdated, downloading');
      const res = await fetch('dist/data/railroad.json?r=' + VERSION_RAILROAD);
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
  
    if (revision.station < VERSION_STATION || !cachedStation) {
      log('station cache is outdated, downloading');
      const res = await fetch('dist/data/station.json?r=' + VERSION_STATION);
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
    const revisionToSave = { railroad: VERSION_RAILROAD, station: VERSION_STATION };
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

    // $(".search-input input").addEventListener("input", onSearchInput);
    // $(".state-cancel").addEventListener("click", resetSearch);

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
}

//==============================================================================

const app = new App();
app.start()
  .then(() => { })
  .catch(err => { console.error(err); });
