/*jshint esversion: 6 */
var filter;

var geojson = featureCollection([]);
var FIPS = [];
var tags = [];
var baseFilter = ['in', 'FIPS'];
var byColor;

var paletteColors = [
  '#ffffcc',
  '#a1dab4',
  '#41b6c4',
  '#2c7fb8',
  '#253494',
  '#fed976',
  '#feb24c',
  '#fd8d3c',
  '#f03b20',
  '#bd0026'
];

var currentColor = paletteColors[0];

// Mapbox map
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [-98, 38.88],
  minZoom: 2,
  zoom: 3
});

console.log('map inited')

var overlay = document.getElementById('map-overlay');

// Create a popup, but don't add it to the map yet.
var popup = new mapboxgl.Popup({
  closeButton: false
});

console.log('bind on map load')

map.on('load', function() {
  console.log('loading map')
  // Add the source to query. In this example we're using
  // county polygons uploaded as vector tiles
  //map.addSource('counties', {
  //  "type": "vector",
  //  "url": "mapbox://mapbox.82pkq93d"
  //});

  map.addSource('us-counties', {
    "type": "geojson",
    "data": "county-cases.json"
  });


  map.addLayer({
    "id": "us-counties",
    "type": "fill",
    "source": "us-counties",
    "paint": {
      "fill-outline-color": "rgba(500,500,500,0.6)",
      "fill-color":
        [
          'interpolate',
          ['linear'],
          ['get', 'cases'],
          0, '#eeeeee',
          1, '#fed976',
          10, '#feb24c',
          100, '#fd8d3c',
          1000, '#f03b20',
          10000, '#bd0026'
        ],
      "fill-opacity": 0.6
    },
    //"filter": [
    //  "in",
    //  "GEO_ID",
    //  "0500000US06085",
    //  "0500000US36081",
    //  "0500000US36005"
    //]
  }, 'place-city-sm')

  //map.addLayer({
  //  "id": "counties",
  //  "type": "fill",
  //  "source": "counties",
  //  "source-layer": "original",
  //  "paint": {
  //    "fill-outline-color": "rgba(0,0,0,0.1)",
  //    "fill-color": "rgba(0,0,0,0.1)"
  //  }
  //}, 'place-city-sm'); // Place polygon under these labels.

  //paletteColors.forEach(function(color) {
  //  lay = addLayer(color);
  //  map.addLayer(lay, 'place-city-sm'); // Place polygon under these labels.)
  //});

  //map.addLayer({
  //  "id": "corona",
  //  "type": "fill",
  //  "source": "counties",
  //  "source-layer": "original",
  //  "paint": {
  //    "fill-outline-color": "#888888",
  //    "fill-color": "#ffffcc",
  //    "fill-opacity": 0.75
  //  },
  //  "filter": [
  //    "in",
  //    "COUNTY",
  //    ""
  //  ]
  //})

  // corona();

  map.on('mousemove', function(e) {
    var features = map.queryRenderedFeatures(e.point, {
      layers: ['us-counties']
    });
    console.log(features)

    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = features.length ? 'pointer' : '';

    // Remove things if no feature was found.
    if (!features.length) {
      popup.remove();
      // map.setFilter('counties-highlighted', ['in', 'COUNTY', '']);
      // overlay.style.display = 'none';
      return;
    }

    // Single out the first found feature on mouseove.
    var feature = features[0];

    // Query the counties layer visible in the map. Use the filter
    // param to only collect results that share the same county name.
    var relatedFeatures = map.querySourceFeatures('counties', {
      sourceLayer: 'original',
      filter: ['in', 'COUNTY', feature.properties.COUNTY]
    });

    // TODO update tags here
    // Render found features in an overlay.
    // overlay.innerHTML = '';

    //     var title = document.createElement('strong');
    //     title.textContent = feature.properties.COUNTY;

    //     overlay.appendChild(title);
    //     overlay.style.display = 'block';

    // Add features that share the same county name to the highlighted layer.
    // map.setFilter('counties-highlighted', ['==', 'COUNTY', feature.properties.COUNTY]);

    // Display a popup with the name of the county
    console.log('feature!')
    console.log(feature)
    fips = feature.properties.FIPS
    if (typeof(fips) == 'number') {
        console.log('is number')
        fips = '' + fips
        console.log(fips)
    }
    console.log(fips)
    var title = feature.properties.NAME
    console.log('title: ' + title)
    if (fips == 36085 ||
        fips == 36047 ||
        fips == 36081 ||
        fips == 36005 ||
        fips == 36061) {
        title = 'New York City'
    }
    popup.setLngLat(e.lngLat)
      .setHTML(title + ' : ' + feature.properties.cases + feature.properties.trend)
      .addTo(map);
  });

});

function setPaintColors(geoJsonObject) {

  byColor = getFIPSByColor(geoJsonObject);

  // Special case when trying to remove the 'last' county
  if (byColor.length == 0) {
    filter = baseFilter;
    filter = filter.concat('[ ]');
    map.setFilter(layer, filter);
    return;
  }

  byColor.forEach(function(colorRow) {
    color = colorRow.color;
    rawCurrentColor = rawColorValue(color);
    layer = 'counties-highlighted-' + rawCurrentColor;

    filter = baseFilter;
    filter = filter.concat(colorRow.FIPS);

    map.setFilter(layer, filter);
    map.setPaintProperty(layer, 'fill-color', color);
  });
}

// GeoJson objects

// main geojson key
function featureCollection(f) {
  return {
    type: 'FeatureCollection',
    features: f
  };
}

// generate a geojson feature
function feature(geom) {
  return {
    type: 'Feature',
    geometry: geom,
    properties: properties()
  };
}

//  expects [longitude, latitude]
function point(coordinates) {
  return {
    type: 'Point',
    coordinates: coordinates
  };
}

// fill in the properites keys/values here
function properties() {
  return {
    "fill-color": "#ff0000",
    "tags": "",
    "FIPS": null,
    "name": ""
  };
}

function updateGeojson(geoJsonObject, feature) {

  // TODO check if feature already exists by comparing county FIPS list
  var features = geoJsonObject.features;
  fips = getFIPS(geoJsonObject);

  // See if the new county (FIPS number) is already in our database
  fipsIndex = fips.indexOf(feature.properties.FIPS);

  if (fipsIndex == -1) { // check if does not exist
    features.push(feature);
  } else {
    filtered = geoJsonObject.features.filter(function removeFIPS(value) {
      return value.properties.FIPS != feature.properties.FIPS;
    });

    features = filtered;
  }

  return featureCollection(features);
}

function getFIPS(geoJsonObject) {
  let filter = ['in', 'FIPS'];

  if (geoJsonObject.features.length == 0) {
    return filter;
  }

  for (let f of geoJsonObject.features) {
    filter.push(f.properties.FIPS);
  }

  return filter;
}

function getFIPSByColor(geoJsonObject) {

  value = [];
  colors = [];

  // first create an array, pushing only unique colors
  for (var f of geoJsonObject.features) {
    fillColor = f.properties['fill-color'];

    // add only unique colors to this array
    if (colors.indexOf(fillColor) == -1) {
      colors.push(fillColor);
    }
  }

  // now iterate overall features, again, to add FIPS
  for (var c of colors) {
    uniqueFips = [];

    for (var ff of geoJsonObject.features) {
      fillColor = ff.properties['fill-color'];
      FIPS = ff.properties.FIPS;

      if (c == fillColor) {
        // color exists, so push only the FIPS value
        uniqueFips.push(FIPS);
      }
    }

    colorFIPS = {
      color: '#123456',
      FIPS: []
    };

    colorFIPS.color = c;
    colorFIPS.FIPS = uniqueFips;

    value.push(colorFIPS);
  }

  return value;
}

function findByColor(colors, findColor) {
  for (var c of colors) {
    if (findColor == c.color) {
      return c.FIPS;
      break;
    }
  }
}

function getFips() {
  // set the colors based on the data
  byColor = getFIPSByColor(geojson);

  fips = findByColor(byColor, currentColor);

  filter = baseFilter;
  filter = filter.concat(fips);

  return fips;
}

////
/// color picker
////

//var swatches = document.getElementById('swatches');
//// var layer = document.getElementById('layer');
//
//paletteColors.forEach(function(color) {
//
//  var swatch = document.createElement('button');
//  swatch.style.backgroundColor = color;
//  swatch.addEventListener('click', function() {
//    currentColor = color;
//  });
//  swatches.appendChild(swatch);
//
//});

function rawColorValue(color) {
  // color looks like #123456
  //   strip off the '#'
  return color.split('#')[1];
}

function addLayer(color) {

  var colorValue = rawColorValue(color);

  var layer = {
    "id": "counties-highlighted-" + colorValue,
    "type": "fill",
    "source": "counties",
    "source-layer": "original",
    "paint": {
      "fill-outline-color": "#888888",
      "fill-color": color,
      "fill-opacity": 0.75
    },
    "filter": [
      "in",
      "COUNTY",
      ""
    ]
  };

  return layer;
}

// jQuery
$(function() {
  $('input').on('change', function(event) {

    var $element = $(event.target);
    var $container = $element.closest('.example');

    if (!$element.data('tagsinput'))
      return;

    var val = $element.val();
    if (val === null)
      val = "null";
    var items = $element.tagsinput('items');

  }).trigger('change');
});

var Colors = [
  'ffffcc',
  'a1dab4',
  '41b6c4',
  '2c7fb8',
  '253494',
  'fed976',
  'feb24c',
  'fd8d3c',
  'f03b20',
  'bd0026'
];

var CoronaColors = [
  'fed976',
  'feb24c',
  'fd8d3c',
  'f03b20',
  'bd0026'
];

// Hack for the fact that feature FIPS are sometimes int sometimes string.
function numberList(fips) {
    result = []
    for (var f of fips) {
        result.push(parseInt(f, 10))
    }
    return result
}

function setColors(fips, c) {
    //var layer = 'counties-highlighted-' + c;

    filter = baseFilter;
    filter = filter.concat([fips]);
    filter = filter.concat(numberList([fips]));

    // map.setFilter(layer, filter);
    map.addLayer({
      "id": fips,
      "type": "fill",
      "source": "counties",
      "source-layer": "original",
      "paint": {
        "fill-outline-color": "#888888",
        "fill-color": "#" + c,
        "fill-opacity": 0.75
      },
      "filter": filter
    })
      //map.setPaintProperty(layer, 'fill-color', '#' + c);
}

function clear() {
  for (var c of Colors) {
    setColors([], c)
  }
}

function paint() {
  console.log('paint')
  for (var i in CountyColor) {
      for (var fips of CountyColor[i]) {
            console.log('paint: ' + fips)
            setColors(fips, CoronaColors[i])
      }
  }
}


function corona() {
  console.log('corona!')
  clear()
  paint()
}
