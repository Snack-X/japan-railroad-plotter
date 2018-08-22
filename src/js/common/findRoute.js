const utils = require('./utils');

const DIR_LEFT = -1,
      DIR_START = 0,
      DIR_RIGHT = 1,
      DIR_INTERSECTION = 2;

/**
 * Flip latitude and longitude
 * @param {[number, number]} coord Corodinate
 * @returns {[number, number]} Flipped coordinate
 */
const flip = coord => [ coord[1], coord[0] ];

/**
 * Find `coord` from `lineStrings`
 * @param {[number, number][]} lineStrings Array of LatLng coordinates
 * @param {[number, number][]} coord LatLng coordinate
 * @return {[ number, number, boolean | number ] | boolean}
 *   [ lineIndex, coordIndex, false ] or
 *   [ lineIndex, coordIndexStart, coordIndexEnd ] or false
 */
function findCoordinate(lineStrings, coord) {
  for (let lidx = 0 ; lidx < lineStrings.length ; lidx++) {
    const line = lineStrings[lidx];

    for (let cidx = 0 ; cidx < line.length ; cidx++) {
      if (utils.geo.compare(...line[cidx], ...coord)) {
        return [ lidx, cidx, false ];
      }
    }
  }

  // Mayby coord is somewhere over the straight line
  for (let lidx = 0 ; lidx < lineStrings.length ; lidx++) {
    const line = lineStrings[lidx];

    for (let cidx = 0 ; cidx < line.length - 1 ; cidx++) {
      const left = utils.geo.distance(...line[cidx], ...coord),
            right = utils.geo.distance(...coord, ...line[cidx + 1]),
            total = utils.geo.distance(...line[cidx], ...line[cidx + 1]);

      if (Math.round(left + right) === Math.round(total))
        return [ lidx, cidx, cidx + 1 ];
    }
  }

  return false;
}

/**
 *
 * @param {[number, number][]} lineStrings Array of LngLat coordinates
 * @param {[number, number]} startCoord LngLat coordinate
 * @param {[number, number]} endCoord LngLat coordinate
 */
module.exports = function (lineStrings, startCoord, endCoord) {
  // 시작 지점부터 양쪽 방향으로 나아가며 갈림길에서 분기해 경로를 찾음

  startCoord = flip(startCoord);
  endCoord = flip(endCoord);

  /** @type [number, number][] */
  const lines = [];

  const intersections = {};

  for (let lidx = 0, lmax = lineStrings.length ; lidx < lmax ; lidx++) {
    const line = lineStrings[lidx].slice().map(flip);
    lines.push(line);
    intersections[lidx] = {};
  }

  const linesCount = lines.length;

  // 시작과 끝이 어디에 있는지 찾기
  // 중간에 위치한 경우 편의를 위해 해당 지점을 선 중간에 추가시킴
  // [ lineIndex, coordIndex, isMiddle ]
  let findAgain = false;
  let start = findCoordinate(lines, startCoord);
  if (start === false) return false;
  if (start[2] !== false) {
    findAgain = true;
    lines[start[0]].splice(start[1], 0, startCoord);
  }

  let end = findCoordinate(lines, endCoord);
  if (end === false) return false;
  if (end[2] !== false) {
    findAgain = true;
    lines[end[0]].splice(end[1], 0, endCoord);
  }

  if (findAgain) {
    start = findCoordinate(lines, startCoord);
    end = findCoordinate(lines, endCoord);
  }

  // 선과 선의 연결점 계산
  for (let lidx1 = 0 ; lidx1 < linesCount ; lidx1++) {
    for (let lidx2 = 0 ; lidx2 < linesCount ; lidx2++) {
      for(let cidx1 of [ 0, lines[lidx1].length - 1 ]) {
        for (let cidx2 = 0 ; cidx2 < lines[lidx2].length ; cidx2++) {
          if (
            (lidx1 !== lidx2 || cidx1 !== cidx2) &&
            utils.geo.compare(...lines[lidx1][cidx1], ...lines[lidx2][cidx2])
          ) {
            intersections[lidx1][cidx1] = [ lidx2, cidx2 ];
            intersections[lidx2][cidx2] = [ lidx1, cidx1 ];
          }
        }
      }
    }
  }

  // 시작점에서부터 양쪽으로 찾아나가기
  const routes = findRecursive(lines, intersections, start, end);
  console.log(routes);

  // LineString으로 변환하여 가장 짧은 경로를 선택
}

/**
 * 
 * @param {[number, number][]} lines Array of LatLng coordinates
 * @param {any} intersections
 * @param {[number, number]} start [ lineIndex, coordIndex ]
 * @param {[number, number]} end [ lineIndex, coordIndex ]
 * @param {number} prevDirection 
 * @param {string[]} visited Visited points (array of 'lineIndex/coordIndex')
 */
function findRecursive(lines, intersections, start, end, prevDirection = DIR_START, visited = []) {
  // Helpers
  const _recurse = findRecursive.bind(null, lines, intersections);
  const isVisited = ([ lidx, cidx ]) => visited.includes(`${lidx}/${cidx}`);

  /** @type [number, number, number][][] */
  const routes = [];

  const [ lidxStart, cidxStart ] = start,
        [ lidxEnd, cidxEnd ] = end;

  // 시작점과 종료점이 같은 선 안에 있을 경우
  if (lidxStart === lidxEnd) {
    routes.push([ [lidxStart, cidxStart, cidxEnd] ]);
  }

  // 방문한 곳 추가
  visited = [ ...visited, `${lidxStart}/${cidxStart}` ];

  // 다음으로 방문할 곳들  
  let nextPoints = Object.keys(intersections[lidxStart]);
  nextPoints = nextPoints.map(s => parseInt(s));
  nextPoints.sort((a, b) => a - b);
  
  let lefts = [], intersection = false, rights = [];
  for (let i = 0 ; i < nextPoints.length ; i++) {
    const cidxNext = nextPoints[i];

    if (cidxNext < cidxStart)
      lefts.push(cidxNext);
    else if (cidxStart === cidxNext)
      intersection = intersections[lidxStart][cidxNext];
    else if (cidxStart < cidxNext)
      rights.push(cidxNext);
  }

  let left = false, right = false;
  if (lefts.length) left = Math.max(...lefts);
  if (rights.length) right = Math.min(...rights);
  
  // 현재 위치보다 왼쪽에 연결점이 있을 경우
  const leftNext = [ lidxStart, left ];
  if (left !== false && prevDirection !== DIR_RIGHT && !isVisited(leftNext)) {
    const newRoutes = _recurse(leftNext, end, DIR_LEFT, visited)
      .map(route => [ [lidxStart, cidxStart, left], ...route ]);
    routes.push(...newRoutes);
  }
  
  // 현재 위치에서 다른 선으로 이동할 수 있을 경우
  if (intersection !== false && !isVisited(intersection)) {
    const newRoutes = _recurse(intersection, end, DIR_INTERSECTION, visited);
    routes.push(...newRoutes);
  }
  
  // 현재 위치보다 오른쪽에 연결점이 있을 경우
  const rightNext = [ lidxStart, right ];
  if (right !== false && prevDirection !== DIR_LEFT && !isVisited(rightNext)) {
    const newRoutes = _recurse(rightNext, end, DIR_RIGHT, visited)
      .map(route => [ [lidxStart, cidxStart, right], ...route ]);
    routes.push(...newRoutes);
  }
  
  return routes;
}
