const $ = require('umbrellajs');
const States = require('./app.states');
const fragments = require('./fragments');

module.exports = function (App) {
  App.prototype.eventPlotDelete = function (e) {
    const $target = $(e.target).closest('.plot-item');
    const index = parseInt($target.data('index'), 10);
    this.deletePlotItem(index);
  };

  App.prototype.eventPlotChangeColor = function (e) {
    const $target = $(e.target).closest('.plot-item');
    const index = parseInt($target.data('index'), 10);

    const newColor = prompt('새로운 색상 (#rrggbb 형태)').trim();
    if (!newColor) return;

    if (/^#[0-9a-f]{6}$/i.test(newColor))
      this.changePlotColor(index, newColor);
    else if (/^[0-9a-f]{6}$/i.test(newColor))
      this.changePlotColor(index, '#' + newColor);
  };

  App.prototype.eventPlotChangeWidth = function (e) {
    const $target = $(e.target).closest('.plot-item');
    const index = parseInt($target.data('index'), 10);

    const newWidth = parseFloat(prompt('새로운 너비 (숫자)').trim());
    if (!newWidth) return;
    
    if (!Number.isNaN(newWidth))
      this.changePlotWidth(index, newWidth);
  };

  App.prototype.getPlotItem = function (index) {
    return $(`.plot-list .plot-item[data-index='${index}']`);
  };

  App.prototype.addPlotItem = function (
                                type, railroadHash, startHash, endHash,
                                color = '#000000', width = 1
                              ) {
    const route = this.JRP.getRoute(type, railroadHash, startHash, endHash);

    if (route === false) {
      alert('Unable to find a route');
      return;
    }

    const railroadFeatures = this.JRP.getRailroadFeatures(railroadHash);
    const lineName = railroadFeatures[0].properties.lineName;
    const startName = this.JRP.getStationFeature(startHash).properties.stationName;
    const endName = this.JRP.getStationFeature(endHash).properties.stationName;

    const plotIndex = this.plots.length;
    const plot = {
      lineString: route,
      properties: {
        type: type,
        lineName: lineName,
        lineHash: railroadHash,
        startName: startName,
        startHash: startHash,
        endName: endName,
        endHash: endHash,
        color: color,
        width: width,
      },
      polyline: new google.maps.Polyline({
        path: route.map(([ lng, lat ]) => ({ lat, lng })),
        strokeColor: color,
        strokeWeight: width,
        map: this.map,
      }),
    };

    this.plots.push(plot);

    const $plotItem = fragments.plotItem(
      lineName, `${startName} → ${endName}`,
      color, width
    );

    $plotItem.data('index', plotIndex);
    $plotItem.find('.action-delete').on('click', this.eventPlotDelete.bind(this));
    $plotItem.find('.action-color').on('click', this.eventPlotChangeColor.bind(this));
    $plotItem.find('.action-width').on('click', this.eventPlotChangeWidth.bind(this));

    $('.plot-list').append($plotItem);

    return plotIndex;
  }

  App.prototype.deletePlotItem = function (index) {
    this.getPlotItem(index).remove();
    for (let i = index + 1 ; i < this.plots.length ; i++)
      this.getPlotItem(i).data('index', i - 1);

    this.plots[index].polyline.setMap(null);
    this.plots.splice(index, 1);
  };

  App.prototype.changePlotColor = function (index, newColor) {
    this.plots[index].polyline.set('strokeColor', newColor);
    this.plots[index].properties.color = newColor;
    this.getPlotItem(index).find('.action-color var').text(newColor);
  };

  App.prototype.changePlotWidth = function (index, newWidth) {
    this.plots[index].polyline.set('strokeWeight', newWidth);
    this.plots[index].properties.width = newWidth;
    this.getPlotItem(index).find('.action-width var').text(newWidth);
  };
};
