const topojson = require("topojson");
const LZString = require("lz-string");

const { VERSION_RAILROAD, VERSION_STATION } = require("./dataRevision");

require("./domUtilities");
const findRoute = require("./findRoute");

window.JRP = {
  state: {},
  plots: [],

  tempPolylines: {},
  tempMarkers: {},
};

//==============================================================================

function JRP_ResetState() {
  JRP_UnsetStateLine();
  JRP_UnsetStateStartStation();
  JRP_UnsetStateEndStation();
  JRP_ResetTemporary();
}

function JRP_ResetTemporary() {
  for(const id in JRP.tempPolylines) {
    JRP.tempPolylines[id].forEach(p => p.setMap(null));
    delete JRP.tempPolylines[id];
  }

  for(const id in JRP.tempMarkers) {
    JRP.tempMarkers[id].setMap(null);
    delete JRP.tempMarkers[id];
  }
}

function searchLine(keyword) {
  const filtered = JRP.railroads.features.filter(f => (
    f.properties.lineName.includes(keyword) ||
    f.properties.company.includes(keyword)
  ));

  const result = [];
  const keys = {};
  filtered.forEach(f => {
    const key = f.properties.lineName + "\xff" + f.properties.company;

    if(!(key in keys)) {
      keys[key] = true;
      result.push([ f.properties.lineName, f.properties.company ]);
    }
  });

  return result;
}

function getRailroadFeatures(lineName, company) {
  return JRP.railroads.features.filter(f => (
    f.properties.lineName === lineName && f.properties.company === company
  ));
}

function JRP_SetStateLine(lineName, company) {
  const key = lineName + "\xff" + company;

  JRP.state.lineName = lineName;
  JRP.state.company = company;

  JRP.state.lineFeatures = getRailroadFeatures(lineName, company);
  JRP.state.lineObjects = JRP.tempPolylines[key];

  delete JRP.tempPolylines[key];
}

function JRP_UnsetStateLine() {
  delete JRP.state.lineName;
  delete JRP.state.company;

  if(JRP.state.lineObjects.length) {
    JRP.state.lineObjects.forEach(polyline => polyline.setMap(null));
    delete JRP.state.lineObjects;
  }
  delete JRP.state.lineFeatures;
}

function searchStations(lineName, company) {
  const filtered = JRP.stations.features.filter(
    f => (
      f.properties.lineName === lineName &&
      f.properties.company === company
    )
  );

  filtered.sort((a, b) => a.properties.groupId.localeCompare(b.properties.groupId));

  return filtered.map(f => [ f.properties.stationName, f.properties.groupId ]);
}

function getStationFeature(groupId) {
  return JRP.stations.features.filter(
    f => f.properties.groupId === groupId
  )[0];
}

function JRP_StateIsStart() { return !JRP.state.startStation; }

function JRP_SetStateStartStation(groupId) {
  JRP.state.startStation = groupId;

  JRP.state.startFeature = getStationFeature(groupId);
  JRP.state.startObject = JRP.tempMarkers[groupId];

  delete JRP.tempMarkers[groupId];
}

function JRP_UnsetStateStartStation() {
  delete JRP.state.startStation;
  delete JRP.state.startFeature;

  if(JRP.state.startObject) {
    JRP.state.startObject.setMap(null);
    delete JRP.state.startObject;
  }
}

function JRP_SetStateEndStation(groupId) {
  JRP.state.endStation = groupId;

  JRP.state.endFeature = getStationFeature(groupId);
  JRP.state.endObject = JRP.tempMarkers[groupId];

  delete JRP.tempMarkers[groupId];
}

function JRP_UnsetStateEndStation() {
  delete JRP.state.endStation;
  delete JRP.state.endFeature;

  if(JRP.state.endObject) {
    JRP.state.endObject.setMap(null);
    delete JRP.state.endObject;
  }
}

//==============================================================================

async function loadData() {
  const revisionDefault = { railroad: 0, station: 0 };
  const revisionLocal = JSON.parse(localStorage.getItem("revision")) || revisionDefault;

  const cachedRailroad = localStorage.getItem("railroad");
  const cachedStation = localStorage.getItem("station");

  if(revisionLocal.railroad < VERSION_RAILROAD || !cachedRailroad) {
    log("railroad cache is outdated, downloading");
    const dataRailroad = await (await fetch("data/japan-railway-railroad.json?r=" + VERSION_RAILROAD )).text();
    JRP.railroad = JSON.parse(dataRailroad);

    log("saving railroad cache, compressing");
    const compressed = LZString.compressToUTF16(dataRailroad);
    localStorage.setItem("railroad", compressed);
  }
  else {
    log("railroad cache is up to date, decompressing");
    const decompressed = LZString.decompressFromUTF16(cachedRailroad);
    JRP.railroad = JSON.parse(decompressed);
  }

  if(revisionLocal.station < VERSION_STATION || !cachedStation) {
    log("station cache is outdated, downloading");
    const dataStation = await (await fetch("data/japan-railway-station.json?r=" + VERSION_STATION)).text();
    JRP.station = JSON.parse(dataStation);

    log("saving station cache, compressing");
    const compressed = LZString.compressToUTF16(dataStation);
    localStorage.setItem("station", compressed);
  }
  else {
    log("station cache is up to date, decompressing");
    const decompressed = LZString.decompressFromUTF16(cachedStation);
    JRP.station = JSON.parse(decompressed);
  }

  log("JRP data loaded");
  const revisionToSave = { railroad: VERSION_RAILROAD, station: VERSION_STATION };
  localStorage.setItem("revision", JSON.stringify(revisionToSave));

  log("JRP data converting");
  JRP.railroads = topojson.feature(JRP.railroad, JRP.railroad.objects.railroads);
  JRP.stations = topojson.feature(JRP.station, JRP.station.objects.stations);

  log("everything has loaded, ready to go!");
}

function loadGoogleMaps() {
  const hostname = location.hostname;

  const googleUrl = "https://maps.googleapis.com/maps/api/js?libraries=geometry";
  const googleKey = "&key=AIzaSyDXfYkzPkfNqI8ZjHsgzuraxhOjMsPg-O8";

  const s = document.createElement("script");
  s.type = "text/javascript";

  if(hostname === "localhost")
    s.src = googleUrl;
  else if(hostname.match(/snack\.studio$/))
    s.src = googleUrl + googleKey;
  else
    s.src = googleUrl;

  s.addEventListener("load", function() {
    JRP.map = new google.maps.Map($("#google-map"), {
      center: { lat: 37, lng: 137 },
      zoom: 5,
    });
  });

  document.head.appendChild(s);
}

function bindEvents() {
  $(".search-input input").addEventListener("input", onSearchInput);
  $(".state-cancel").addEventListener("click", resetSearch);

  $$(".modal .modal-close").forEach($el => $el.addEventListener("click", function() {
    this.parentNode.parentNode.$hide();
  }));

  $(".import-jrp").addEventListener("click", showImportJrpModal);
  $(".modal-action-import-jrp").addEventListener("click", importPlotsFromBase64);

  $(".export-jrp").addEventListener("click", exportPlotsAsBase64);

  $(".button-hide-hover").addEventListener("click", hideHovers);
  $(".button-show-hover").addEventListener("click", showHovers);
}

//==============================================================================

function _makeSearchItem(primary, secondary) {
  const _primary = _make("span", { class: "name-primary" });
  _primary.textContent = primary;

  const _secondary = _make("span", { class: "name-secondary" });
  _secondary.textContent = secondary;

  const _li = _make("li", { class: "item-item search-item" });
  _li.appendChild(_primary);
  _li.appendChild(_secondary);

  return _li;
}

function onSearchInput(event) {
  $(".search-result").innerHTML = "";

  const input = this.value.trim();
  if(input === "") return;

  const lines = searchLine(input);
  lines.forEach(([ lineName, company ]) => {
    const _el = _makeSearchItem(lineName, company);

    _el.setAttribute("data-key", lineName + "\xff" + company);
    _el.addEventListener("mouseenter", onSearchItemLineMouseEnter);
    _el.addEventListener("mouseleave", onSearchItemLineMouseLeave);
    _el.addEventListener("click", onSearchItemLineClick);

    $(".search-result").appendChild(_el);
  });
}

function onSearchItemLineMouseEnter(event) {
  const key = this.getAttribute("data-key");
  const [ lineName, company ] = key.split("\xff");

  if(JRP.tempPolylines[key]) return;
  const tempPolylines = [];

  const features = getRailroadFeatures(lineName, company);
  features.forEach(f => {
    const path = f.geometry.coordinates.map(([ lng, lat ]) => ({ lat, lng }));
    const polyline = new google.maps.Polyline({
      path: path,
      strokeColor: "#FF0000",
      strokeWeight: 1,
      map: JRP.map,
    });
    tempPolylines.push(polyline);
  });

  JRP.tempPolylines[key] = tempPolylines;
}

function onSearchItemLineMouseLeave(event) {
  const key = this.getAttribute("data-key");
  const tempPolylines = JRP.tempPolylines[key];

  if(tempPolylines) {
    for(let i = 0 ; i < tempPolylines.length ; i++) {
      tempPolylines[i].setMap(null);
      delete tempPolylines[i];
    }

    delete JRP.tempPolylines[key];
  }
}

function onSearchItemLineClick(event) {
  const key = this.getAttribute("data-key");
  const [ lineName, company ] = key.split("\xff");

  JRP_SetStateLine(lineName, company);

  $(".search-state").$show("table");
  $(".state-current").textContent = lineName;

  $(".search-input input").removeEventListener("input", onSearchInput);
  $(".search-input input").setAttribute("disabled", "disabled");

  $(".search-result").innerHTML = "";

  const stations = searchStations(lineName, company);
  stations.forEach(([ stationName, groupId ]) => {
    const _el = _makeSearchItem(stationName, groupId);

    _el.setAttribute("data-key", groupId);
    _el.addEventListener("mouseenter", onSearchItemStationMouseEnter);
    _el.addEventListener("mouseleave", onSearchItemStationMouseLeave);
    _el.addEventListener("click", onSearchItemStationClick);

    $(".search-result").appendChild(_el);
  });
}

function onSearchItemStationMouseEnter(event) {
  const key = this.getAttribute("data-key");
  const feature = getStationFeature(key);

  const [ lng, lat ] = feature.geometry.coordinates;
  const marker = new google.maps.Marker({
    position: { lat, lng },
    label: JRP_StateIsStart() ? "A" : "B",
    map: JRP.map,
  });
  JRP.tempMarkers[key] = marker;

  const stationName = this.$(".name-primary").textContent;
  if(JRP_StateIsStart()) $(".state-start").textContent = stationName;
  else $(".state-end").textContent = stationName;
}

function onSearchItemStationMouseLeave(event) {
  const key = this.getAttribute("data-key");

  if(JRP.tempMarkers[key]) {
    JRP.tempMarkers[key].setMap(null);
    delete JRP.tempMarkers[key];
  }
}

function onSearchItemStationClick(event) {
  const key = this.getAttribute("data-key");

  if(JRP_StateIsStart()) {
    JRP_SetStateStartStation(key);
    $(".state-start").textContent = this.$(".name-primary").textContent;
  }
  else {
    JRP_SetStateEndStation(key);
    $(".state-end").textContent = this.$(".name-primary").textContent;

    addPlotItem(JRP.state.lineFeatures, JRP.state.startFeature, JRP.state.endFeature);
    resetSearch();
  }
}

function resetSearch() {
  JRP_ResetState();

  $(".search-state").$hide();
  $(".state-current").textContent = "";
  $(".state-start").textContent = "";
  $(".state-end").textContent = "";

  $(".search-input input").value = "";
  $(".search-input input").addEventListener("input", onSearchInput);
  $(".search-input input").removeAttribute("disabled");

  $(".search-result").innerHTML = "";
}

//==============================================================================

function _makePlotItem(primary, secondary) {
  const _primary = _make("span", { class: "name-primary" });
  _primary.textContent = primary;

  const _secondary = _make("span", { class: "name-secondary" });
  _secondary.textContent = secondary;

  const _actionDelete = _make("button", { class: "action-delete" });
  _actionDelete.textContent = "삭제";

  const _actionColor = _make("button", { class: "action-color" });
  _actionColor.innerHTML = "색 (<var>#000000</var>)";

  const _actionWidth = _make("button", { class: "action-width" });
  _actionWidth.innerHTML = "두께 (<var>1</var>)";

  const _controls = _make("div", { class: "plot-controls" });
  _controls.appendChild(_actionDelete);
  _controls.appendChild(_actionColor);
  _controls.appendChild(_actionWidth);

  const _li = _make("li", { class: "item-item plot-item" });
  _li.appendChild(_primary);
  _li.appendChild(_secondary);
  _li.appendChild(_controls);

  return _li;
}

function addPlotItem(lines, start, end) {
  const route = findRoute(lines, start, end);

  if(route === false) {
    alert("Unable to find a route");
    resetSearch();
    return;
  }

  const plotIndex = JRP.plots.length;
  const plot = {
    coordinates: route,
    properties: {
      lineName: lines[0].properties.lineName,
      company: lines[0].properties.company,
      start: start.properties.groupId,
      end: end.properties.groupId,
      color: "#000000",
      width: 1,
    },
    object: new google.maps.Polyline({
      path: route.map(([ lng, lat ]) => ({ lat, lng })),
      strokeColor: "#000000",
      strokeWeight: 1,
      map: JRP.map,
    }),
  };
  JRP.plots.push(plot);

  const _li = _makePlotItem(lines[0].properties.lineName,
    start.properties.stationName + " → " +
    end.properties.stationName);

  _li.setAttribute("data-index", plotIndex);
  _li.$(".action-delete").addEventListener("click", deletePlotItem);
  _li.$(".action-color").addEventListener("click", changePlotColor);
  _li.$(".action-width").addEventListener("click", changePlotWidth);

  $(".plot-list").appendChild(_li);

  return plotIndex;
}

function searchAndAddPlotItem(lineName, company, start, end) {
  const lineFeatures = getRailroadFeatures(lineName, company);
  const startFeature = getStationFeature(start);
  const endFeature = getStationFeature(end);

  return addPlotItem(lineFeatures, startFeature, endFeature);
}

function deletePlotItem(event) {
  const el = this.parentNode.parentNode;
  const index = parseInt(el.getAttribute("data-index"));
  log("delete", index);

  el.parentNode.removeChild(el);

  for(let i = index + 1 ; i < JRP.plots.length ; i++) {
    log("index", i);
    $(".plot-item[data-index='" + i + "']").setAttribute("data-index", i - 1);
  }

  JRP.plots[index].object.setMap(null);
  JRP.plots.splice(index, 1);
}

function changePlotColor(index, newColor) {
  if(typeof index !== "number") index = parseInt(this.parentNode.parentNode.getAttribute("data-index"));
  if(typeof newColor !== "string") newColor = prompt("새로운 색상 (#xxxxxx 형태)").trim();

  if(newColor && /^#[0-9a-f]{6}$/i.test(newColor)) {
    JRP.plots[index].object.set("strokeColor", newColor);
    JRP.plots[index].properties.color = newColor;
    $(".plot-item[data-index='" + index + "'] .action-color var").textContent = newColor;
  }
}

function changePlotWidth(index, newWidth) {
  if(typeof index !== "number") index = parseInt(this.parentNode.parentNode.getAttribute("data-index"));
  if(typeof newWidth !== "number") newWidth = parseFloat(prompt("새로운 너비 (숫자)").trim());

  if(newWidth && !Number.isNaN(newWidth)) {
    JRP.plots[index].object.set("strokeWeight", newWidth);
    JRP.plots[index].properties.width = newWidth;
    $(".plot-item[data-index='" + index + "'] .action-width var").textContent = newWidth;
  }
}

function exportPlotsAsBase64() {
  const plots = JSON.stringify(JRP.plots.map(p => p.properties));
  const output = LZString.compressToBase64(plots);

  $(".modal-export-jrp").$show();
  $(".modal-export-jrp textarea").value = output;
  $(".modal-export-jrp textarea").select();
}

function showImportJrpModal() {
  $(".modal-import-jrp").$show();
  $(".modal-import-jrp textarea").value = "";
  $(".modal-import-jrp textarea").focus();
}

function importPlotsFromBase64() {
  const input = $(".modal-import-jrp textarea").value.trim();
  if(input === "") return;

  const plots = LZString.decompressFromBase64(input);
  if(plots === null) alert("올바르지 않은 데이터입니다.");

  try {
    const parsed = JSON.parse(plots);

    for(const plot of parsed) {
      const index = searchAndAddPlotItem(plot.lineName, plot.company, plot.start, plot.end);
      changePlotColor(index, plot.color);
      changePlotWidth(index, plot.width);
    }
  }
  catch(e) {
    alert("올바르지 않은 데이터입니다.");
    log(e);
    log(plots);
  }
}

//==============================================================================

function hideHovers() { $("body").classList.add("hide-hover"); }
function showHovers() { $("body").classList.remove("hide-hover"); }

//==============================================================================

async function main() {
  $(".loading").$show();

  await loadData();
  loadGoogleMaps();
  bindEvents();

  $(".loading").$hide();
}

//==============================================================================

main()
  .then(() => { })
  .catch(err => { console.error(err); });
