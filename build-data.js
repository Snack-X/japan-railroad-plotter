const mapshaper = require("mapshaper");
mapshaper.enableLogging();

const runMapshaper = commands => new Promise((resolve, reject) => {
  mapshaper.runCommands(commands, err => {
    if(err) reject(err);
    else resolve();
  });
});

(async function() {

  // Build Japan railroad data
  await runMapshaper(
   `-i data_raw/japan-railway/N05-16_RailroadSection2.shp encoding=shiftjis \
    -rename-fields 'type=N05_001,lineName=N05_002,company=N05_003,openYear=N05_004,startYear=N05_005b,endYear=N05_005e,groupId=N05_006' \
    -drop fields=N05_007,N05_008,N05_009,N05_010 \
    -each 'type = parseInt(type),
           openYear = parseInt(openYear),
           startYear = parseInt(startYear),
           endYear = parseInt(endYear)' \
    -filter 'endYear == 9999' \
    -rename-layers railroads \
    -o data/japan-railway-railroad.json format=topojson precision=0.00001`);

  await runMapshaper(
   `-i data_raw/japan-railway/N05-16_Station2.shp encoding=shiftjis \
    -rename-fields 'type=N05_001,lineName=N05_002,company=N05_003,openYear=N05_004,startYear=N05_005b,endYear=N05_005e,groupId=N05_006,stationName=N05_011' \
    -drop fields=N05_007,N05_008,N05_009,N05_010 \
    -each 'type = parseInt(type),
           openYear = parseInt(openYear),
           startYear = parseInt(startYear),
           endYear = parseInt(endYear)
           groupId = (this.id == 6053) ? "EB03_a14208001" :
                     (this.id == 6055) ? "EB03_a14208003" : groupId' \
    -filter 'endYear == 9999' \
    -rename-layers stations \
    -o data/japan-railway-station.json format=topojson precision=0.00001`);
})()
  .then(() => { process.exit(0); })
  .catch(err => { console.error(err.stack || err); process.exit(1); });