
const events = require('events');
const XmlStream = require('xml-stream');

class OsmPlacesParser extends events.EventEmitter {

  constructor(stream, hierarchy = [], separator = '<>') {
    super();

    // Plaes OSM stream
    this.stream = stream;

    // hierarchy based on Poland OSM cities ['province', 'county', 'municipality', 'place']
    // @see http://download.geofabrik.de/europe/poland-latest.osm.pbf
    this.hierarchy = hierarchy;

    // hash separator
    this.separator = separator;

    // Store grouped by location type
    this.store = hierarchy.reduce((result, type) => {
      result[type] = {};
      return result;
    }, {});

    // Starting parsing from a next tick
    process.nextTick(this._parse.bind(this));
  }

  _parse() {

    this.xml = new XmlStream(this.stream);
    this.xml.preserve('node', true);
    this.xml.collect('tag');
    this.xml.on('endElement: node', node => {
      try {
        // OSM node example
        // <node id="24922885" version="11" timestamp="2014-11-30T13:49:06Z" uid="2381492" user="WiktorN-import" changeset="27131906" lat="54.1332788" lon="18.2024348">
        //   <tag k="name" v="Nowa Karczma"/>
        //   <tag k="place" v="village"/>
        //   <tag k="teryt:rm" v="01"/>
        //   <tag k="wikipedia" v="pl:Nowa Karczma, Gmina Nowa Karczma"/>
        //   <tag k="population" v="792"/>
        //   <tag k="teryt:simc" v="0167912"/>
        //   <tag k="postal_code" v="83-404"/>
        //   <tag k="is_in:county" v="powiat kościerski"/>
        //   <tag k="addr:postcode" v="83-404"/>
        //   <tag k="teryt:stan_na" v="2009-01-01"/>
        //   <tag k="is_in:province" v="województwo pomorskie"/>
        //   <tag k="teryt:updated_by" v="teryt2osm combine.py v. 43"/>
        //   <tag k="source:population" v="wikipedia"/>
        //   <tag k="is_in:municipality" v="gmina Nowa Karczma"/>
        // </node>



        const placeName = this._getTagValue(node.tag, 'name');
        // is_in:province - wojewodztwo
        const province = this._getTagValue(node.tag, 'is_in:province');
        // is_in:county - powiat
        const county = this._getTagValue(node.tag, 'is_in:county');
        // is_in:municipality - gmina
        const municipality = this._getTagValue(node.tag, 'is_in:municipality');

        // Creating place hash
        const placeHash = this._createHash(province, county, municipality, placeName);

        // Creating new place object
        const place = this._createPlace(placeHash);

        place.uid = node.$.uid;
        place.lat = node.$.lat;
        place.lon = node.$.lon;

        //    id: '24978475',
        //    version: '10',
        //    timestamp: '2015-01-28T16:54:52Z',
        //    uid: '2587831',
        //    user: 'rogal-imports',
        //    changeset: '28469502',
        //    lat: '54.1842463',
        //    lon: '18.1690156'

        // Emitting an event with new place
        this.emit('place', place);

      } catch(error) {
        console.log('error', error.stack);
      }

    });

    this.xml.on('endElement: osm', () => {
      // Emitting end event with a store of created places
      this.emit('end', this.store);
    });

  }

  _createPlace(hash) {
    // no hash no location
    if (!hash) return;

    // New place parent object
    let parent;
    // Getting parent hash
    const parentHash = hash.substring(0, hash.lastIndexOf(this.separator));
    // If parent is available
    if (parentHash) {
      // Getting parent type
      const parentType = this.hierarchy[parentHash.split(this.separator).length - 1];
      // Getting parent object
      parent = parentHash && this.store[parentType] && this.store[parentType][parentHash];

      // Creating new parent if not available yet
      if (!parent) {
        parent = this._createPlace(parentHash);
        // Emitting place event with parent
        this.emit('place', parent);
      }
    }

    // Getting place name
    const placeName = hash.substr(hash.lastIndexOf(this.separator) + this.separator.length);
    // Getting place type
    const placeType = this.hierarchy[hash.split(this.separator).length - 1];

    // Creating new place and adding it to store store
    const place = this.store[placeType][hash] = {
      id: Object.keys(this.store[placeType]).length + 1,
      name: placeName,
      type: placeType,
      parentId: (parent || {}).id
    };

    // Returning new place object
    return place;
  }

  _getTagValue(tags, key) {
    const tag = tags.find(tag => (tag.$ || {}).k === key);
    return tag && tag.$ && tag.$.v;
  }

  _createHash(...names) {
    return names.join(this.separator);
  }
}

module.exports = OsmPlacesParser;
