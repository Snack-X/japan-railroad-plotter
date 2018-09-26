const { format } = require('date-fns');

class KMLBuilder {
  constructor() {
    this.styles = {};
    this.placemarks = [];
  }

  /**
   * @param {string} name 
   * @param {string} description 
   * @param {[number, number][]} lineString [lat, lng][]
   * @param {string} color #rrggbb
   * @param {number} width 
   */
  addLineString(name, description, lineString, color, width) {
    const colorRgb = color.substr(1);
    const colorBgr = color.substr(5, 2) + color.substr(3, 2) + color.substr(1, 2);
    const styleId = `line-${colorRgb}-${width}`;

    this.styles[styleId] = (
      `<LineStyle>` +
        `<color>ff${colorBgr}</color>` +
        `<width>${width}</width>` +
      `</LineStyle>`
    );

    this.placemarks.push(
      `<Placemark>` +
        `<name>${name}</name>` +
        `<description><![CDATA[${description}]]></description>` +
        `<styleUrl>#${styleId}</styleUrl>`,
        `<LineString>` +
          `<tessellate>1</tessellate>` +
          `<coordinates>` +
            lineString
              .map(([ lat, lng ]) => `${lat.toFixed(5)},${lng.toFixed(5)},0`)
              .join("\n") +
          `</coordinates>` +
        `</LineString>` +
      `</Placemark>`
    );
  }

  /*addPoint(name, description, point) {

  }*/

  build() {
    const output = [];
    const now = format(new Date(), 'YYYY-MM-DD HH:mm:ss');

    output.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    output.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`);
    output.push(`<Document>`);
    output.push(`<name>Japan Railroad Plotter (${now})</name>`);

    for (const styleId in this.styles)
      output.push(`<Style id="${styleId}">${this.styles[styleId]}</Style>`);

    for (const placemark of this.placemarks)
      output.push(placemark);

    output.push(`</Document>`);
    output.push(`</kml>`);

    return output.join('\n');
  }
}

module.exports = KMLBuilder;
module.exports.MIME = 'application/vnd.google-earth.kml+xml; charset=utf-8';
