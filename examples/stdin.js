const OsmPlacesParser = require('../lib/OsmPlacesParser');

const parser = new OsmPlacesParser(process.stdin, ['province', 'county', 'municipality', 'place']);
parser.on('place', place => {
  console.log('place', place);
});
