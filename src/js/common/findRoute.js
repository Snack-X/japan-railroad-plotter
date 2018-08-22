const utils = require('./utils');

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
  // 시작 지점부터 양쪽 방향으로 나아가며 갈림길이 나타날 때마다 분기하여 경로를 찾음

  startCoord = flip(startCoord);
  endCoord = flip(endCoord);

  /** @type Array<Line> */
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

  console.log(start, end);

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

  console.log(intersections);
}
