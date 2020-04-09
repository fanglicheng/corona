/*jshint esversion: 6 */
var legend = true;

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [-98, 38.88],
  minZoom: 2,
  zoom: 3
});

var overlay = document.getElementById('map-overlay');

var popup = new mapboxgl.Popup({
  // closeButton: false
});

map.on('load', function() {
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
          0, '#99ee99',
          1, '#fed976',
          10, '#feb24c',
          100, '#fd8d3c',
          1000, '#f03b20',
          10000, '#bd0026'
        ],
      "fill-opacity": 0.6
    },
  }, 'place-city-sm')

  map.addLayer({
    "id": "us-counties-inc",
    "type": "fill",
    "source": "us-counties",
    "paint": {
      "fill-outline-color": "rgba(500,500,500,0.6)",
      "fill-color":
        [
          'interpolate',
          ['linear'],
          ['get', 'increase'],
          0, '#99ee99',
          5, '#fed976',
          10, '#feb24c',
          15, '#fd8d3c',
          20, '#f03b20',
          25, '#bd0026'
        ],
      "fill-opacity": 0.6
    },
    "filter": [
      "in",
      "GEO_ID",
    ]
  }, 'place-city-sm')

  map.on('click', function(e) {
    var features = map.queryRenderedFeatures(e.point, {
      layers: ['us-counties', 'us-counties-inc']
    });

    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = features.length ? 'pointer' : '';

    if (!features.length) {
      popup.remove();
      return;
    }

    var feature = features[0];

    fips = feature.properties.GEO_ID.slice(-5)
    var title = feature.properties.NAME
    if (fips == "36085" ||
        fips == "36047" ||
        fips == "36081" ||
        fips == "36005" ||
        fips == "36061") {
        title = 'New York City'
    }
    popup.setLngLat(e.lngLat)
      .setHTML(
          title +
          ' : ' +
          feature.properties.cases +
          '<br>Avg gain in last 3 days: ' + 
          feature.properties.increase.toFixed(0) + '%' +
          feature.properties.trend)
      .addTo(map);
  });

});

$("#color-case").click(function() {
    map.setFilter('us-counties');
    map.setFilter('us-counties-inc', ['in', 'GEO_ID']);
})

$("#color-inc").click(function() {
    map.setFilter('us-counties', ['in', 'GEO_ID']);
    map.setFilter('us-counties-inc');
})

$("#toggle").click(function() {
    $("#legend").toggle()
    if (legend) {
        legend = false
        $("#legend-box").css("padding-right", "5px")
        $("#toggle").text("+")
    } else {
        legend = true
        $("#toggle").text("x")
        $("#legend-box").css("padding-right", "0px")
    }
    
})
