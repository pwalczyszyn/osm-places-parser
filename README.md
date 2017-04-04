# osm-places-parser
Simple parser of Open Street Maps places

### Running

Running it with [Osmosis](http://wiki.openstreetmap.org/wiki/Osmosis) stdin/stdout:

```bash
osmosis --read-pbf input.osm.pbf --tf accept-nodes place=city,town,village --write-xml - | node index.js
```
