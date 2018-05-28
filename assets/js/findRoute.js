const { calculateLength, distance } = require("./geoUtilities");
const DIR_LEFT = -1,
      DIR_START = 0,
      DIR_RIGHT = 1,
      DIR_INTERSECTION = 2;

function compareCoordinate(a, b) {
  return Math.round(a[0] * 100000) === Math.round(b[0] * 100000) &&
    Math.round(a[1] * 100000) === Math.round(b[1] * 100000);
}

function findRoute(lines, start, end) {
  log("line", lines[0].properties.lineName, lines[0].properties.company);
  log("lines.length", lines.length);
  log("start", start.properties.stationName);
  log("end", end.properties.stationName);

  const route = findRouteInHardWay(lines, start, end);
  return route;
}

function findMidpoint(lines, middle) {
  for(let lineIndex = 0 ; lineIndex < lines.length ; lineIndex++) {
    for(let coordIndex = 0 ; coordIndex < lines[lineIndex].length - 1 ; coordIndex++) {
      const start = lines[lineIndex][coordIndex];
      const end = lines[lineIndex][coordIndex + 1];

      const startToMiddle = distance( start[2],  start[1], middle[1], middle[0]),
            middleToEnd   = distance(middle[1], middle[0],    end[2],    end[1]),
            startToEnd    = distance( start[2],  start[1],    end[2],    end[1]);

      if(Math.round(startToMiddle + middleToEnd) === Math.round(startToEnd))
        return [ lineIndex, coordIndex, coordIndex + 1 ];
    }
  }

  return false;
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
      const toFind = [ endpoints[ei][1][1], endpoints[ei][1][2] ];
      const intersection = lines[lineIndex].filter(
        ([p, x, y]) => endpoints[ei][1][0] !== p && compareCoordinate([x, y], toFind)
      )[0];
      if(intersection) {
        log(`${lineIndex}[${intersection[0]}] - ${endpoints[ei][0]}[${endpoints[ei][1][0]}]`);

        intersections[lineIndex][intersection[0]] = [ endpoints[ei][0], endpoints[ei][1][0] ];
        intersections[endpoints[ei][0]][endpoints[ei][1][0]] = [ lineIndex, intersection[0] ];
      }
    }
  }

  log("intersections", intersections);

  // 시작과 끝이 어디에 있는지 찾기
  let start = [ null, null, false ], end = [ null, null, false ];
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

      if(start[0] !== null && end[0] !== null) break;
    }

    if(start[0] !== null && end[0] !== null) break;
  }

  // 시작이나 끝을 찾지 못한 경우 (직선 위에 역이 위치한 경우)
  if(start[0] === null) {
    log("start over straight line");
    const midpoint = findMidpoint(lines, startFeature.geometry.coordinates);

    if(midpoint === false) {
      log("start is not over any line");
      return false;
    }

    start[0] = midpoint[0];
    start[1] = midpoint[1];
    start[2] = midpoint[2];
  }
  if(end[0] === null) {
    log("end over straight line");
    const midpoint = findMidpoint(lines, endFeature.geometry.coordinates);

    if(midpoint === false) {
      log("end is not over any line");
      return false;
    }

    end[0] = midpoint[0];
    end[1] = midpoint[1];
    end[2] = midpoint[2];
  }
  log("start end", start, end);

  // 시작점에서부터 양쪽으로 찾아나가기
  const routes = findRoutesRecursive(lines, intersections, start, end);

  // 직선 위에 역이 위치한 경우 처리
  if(start[2] !== false)
    routes.push(...findRoutesRecursive(lines, intersections, [ start[0], start[2] ], end));
  if(end[2] !== false)
    routes.push(...findRoutesRecursive(lines, intersections, start, [ end[0], end[2] ]));
  if(start[2] !== false && end[2] !== false)
    routes.push(...findRoutesRecursive(lines, intersections, [ start[0], start[2] ], [ end[0], end[2] ]));

  if(routes.length === 0) return false;

  for(let i = 0 ; i < routes.length ; i++) {
    const route = routes[i];

    if(start[2] !== false && route[0][0] === start[0] &&
      (route[0][1] === start[1] || route[0][1] === start[2]))
      route.unshift(startFeature.geometry.coordinates);

    if(end[2] !== false && route[0][0] === end[0] &&
      (route[0][1] === end[1] || route[0][1] === end[2]))
      route.unshift(endFeature.geometry.coordinates);

    const last = route.length - 1;

    if(start[2] !== false && route[last][0] === start[0] &&
      (route[last][2] === start[1] || route[last][2] === start[2]))
      route.push(startFeature.geometry.coordinates);

    if(end[2] !== false && route[last][0] === end[0] &&
      (route[last][2] === end[1] || route[last][2] === end[2]))
      route.push(endFeature.geometry.coordinates);
  }

  log("final route candidates", routes);

  const candidates = routes.map(
    directions => [].concat(
      ...directions.map(
        arr => {
          if(arr.length === 2) return [[ null, arr[0], arr[1] ]];

          const [ lineIndex, start, end ] = arr;
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

function findRoutesRecursive(lines, intersections, start, end, prevDirection = DIR_START, visited = []) {
  log("----------------------------------------------------------");

  const routes = [];

  // 같은 선 안에 있고 시작점과 종료점이 있는 경우
  if(start[0] === end[0]) {
    log("found direct");
    routes.push([ [start[0], start[1], end[1]] ]);
  }

  const newVisited = visited.slice();
  newVisited.push(`${start[0]}/${start[1]}`);

  let points = Object.keys(intersections[start[0]]).map(i => parseInt(i));
  points.sort((a, b) => a - b);

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

    if(next === null || newVisited.includes(`${next[0]}/${next[1]}`)) {
      log("intersection dead end");
    }
    else {
      log("find route for", next, end);
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_INTERSECTION, newVisited);
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
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_LEFT, newVisited);
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
      const nextRoutes = findRoutesRecursive(lines, intersections, next, end, DIR_RIGHT, newVisited);
      log("right routes", nextRoutes);

      for(let i = 0 ; i < nextRoutes.length ; i++)
        routes.push([ [start[0], start[1], next[1]], ...nextRoutes[i] ]);
      log("current routes", routes);
    }
  }

  log("final routes", routes);
  return routes;
}

module.exports = findRoute;
