const $ = require('umbrellajs');

module.exports.searchItem = (primary, secondary) => {
  const $primary = $('<span>').addClass('name-primary').text(primary);
  const $secondary = $('<span>').addClass('name-secondary').text(secondary);
  const $searchItem = $('<li>').addClass('item-item search-item');
  $searchItem.append($primary).append($secondary);
  return $searchItem;
};
