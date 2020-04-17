/*jshint esversion: 6 */
var legend = true;

var countyHistory = {};
var data = {};

function getOffsetDateStr(date, offset) {
  base = new Date(date);
  base.setDate(base.getUTCDate() + offset);
  return strftime("%Y-%m-%d", base)

}

var loadData = async function () {
  await d3.json("gz_2010_us_050_00_20m.json").then(function (d) {
    data.json = d;
    console.log("loaded");
    console.log(data.json);
    console.log("--");
  })
  await d3.dsv(",", "us-counties.csv").then(function (data) {
    for (let i = 0; i < data.length; i++) {
      let d = data[i]
      county = {};
      if (!(d.date in countyHistory)) {
        countyHistory[d.date] = {};
        countyHistory[d.date].date = d.date;
      }
      if (!(d.fips in countyHistory[d.date]))
        countyHistory[d.date][d.fips] = county;

      county.cases = parseInt(d.cases);
      county.deaths = parseInt(d.deaths);
      county.county = d.county;
      county.state = d.state;
      county.date = d.date;
      // console.log("Loading date: " + d.date);
      if (i == 0) {
        county.incRate = 0;
        county.incRate3 = 0;
      }

      prevDateStr = getOffsetDateStr(d.date, -1);
      if (i < 100) {
        // console.log(d.date);
        // console.log(prevDate);
        // console.log(prevDateStr);
      }
      if (prevDateStr in countyHistory && d.fips in countyHistory[prevDateStr]) {
        prev = countyHistory[prevDateStr][d.fips];
        county.incRate = parseFloat(d.cases) / parseFloat(prev.cases) - 1.0;
        county.incRate = Number(county.incRate).toFixed(3)
      }

      prevDateStr = getOffsetDateStr(d.date, -6);
      if (prevDateStr in countyHistory && d.fips in countyHistory[prevDateStr]) {
        prev = countyHistory[prevDateStr][d.fips];
        county.incRate3 = (data[i].cases / prev.cases - 1.0) / 7.0;
        county.incRate3 = Number(county.incRate3).toFixed(3);
      }
      countyHistory[d.date][d.fips] = county;
      if (i == 10) {
        // console.log(countyHistory);
      }

    }
  });
}


var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9', // stylesheet location
  center: [-98, 38.88],
  minZoom: 2,
  bearing: 25.6,
  pitch: 90,

  zoom: 3
});


$(function () {

  var sliderChanged = function (e) {
    baseDate = "2020-02-02";

    console.log(base);

    val = parseInt($('#timeline-slider').slider("value"));
    prevDateStr = getOffsetDateStr(baseDate, val);

    console.log("Slider: " + prevDateStr)
    console.log(countyHistory[prevDateStr]);
    if (countyHistory[prevDateStr])
      updateIncLayer(countyHistory[prevDateStr], countyHistory)

  };
  sliderChanged.bind(this);
  const min = 1;
  const max = 100;
  $("#timeline-slider").slider({
    max: max,
    min: min,
    range: false,
    change: sliderChanged
  });
  $("#play-button").button();
  $("#play-button").click(function (e) {
    counter = min;
    console.log($("#timeline-slider"));
    $("#timeline-slider").off("change");
    $("#timeline-slider").on("change", function (e) {
      if (counter == max)
        return;
      counter++;
      console.log("Slider counter .. " + counter);
      setTimeout(function (e) {
        $("#timeline-slider").slider("value", counter).change();
      }, 250);
    })

    $("#timeline-slider").delay(1000).slider("value", counter + 1).change();


  });
  console.log("$$()")
});



var overlay = document.getElementById('map-overlay');

var popup = new mapboxgl.Popup({
  // closeButton: false
});


var HIGH_CASES = 1000;
var HIGH_INCRATE = 0.25;
var updateIncLayer = function (snapshot, history) {
  // Update all json increase data;
  console.log(snapshot);
  console.log(data.json);

  // highlights = [];
  for (i = 0; i < data.json["features"].length; i++) {

    f = data.json["features"][i]["properties"];
    if (data.json["features"][i].type !== "Feature") {
      continue;
    }

    fips = f.GEO_ID.slice(-5)

    if (fips in snapshot) {
      if (!snapshot[fips].incRate3) {
        f.increase = 0;
      } else {
        f.increase = snapshot[fips].incRate3 * 100;
      }

      

      f.cases = snapshot[fips].cases;
      f.deaths = snapshot[fips].deaths;

      if (f.cases >= HIGH_CASES || f.incRate3 >= HIGH_INCRATE)
        f.highlight = true;

      f.past = [];
      for (j = 0; j < 10; j++) {

        date = getOffsetDateStr(snapshot.date, -1 * j);

        if (!(date in history) || !(fips in history[date])) {
          break;
        }
        c = history[date][fips];
        c.date = date;
        f.past.push(c);
      }
      // console.log(f);
      // console.log("Set values for fips ..." + fips);
    } else {
      f.increase = 0;
      f.cases = 0;
      f.deaths = 0;
    }
  }
  map.getSource('us-counties-inc').setData(data.json);

  // map.removeLayer("us-counties-inc");
  // map.removeSource("us-counties-inc");

};

map.on('load', async function () {
  await loadData();
  map.addSource('us-counties-cases', {
    "type": "geojson",
    "data": "county-cases.json"
  });

  map.addSource('sf-lidar', {
    type: 'vector',
    url: 'mapbox://maning.sf-lidar'
  });


  map.addLayer({
    "id": "us-counties",
    "type": "fill",
    "source": "us-counties-cases",
    "paint": {
      "fill-outline-color": "rgba(500,500,500,0.6)",
      "fill-color": '#99ee99',

      "fill-opacity": 0.6
    },
  }, 'place-city-sm')



  caseColorMap = [
    'interpolate',
    ['linear'],
    ['get', 'cases'],
    0, '#ffffff',
    10, '#99ee99',
    500, '#fed976',
    2000, '#feb24c',
    5000, '#fd8d3c',
    20000, '#f03b20',

  ];


  map.addLayer({
    "id": "us-counties-cases",
    "type": "fill",
    "source": "us-counties-cases",
    "paint": {
      "fill-outline-color": "rgba(500,500,500,0.6)",
      "fill-color": caseColorMap,
      "fill-opacity": 0.6
    },
  }, 'place-city-sm')

  console.log(data.json);

  map.addSource('us-counties-inc', {
    "type": "geojson",
    "data": data.json
  });

  incColorMap = [
    'interpolate',
    ['linear'],
    ['get', 'increase'],
    0, '#a1e6e3',
    2, '#8ec6c5',
    6, '#ffd868',
    10, '#f8615a',
    20, '#b80d57',
    30, '#721b65',

  ];
  incHeightMap = [
    'interpolate',
    ['linear'],
    ['get', 'cases'],
    0, 0,
    2, 3000,
    5, 10000,
    10, 40000,
    25, 200000,
    50, 500000,
  ];


  map.addLayer({
    "id": "us-counties-inc",
    "type": "fill-extrusion",
    "source": "us-counties-inc",
    "paint": {
      // "fill-outline-color": "rgba(500,500,500,0.6)",
      'fill-extrusion-opacity': 0.6,
      "fill-extrusion-color": incColorMap
      ,
      
      'fill-extrusion-height':
        // 'interpolate',
        // ['linear'],
        ['*', ['get', 'cases'], 100],

      // 0, 0,
      // 100, 3000,
      // 500, 10000,
      // 2000, 40000,
      // 5000, 200000,
      // 20000, 500000

    },
    "filter": [
      "in",
      "GEO_ID",
    ]
  }, 'place-town')

  map.on('click', function (e) {

    var features = map.queryRenderedFeatures(e.point, {
      layers: [layerOn]
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
    past = "";
    pastDays = feature.properties.past;
    console.log("past days");
    console.log(pastDays);
    for (i = 0; i < pastDays.length; i++) {

      if (i > 0) {
        past += "<br>"
      }

      past += pastDays[i]["date"] + ": " + pastDays[i]["cases"];
    }
    // console.log(feature.properties);
    popup.setLngLat(e.lngLat)
      .setHTML(
        title +
        ' : ' +
        feature.properties.cases +
        '<br>Avg gain in last 3 days: ' +
        feature.properties.increase + '%'
      )
      .addTo(map);
  });



  console.log(map.style);
  // map.style.stylesheet.layers.forEach(function (layer) {
  //   if (layer.type === 'symbol') {
  //     map.removeLayer(layer.id);
  //   }
  // });

  // map.addLayer({
  //   "id": "country-label",
  //   "type": "symbol",
  // });
  labelProps = [
    'format',
    ['get', 'name_en'],
    { 'font-scale': 1.8 },
    '\n',
    {},
    ['get', 'name'],
    {
      'font-scale': 1.8,
      'text-font': [
        'literal',
        ['DIN Offc Pro Italic', 'Arial Unicode MS Regular']
      ]
    }
  ];

  sLayers = ['place-town','place-city-sm','place-city-md-s','place-city-md-n','place-city-sm']

  map.setLayoutProperty('place-town', 'text-field', labelProps);
  map.setLayoutProperty('place-city-sm', 'text-field', labelProps);
  map.setLayoutProperty('place-city-md-s', 'text-field', labelProps);
  map.setLayoutProperty('place-city-md-n', 'text-field', labelProps);
  map.setLayoutProperty('place-city-lg-s', 'text-field', labelProps);
  map.setLayoutProperty('place-city-lg-n', 'text-field', labelProps);
  

});

var layerOn = "us-counties-cases";

$("#color-case").click(function () {
  layerOn = "us-counties-cases";
  map.setFilter('us-counties-cases');
  map.setFilter('us-counties-inc', ['in', 'GEO_ID']);
})

$("#color-inc").click(function () {
  layerOn = "us-counties-inc";
  map.setFilter('us-counties-cases', ['in', 'GEO_ID']);
  map.setFilter('us-counties-inc');
})

$("#toggle").click(function () {
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
