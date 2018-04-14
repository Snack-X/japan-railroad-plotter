# [Japan Railroad Plotter](https://jrp.snack.studio)

Go to [https://jrp.snack.studio](https://jrp.snack.studio).

## Data

Source data is quite huge and not included on this repository. You should download source data by yourself and place them under `data_raw` directory.

* http://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N05-v1_3.html

`data_raw` directory tree should look like this:

```
data_raw/
    japan-railway/
        KS-META-N05-16.xml
        N05-16.xml
        N05-16_RailroadSection2.dbf
        N05-16_RailroadSection2.geojson
        N05-16_RailroadSection2.prj
        N05-16_RailroadSection2.shp
        N05-16_RailroadSection2.shx
        N05-16_Station2.dbf
        N05-16_Station2.geojson
        N05-16_Station2.prj
        N05-16_Station2.shp
        N05-16_Station2.shx
```

After running `npm install` and `build-data.js` scripts, `data` directory will contain coverted smaller data.

For more information, please refer to the website.

* http://nlftp.mlit.go.jp/ksj/

*All rights reserved. Copyright (c) 1974-2017 National Land Information Division, National Spatial Planning and Regional Policy Bureau, MLIT of Japan.*
