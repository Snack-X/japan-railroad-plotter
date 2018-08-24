const $ = require('umbrellajs');

module.exports.searchItem = (primary, secondary) => {
  const $primary = $('<span>').addClass('name-primary').text(primary);
  const $secondary = $('<span>').addClass('name-secondary').text(secondary);
  const $searchItem = $('<li>').addClass('item-item search-item');
  $searchItem.append($primary).append($secondary);
  return $searchItem;
};

module.exports.plotItem = (primary, secondary, color = '#000000', width = 1) => {
  const $delete = $('<button>').addClass('action-delete').text('삭제');
  const $color = $('<button>').addClass('action-color').html(`색 (<var>${color}</var>)`);
  const $width = $('<button>').addClass('action-width').html(`두께 (<var>${width}</var>)`);
  const $controls = $('<div>').addClass('plot-controls');
  $controls.append($delete).append($color).append($width);
  
  const $primary = $('<span>').addClass('name-primary').text(primary);
  const $secondary = $('<span>').addClass('name-secondary').text(secondary);
  const $plotItem = $('<li>').addClass('item-item plot-item');
  $plotItem.append($primary).append($secondary).append($controls);
  return $plotItem;
};
