window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);

[ HTMLDocument, HTMLElement ].forEach(p => {
  p.prototype.$ = p.prototype.querySelector;
  p.prototype.$$ = p.prototype.querySelectorAll;
});

HTMLElement.prototype.$show = function() { this.style.display = "block"; };
HTMLElement.prototype.$hide = function() { this.style.display = "none"; };

window._make = (name, attrs = {}) => {
  const el = document.createElement(name);
  Object.keys(attrs).forEach(key => { el.setAttribute(key, attrs[key]); });
  return el;
};

window.log = (...args) => { console.log("[" + new Date().toLocaleString() + "]", ...args); };

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
}

function searchLine(keyword) {
  const filtered = JRP.railroads.features.filter(
    f => f.properties.lineName.includes(keyword)
  );

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
  const time = Math.ceil(new Date().getTime() / 3600000);

  const revisionDefault = { railroad: 0, station: 0 };
  const revisionRemote = await (await fetch("data/revision.json?t=" + time)).json();
  const revisionLocal = JSON.parse(localStorage.getItem("revision")) || revisionDefault;

  const cachedRailroad = localStorage.getItem("railroad");
  const cachedStation = localStorage.getItem("station");

  if(revisionLocal.railroad < revisionRemote.railroad || !cachedRailroad) {
    log("railroad cache is outdated, downloading");
    const dataRailroad = await (await fetch("data/japan-railway-railroad.json?r=" + revisionRemote.railroad )).text();
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

  if(revisionLocal.station < revisionRemote.station || !cachedStation) {
    log("station cache is outdated, downloading");
    const dataStation = await (await fetch("data/japan-railway-station.json?r=" + revisionRemote.railroad)).text();
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
  localStorage.setItem("revision", JSON.stringify(revisionRemote));

  log("JRP data converting");
  JRP.railroads = topojson.feature(JRP.railroad, JRP.railroad.objects.railroads);
  JRP.stations = topojson.feature(JRP.station, JRP.station.objects.stations);

  log("everything has loaded, ready to go!");
}

function loadGoogleMaps() {
  JRP.map = new google.maps.Map($("#google-map"), {
    center: { lat: 37, lng: 137 },
    zoom: 5,
  });
}

function bindEvents() {
  $(".search-input input").addEventListener("input", onSearchInput);
  $(".state-cancel").addEventListener("click", resetSearch);
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

  $(".search-state").$show();
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

    addPlotItem();
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
  _actionDelete.innerHTML = "Delete";

  const _actionColor = _make("button", { class: "action-color" });
  _actionColor.innerHTML = "Color (<var>#000000</var>)";

  const _actionWidth = _make("button", { class: "action-width" });
  _actionWidth.innerHTML = "Width (<var>1</var>)";

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

function addPlotItem() {
  const lines = JRP.state.lineFeatures;
  const start = JRP.state.startFeature;
  const end = JRP.state.endFeature;
  const route = findRoute(lines, start, end);

  const plotIndex = JRP.plots.length;
  const plot = {
    coordinates: route,
    object: new google.maps.Polyline({
      path: route.map(([ lng, lat ]) => ({ lat, lng })),
      strokeColor: "#000000",
      strokeWeight: 1,
      map: JRP.map,
    }),
  };
  JRP.plots.push(plot);

  const _li = _makePlotItem(JRP.state.lineName,
    JRP.state.startFeature.properties.stationName + " → " +
    JRP.state.endFeature.properties.stationName);

  _li.setAttribute("data-index", plotIndex);
  _li.$(".action-delete").addEventListener("click", deletePlotItem);
  _li.$(".action-color").addEventListener("click", changePlotColor);
  _li.$(".action-width").addEventListener("click", changePlotWidth);

  $(".plot-list").appendChild(_li);
}

function deletePlotItem(event) {
  const el = this.parentNode.parentNode;
  const index = parseInt(el.getAttribute("data-index"));
  log("delete", index);

  el.parentNode.removeChild(el);

  for(let i = index + 1 ; i < JRP.plots.length ; i++) {
    log("index", i);
    $(".plot-item[data-index='" + i + "'").setAttribute("data-index", i - 1);
  }

  JRP.plots[index].object.setMap(null);
  JRP.plots.splice(index, 1);
}

function changePlotColor(event) {
  const index = parseInt(this.parentNode.parentNode.getAttribute("data-index"));

  const newColor = prompt("새로운 색상 (#xxxxxx 형태)").trim();
  if(newColor && /^#[0-9a-f]{6}$/i.test(newColor)) {
    JRP.plots[index].object.set("strokeColor", newColor);
    this.$("var").textContent = newColor;
  }
}

function changePlotWidth(event) {
  const index = parseInt(this.parentNode.parentNode.getAttribute("data-index"));

  const newWidth = prompt("새로운 너비 (숫자)").trim();
  if(newWidth && !Number.isNaN(parseFloat(newWidth))) {
    JRP.plots[index].object.set("strokeWeight", parseFloat(newWidth));
    this.$("var").textContent = newWidth;
  }
}

//==============================================================================

const DIR_LEFT = -1, DIR_START = 0, DIR_RIGHT = 1, DIR_INTERSECTION = 2;

function compareCoordinate(a, b) {
  return Math.round(a[0] * 100000) === Math.round(b[0] * 100000) &&
    Math.round(a[1] * 100000) === Math.round(b[1] * 100000);
}

function findRoute(lines, start, end) {
  log("line", lines[0].properties.lineName, lines[0].properties.company);
  log("lines.length", lines.length);
  log("start", start.properties.stationName);
  log("end", end.properties.stationName);

  // 두 역이 같은 선상에 있으면 빠르게 연결
  for(const line of lines) {
    let startIdx = -1, endIdx = -1;

    for(let i = 0 ; i < line.geometry.coordinates.length ; i++) {
      const coord = line.geometry.coordinates[i];
      if(compareCoordinate(coord, start.geometry.coordinates)) startIdx = i;
      else if(compareCoordinate(coord, end.geometry.coordinates)) endIdx = i;
    }

    if(startIdx !== -1 && endIdx !== -1) {
      log(start.properties);

      if(startIdx < endIdx)
        return line.geometry.coordinates.slice(startIdx, endIdx + 1);
      else
        return line.geometry.coordinates.slice(endIdx, startIdx + 1).reverse();
    }
    else {
      const route = findRouteInHardWay(lines, start, end);
      if(route === false) {
        alert("Unable to find a route");
        resetSearch();
      }
    }
  }
}

function findRouteInHardWay(lineFeatures, startFeature, endFeature) {
  // 시작 역에서부터 양쪽 방향으로 나아가며 갈림길이 나타날 때마다 분기하여 경로를 찾음

  log(startFeature, endFeature);

  // Coordinate = [ coordIndex, lng, lat ]
  // Line = Coordinate[]
  // Endpoint = [ lineIndex, Coordinate ]
  // Intersection = lineIndex -> coordIndex -> [ lineIndex, coordIndex ]

  const lines = [];
  const endpoints = [];
  const intersections = {};

  // 해당 선명을 가진 모든 선들의 양극점을 계산
  for(let i = 0 ; i < lineFeatures.length ; i++) {
    const lineIndex = lines.length;

    const line = lineFeatures[i].geometry.coordinates.slice().map((p, i) => [i, ...p]);
    lines.push(line);

    endpoints.push([ lineIndex, line[0] ]);
    endpoints.push([ lineIndex, line[line.length - 1] ]);

    intersections[i] = {};
    intersections[i][0] = null;
    intersections[i][line.length - 1] = null;
  }

  log("lines", lines);
  log("endpoints", endpoints);

  // 어떤 선이 어떤 선과 어디서 연결되는지 계산
  for(let lineIndex = 0 ; lineIndex < lines.length ; lineIndex++) {
    for(let ei = 0 ; ei < endpoints.length ; ei++) {
      if(endpoints[ei][0] === lineIndex) continue;

      const toFind = [ endpoints[ei][1][1], endpoints[ei][1][2] ];
      const intersection = lines[lineIndex].filter(([p, x, y]) => compareCoordinate([x, y], toFind))[0];
      if(intersection) {
        log(`${lineIndex}[${intersection[0]}] - ${endpoints[ei][0]}[${endpoints[ei][1][0]}]`);

        intersections[lineIndex][intersection[0]] = [ endpoints[ei][0], endpoints[ei][1][0] ];
        intersections[endpoints[ei][0]][endpoints[ei][1][0]] = [ lineIndex, intersection[0] ];
      }
    }
  }

  log("intersections", intersections);

  // 시작과 끝이 어디에 있는지 찾기
  const start = [], end = [];
  for(let lineIndex = 0 ; lineIndex < lines.length ; lineIndex++) {
    for(let coordIndex = 0 ; coordIndex < lines[lineIndex].length ; coordIndex++) {
      const coord = lines[lineIndex][coordIndex];

      if(compareCoordinate(startFeature.geometry.coordinates, [ coord[1], coord[2] ])) {
        start[0] = lineIndex;
        start[1] = coordIndex;
      }
      else if(compareCoordinate(endFeature.geometry.coordinates, [ coord[1], coord[2] ])) {
        end[0] = lineIndex;
        end[1] = coordIndex;
      }

      if(start.length && end.length) break;
    }

    if(start.length && end.length) break;
  }

  log("start end", start, end);

  // 시작점에서부터 양쪽으로 찾아나가기
  const routes = findRoutesRecursive(lines, intersections, start, end, DIR_START);
  if(routes.length === 0) return false;

  const candidates = routes.map(
    directions => [].concat(
      ...directions.map(
        ([ lineIndex, start, end ]) => {
          if(start < end) return lines[lineIndex].slice(start, end + 1);
          else return lines[lineIndex].slice(end, start + 1).reverse();
        }
      )
    ).map(([p, x, y]) => [ x, y ])
  );

  if(candidates.length === 1) return candidates[0];

  // 가장 짧은 경로를 최종적으로 선택
  const candidatesWithLength = candidates.map(
    coordinates => [ coordinates, calculateLength(coordinates) ]
  );

  candidatesWithLength.sort((a, b) => a[1] - b[1]);

  return candidatesWithLength[0][0];
}

function findRoutesRecursive(lines, intersections, start, end, prevDirection) {
  log("----------------------------------------------------------");
  if(start[0] === end[0]) {
    log("found");
    return [ [ [start[0], start[1], end[1]] ] ];
  }

  let points = Object.keys(intersections[start[0]]).map(i => parseInt(i));
  points.sort((a, b) => a - b);

  const routes = [];

  let idx;
  for(idx = 0 ; idx < points.length ; idx++)
    if(points[idx] >= start[1]) break;

  log("start", start);
  log("points, idx", points, idx);

  const atIntersection = points[idx] === start[1];
  log("at intersection", atIntersection);

  if(atIntersection && prevDirection !== DIR_INTERSECTION) {
    log("intersection", start[0], start[1]);
    const next = intersections[start[0]][start[1]];

    if(next === null) {
      log("intersection dead end");
    }
    else {
      log("find route for", next, end);
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_INTERSECTION);
      log("intersection routes", nextRoutes);

      for(let i = 0 ; i < nextRoutes.length ; i++)
        routes.push([ ...nextRoutes[i] ]);
      log("current routes", routes);
    }
  }

  log("prev direction", prevDirection);

  if(prevDirection !== DIR_RIGHT) {
    log("left idx", idx - 1);

    if(idx === 0) {
      log("left dead end");
    }
    else {
      const next = [ start[0], points[idx - 1] ];
      log("left", next);

      log("find route for", next, end);
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_LEFT);
      log("left routes", nextRoutes);

      for(let i = 0 ; i < nextRoutes.length ; i++)
        routes.push([ [start[0], start[1], next[1]], ...nextRoutes[i] ]);
      log("current routes", routes);
    }
  }

  if(prevDirection !== DIR_LEFT) {
    log("right idx", idx);

    if(atIntersection && idx === points.length - 1) {
      log("right dead end");
    }
    else {
      const next = [ start[0], points[atIntersection ? idx + 1 : idx] ];
      log("right", next);

      log("find route for", next, end);
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_RIGHT);
      log("right routes", nextRoutes);

      for(let i = 0 ; i < nextRoutes.length ; i++)
        routes.push([ [start[0], start[1], next[1]], ...nextRoutes[i] ]);
      log("current routes", routes);
    }
  }

  log("final routes", routes);
  return routes;
}

function calculateLength(lineString) {
  if(lineString.length < 2) return 0;

  let result = 0;

  for(let i = 1 ; i < lineString.length ; i++)
    result += distance(
      lineString[i - 1][1], lineString[i - 1][0],
      lineString[i    ][1], lineString[i    ][0]
    );

  return result;
}

function distance(lat1, lng1, lat2, lng2) {
  // Haversine formula
  const R = 6371000; // in meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
