# osm-places-parser
Simple parser of Open Street Maps places

An example of [Osmosis](http://wiki.openstreetmap.org/wiki/Osmosis) command that filters places:
```bash
osmosis --read-pbf poland-latest.osm.pbf --tf accept-nodes place=city,town,village --write-xml poland-cities.osm
```
