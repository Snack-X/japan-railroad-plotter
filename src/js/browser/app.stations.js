const $ = require('umbrellajs');
const States = require('./app.states');
const fragments = require('./fragments');

module.exports = function (App) {
  App.prototype.eventStationMouseEnter = function (e) {
    const $target = $(e.target);
    const hash = parseInt($target.data('hash'));

    const feature = this.JRP.getStationFeature(hash);

    this.setSearchStateStation($target.find('.name-primary').text());
    this.setPreviewStation(feature);
  };

  App.prototype.eventStationMouseLeave = function (e) {
    this.unsetPreviewStation();
  };

  App.prototype.eventStationClick = function (e) {
    const $target = $(e.target).closest('.search-item');
    const hash = parseInt($target.data('hash'));

    this.promotePreviewStationsToState();

    if (this.state === States.SELECTING_START) {
      this.state = States.SELECTING_END;
      this.stateStationStartHash = hash;
    }
    else if (this.state === States.SELECTING_END) {
      const type = this.stateRailroadType;
      const railroadHash = this.stateRailroadHash;
      const start = this.stateStationStartHash,
            end = hash;

      this.addPlotItem(type, railroadHash, start, end);
      this.resetSearchState();
    }
  };

  //

  App.prototype.displayStationResults = function (type, hash) {
    $('.search-result').empty();

    let result = [];

    if (type === 'line')
      result = this.JRP.getStationsFromLine(hash);
    else if (type === 'series')
      result = this.JRP.getStationsFromSeries(hash);

    result.forEach(station => {
      const $li = fragments.searchItem(station.name, station.id);
      $li.data('hash', station.hash);

      $('.search-result').append($li);
    });    

    $('.search-result .search-item')
      .on('mouseenter', this.eventStationMouseEnter.bind(this))
      .on('mouseleave', this.eventStationMouseLeave.bind(this))
      .on('click', this.eventStationClick.bind(this));
  };

  App.prototype.setPreviewStation = function (feature) {
    this.unsetPreviewStation();

    if (this.state === States.SELECTING_START) {
      this.previewStationStart = feature;

      const marker = this.newGoogleMarker(feature.geometry.coordinates, '始');
      this.previewMarkerStart = marker;
    }
    else if (this.state === States.SELECTING_END) {
      this.previewStationEnd = feature;

      const marker = this.newGoogleMarker(feature.geometry.coordinates, '終');
      this.previewMarkerEnd = marker;
    }
  };

  App.prototype.unsetPreviewStation = function () {
    if (this.state === States.SELECTING_START) {
      delete this.previewStationStart;

      if (this.previewMarkerStart)
        this.previewMarkerStart.setMap(null);
        
      delete this.previewMarkerStart;
    }
    else if (this.state === States.SELECTING_END) {
      delete this.previewStationEnd;

      if (this.previewMarkerEnd)
        this.previewMarkerEnd.setMap(null);

      delete this.previewMarkerEnd;
    }
  };

  App.prototype.unsetPreviewStations = function () {
    delete this.previewStationStart;
    delete this.previewStationEnd;

    if (this.previewMarkerStart)
      this.previewMarkerStart.setMap(null);
      
    if (this.previewMarkerEnd)
      this.previewMarkerEnd.setMap(null);

    delete this.previewMarkerStart;
    delete this.previewMarkerEnd;
  };

  App.prototype.promotePreviewStationsToState = function () {
    if (this.state === States.SELECTING_START) {
      this.stateStationStart = this.previewStationStart;
      this.stateMarkerStart = this.previewMarkerStart;

      delete this.previewStationStart;
      delete this.previewMarkerStart;
    }
    else if (this.state === States.SELECTING_END) {
      this.stateStationEnd = this.previewStationEnd;
      this.stateMarkerEnd = this.previewMarkerEnd;

      delete this.previewStationEnd;
      delete this.previewMarkerEnd;
    }
  };

  App.prototype.unsetStateStations = function () {
    delete this.stateStationStart;
    delete this.stateStationStartHash;
    delete this.stateStationEnd;
    delete this.stateStationEndHash;

    if (this.stateMarkerStart)
      this.stateMarkerStart.setMap(null);

    if (this.stateMarkerEnd)
      this.stateMarkerEnd.setMap(null);

    delete this.stateMarkerStart;
    delete this.stateMarkerEnd;
  };
};
