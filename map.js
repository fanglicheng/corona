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

var countyHistory = {}
var geojson = undefined
var dates = undefined

var ny = {'36085': 'Richmond',
          '36047': 'Kings',
          '36081': 'Queens',
          '36005': 'Bronx',
          '36061': 'New York'}

var ny_fips = 'nyfips'

function* maybe_ny(d_raw) {
  if (d_raw.county == 'New York City') {
    d = {...d_raw}
    for (let [fips, name] of Object.entries(ny)) {
      d.county = name
      d.fips = fips
      yield d
    }
  } else {
    yield d_raw
  }
}

function pad(array, length) {
  while (array.length < length) {
    array.push(0)
  }
}

async function addDataToGeoJson() {
  for (var f of geojson.features) {
    if (f.type != 'Feature') {
      continue
    }
    var fips = f.properties.GEO_ID.slice(-5)
    var entries = countyHistory[fips] || []
    var daily_cases = f.properties.daily_cases = []
    var daily_avg_incs = f.properties.daily_avg_incs = []
    for (var e of entries) {
      daily_cases.push(e.cases)
      daily_avg_incs.push(e.avg_inc)
    }
    daily_cases.reverse()
    pad(daily_cases, dates.length)
    daily_avg_incs.reverse()
    pad(daily_avg_incs, dates.length)
  }
}

function calcIncs(entries, d) {
  if (entries.length == 0) {
    d.inc = 0
  } else {
    d.inc = d.cases/entries[entries.length - 1].cases - 1
  }
  if (entries.length < 3) {
    d.avg_inc = 0
  } else {
    d.avg_inc = (d.cases/entries[entries.length - 3].cases) ** (1/3) - 1
  }
}

var loadData = async function () {
  await d3.json("gz_2010_us_050_00_20m.json").then(function (d) {
    geojson = d;
  })
  await d3.dsv(",", "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv")
        .then(function (data) {
    let unique_dates = new Set()
    for (let d_raw of data) {
      for (let d of maybe_ny(d_raw)) {
        d.cases = parseInt(d.cases)
        entries = countyHistory[d.fips] || (countyHistory[d.fips] = [])
        calcIncs(entries, d)
        entries.push(d)
        unique_dates.add(d.date)
      }
    }
    dates = Array.from(unique_dates)
    dates.sort().reverse()
  });

  await addDataToGeoJson()
}

var caseColorRange = [
    0, 'rgba(200,255,200,0.6)',
    1, '#fed976',
    10, '#feb24c',
    100, '#fd8d3c',
    1000, '#f03b20',
    10000, '#bd0026']


var incColorRange = [
    0, 'rgba(200,255,200,0.6)',
    0.05, '#fed976',
    0.10, '#feb24c',
    0.15, '#fd8d3c',
    0.20, '#f03b20',
    0.25, '#bd0026']


function setSliderDate(i) {
  $("#slider").find(".ui-slider-handle").text(dates[i].slice(5));
}


function addSlider() {
  $("#slider").slider({
    orientation: "vertical",
    min: - (dates.length - 1),
    max: 0,
    slide: function (event, ui) {
      var i = Math.abs(ui.value)
      map.setPaintProperty('us-counties', 'fill-color',
        ['interpolate',
          ['linear'],
          ['at', i, ['get', 'daily_cases']]].concat(caseColorRange)
      )
      map.setPaintProperty('us-counties-inc', 'fill-color',
        ['interpolate',
          ['linear'],
          ['at', i, ['get', 'daily_avg_incs']]].concat(incColorRange)
      )
      setSliderDate(Math.abs(i))
    }
  })
  setSliderDate(0)
}

function formatEntries(entries) {
  var dummy = $("<div>")

  var container = $("<div>")
  container.css('max-height', '200px')
  container.css('overflow', 'auto')
  container.scrollTop(200)
  dummy.append(container)

  var table = $("<table>")
  table.css('width', '130px')
  container.append(table)

  for (var e of entries) {
    table.append($("<tr>").append([
      $("<td>").text(e.date.slice(5)),
      $("<td>").text(e.cases),
      $("<td>").text((e.inc * 100).toFixed(0) + '%')
    ]))
  }
  return `<br>${dummy.html()}`
}

map.on('load', async function() {
  await loadData()

  addSlider()

  map.addSource('us-counties', {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    "id": "us-counties",
    "type": "fill",
    "source": "us-counties",
    "paint": {
      "fill-outline-color": "rgba(500,500,500,0.6)",
      "fill-color":
        ['interpolate',
         ['linear'],
         ['at', 0, ['get', 'daily_cases']]].concat(caseColorRange),
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
        ['interpolate',
         ['linear'],
         ['at', 0, ['get', 'daily_avg_incs']]
        ].concat(incColorRange),
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
    if (fips in ny) {
        title = 'New York City'
    }
    var entries = countyHistory[fips] || []
    reversed_entries = entries.slice().reverse()
    var latest = reversed_entries[0] || {}
    popup.setLngLat(e.lngLat)
      .setHTML(
          `<b>${title}</b>` +
          '<br>Avg gain over last 3 days: ' + 
          ((latest.avg_inc || 0) * 100).toFixed(0) + '%' +
          formatEntries(reversed_entries)
          )
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
