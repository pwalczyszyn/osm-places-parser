const fs = require('fs');
const XmlStream = require('xml-stream');

// Creating stream parser
const xml = new XmlStream(fs.createReadStream('input.osm.xml'));

// hash separator
const separator = '::';
// hierarchy based on Poland OSM cities
// @see http://download.geofabrik.de/europe/poland-latest.osm.pbf
const hierarchy = ['province', 'county', 'municipality', 'place'];
// Store grouped by location type
const store = hierarchy.reduce((result, type) => {
  result[type] = {};
  return result;
}, {});

function createLocation(hash) {
  // no hash no location
  if (!hash) return;

  // New location parent object
  let parent;
  // Getting parent hash
  const parentHash = hash.substring(0, hash.lastIndexOf(separator));
  // If parent is available
  if (parentHash) {
    // Getting parent type
    const parentType = hierarchy[parentHash.split(separator).length - 1];
    // Getting parent object
    parent = parentHash && store[parentType] && store[parentType][parentHash] || createLocation(parentHash);
  }

  // Getting location name
  const locationName = hash.substr(hash.lastIndexOf(separator) + separator.length);
  // Getting location type
  const locationType = hierarchy[hash.split(separator).length - 1];

  // Creating new location and adding it to store store
  const location = store[locationType][hash] = {
    id: Object.keys(store[locationType]).length + 1,
    name: locationName,
    parentId: (parent || {}).id
  };

  // Returning new location object
  return location;
}

function getTagValue(tags, key) {
  const tag = tags.find(tag => (tag.$ || {}).k === key);
  return tag && tag.$ && tag.$.v;
}

function createHash(...names) {
  return names.join(separator);
}

let i = 1;
xml.preserve('node', true);
xml.collect('tag');
xml.on('endElement: node', node => {

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

  const placeName = getTagValue(node.tag, 'name');
  // is_in:province - wojewodztwo
  const province = getTagValue(node.tag, 'is_in:province');
  // is_in:county - powiat
  const county = getTagValue(node.tag, 'is_in:county');
  // is_in:municipality - gmina
  const municipality = getTagValue(node.tag, 'is_in:municipality');

  // Creating location hash
  const locationHash = createHash(province, county, municipality, placeName);

  console.log(i, locationHash);

  // Creating new location object
  const location = createLocation(locationHash);

  location.uid = node.$.uid;
  location.lat = node.$.lat;
  location.lon = node.$.lon;

  // id: '24978475',
  //    version: '10',
  //    timestamp: '2015-01-28T16:54:52Z',
  //    uid: '2587831',
  //    user: 'rogal-imports',
  //    changeset: '28469502',
  //    lat: '54.1842463',
  //    lon: '18.1690156'
  //

  i++;
});

xml.on('endElement: osm', () => {
  console.log('created', Object.keys(store[place]).length, 'locations');
});
