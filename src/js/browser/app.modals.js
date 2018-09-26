const $ = require('umbrellajs');
const { format } = require('date-fns');
const FileSaver = require('file-saver');

const KMLBuilder = require('../common/KMLBuilder');

module.exports = function (App) {
  App.prototype.showModalImportJrp = function () {
    $('.modal-import-jrp').addClass('active');

    const textarea = $('.modal-import-jrp textarea').first();
    textarea.value = '';
    textarea.focus();
  };

  App.prototype.eventModalImportJrp = function (e) {
    const input = $('.modal-import-jrp textarea').first().value.trim();
    if (input === '') return;

    let objects;
    try {
      if (input.startsWith('JRP2-'))
        objects = this.JRP.decodeJRP2(input, window.atob);
      else
        objects = this.JRP.decodeJRP1(input);

      if (!objects) throw new Error();
    } catch (e) {
      alert('올바르지 않은 데이터입니다.');
      return;
    }

    objects.forEach(object => {
      const { type, lineHash, startHash, endHash, color, width } = object;
      this.addPlotItem(type, lineHash, startHash, endHash, color, width);
    });

    // Close
    $(e.target).closest('.modal').removeClass('active');
  };

  App.prototype.showModalExportJrp = function () {
    const objects = this.plots.map(plot => ({
      type: plot.properties.type,
      lineHash: plot.properties.lineHash,
      startHash: plot.properties.startHash,
      endHash: plot.properties.endHash,
      color: plot.properties.color,
      width: plot.properties.width,
    }));
    const output = this.JRP.encodeJRP2(objects, window.btoa);

    $('.modal-export-jrp').addClass('active');

    const textarea = $('.modal-export-jrp textarea').first();
    textarea.value = output;
    textarea.select();
  };

  App.prototype.showModalExportPolyline = function () {
    const lines = [];

    this.plots.forEach(plot => {
      const p = plot.properties;
      const path = plot.polyline.getPath();
      lines.push(`${p.lineName} - ${p.startName} -> ${p.endName}`);
      lines.push(google.maps.geometry.encoding.encodePath(path));
    });

    let output = lines.join('\n');
  
    const doubleBackslash = $('.modal-export-polyline [name=double-backslash]');
    if (doubleBackslash.first().checked)
      output = output.replace(/\\/g, '\\\\');

    $('.modal-export-polyline').addClass('active');

    const textarea = $('.modal-export-polyline textarea').first();
    textarea.value = output;
    textarea.select();
  };

  // Technically not a modal, but will be a modal at some point
  App.prototype.showModalExportKml = function () {
    const builder = new KMLBuilder();

    this.plots.forEach(plot => {
      const p = plot.properties;

      const name = `${p.startName} → ${p.endName}`;
      const description = p.lineName;
      const lineString = plot.lineString;

      builder.addLineString(name, description, lineString, p.color, p.width);
    });
    
    const output = builder.build();
    const now = format(new Date(), 'YYYY.MM.DD.HH.mm.ss');

    const blob = new Blob([ output ], { type: KMLBuilder.MIME });
    const filename = `Japan Railroad Plotter (${now}).kml`;
    FileSaver.saveAs(blob, filename);
  };
};
