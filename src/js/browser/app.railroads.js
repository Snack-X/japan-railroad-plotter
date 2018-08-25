const $ = require('umbrellajs');
const States = require('./app.states');
const fragments = require('./fragments');

module.exports = function (App) {
  App.prototype.eventSearchInput = function (e) {
    const input = e.target.value.trim();
    
    if (input === '') {
      $('.search-result').empty();
      this.state = States.IDLE;
      return;
    }

    this.state = States.SELECTING_RAILROAD;
    this.displayRailroadResults(input);
  };

  App.prototype.eventRailroadMouseEnter = function (e) {
    const $target = $(e.target);
    const type = $target.data('type');

    let features;
    if (type === 'line') {
      const hash = parseInt($target.data('hash'));
      features = this.JRP.getRailroadFeatures(hash);
    }

    this.setPreviewRailroads(features);
  };

  App.prototype.eventRailroadMouseLeave = function (e) {
    this.unsetPreviewRailroads();
  };

  App.prototype.eventRailroadClick = function (e) {
    const $target = $(e.target).closest('.search-item');
    const type = $target.data('type');
    const hash = parseInt($target.data('hash'));

    this.promotePreviewRailroadsToState();
    this.state = States.SELECTING_START;
    this.stateRailroadType = type;
    this.stateRailroadHash = hash;

    this.enableSearchState($target.find('.name-primary').text());
    this.displayStationResults(type, hash);
  }

  App.prototype.displayRailroadResults = function (keyword) {
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
      .on('mouseenter', this.eventRailroadMouseEnter.bind(this))
      .on('mouseleave', this.eventRailroadMouseLeave.bind(this))
      .on('click', this.eventRailroadClick.bind(this));
  };

  App.prototype.setPreviewRailroads = function (features) {
    this.unsetPreviewRailroads();

    this.previewRailroads = features;
    this.previewPolylines = this.previewRailroads.map(f =>
      this.newGooglePolyline(f.geometry.coordinates, '#ff0000', 1)
    );
  };

  App.prototype.unsetPreviewRailroads = function () {
    delete this.previewRailroads;

    if (this.previewPolylines) {
      for (let i = 0, m = this.previewPolylines.length ; i < m ; i++) {
        this.previewPolylines[i].setMap(null);
        delete this.previewPolylines[i];
      }

      this.previewPolylines = [];
    }
  };

  App.prototype.promotePreviewRailroadsToState = function () {
    this.stateRailroads = this.previewRailroads;
    this.statePolylines = this.previewPolylines;

    this.previewRailroads = [];
    this.previewPolylines = [];
  };

  App.prototype.unsetStateRailroads = function () {
    delete this.stateRailroads;
    delete this.stateRailroadType;
    delete this.stateRailroadHash;

    if (this.statePolylines) {
      for (let i = 0, m = this.statePolylines.length ; i < m ; i++) {
        this.statePolylines[i].setMap(null);
        delete this.statePolylines[i];
      }

      this.statePolylines = [];
    }
  };
};
