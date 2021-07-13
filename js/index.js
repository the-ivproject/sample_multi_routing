// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
const mapbox_token = 'pk.eyJ1Ijoibm92dXMxMDIwIiwiYSI6ImNrcGltcnp0MzBmNzUybnFlbjlzb2R6cXEifQ.GjmiO9cPjoIozKaG7nJ4qA';

mapboxgl.accessToken = mapbox_token

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-96, 37.8],
    zoom: 2
});

// geocoder/searchbar
let geocoder = new MapboxGeocoder({ // Initialize the geocoder
    accessToken: mapbox_token, // Set the access token
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
    placeholder: null
});

// Add the geocoder to the map
map.addControl(geocoder);
map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

var directions = new MapboxDirections({
    accessToken: mapboxgl.accessToken,
    unit: "metric",
    profile: "mapbox/driving",
    alternatives: false,
    geometries: "geojson",
    controls: { input: false, instructions: false },
    flyTo: false
});


let lists = document.getElementById('listings')
let ol = document.createElement('ol')
ol.className = 'numbered'

map.on('load', () => {
  
    geocoder.on('result', (e) => {

        let id = e.result.id
        let name = e.result.place_name
        let coords = e.result.geometry.coordinates

      
        let li = document.createElement('li')   

        let input = document.createElement('input')
        input.innerText = name
        input.id = `${id}`
        input.value = name
        input.name = coords

        li.appendChild(input)
        ol.appendChild(li)
        lists.appendChild(ol)
    })
 
})


function getRoutes() {
   
    let L = lists.querySelectorAll("input")

    let data = {
        "type": "FeatureCollection",
        "features": []
    }

    L.forEach((b) => {
        data.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": b.name.split(",")
            },
            "properties": {
                "name": b.value
            }
        })
    })

    let fetList =  data.features

    let existRoute =fetList.map((a) => {
        return [a.geometry.coordinates]
    })

    for (let i = 0; i < existRoute.length; i++) {
        if (i + 1 !== existRoute.length) {

            let url = `https://api.mapbox.com/directions/v5/mapbox/cycling/${existRoute[i]};${existRoute[i + 1]}?steps=true&geometries=geojson&access_token=${mapbox_token}`

            let id = `${fetList[i].properties.name}${i}`
            console.log(id)
            $.get(url, data => {
                
                map.addLayer({
                    id: id,
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: data.routes[0].geometry,
                        },
                    },
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#ff7e5f',
                        'line-width': 5,
                    },
                })
                console.log(map.getStyle().layers)
            })
        }
    }

    // add markers to map
    data.features.forEach(function (marker, i) {
        // create a HTML element for each feature
        var el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = '<span><b>' + (i + 1) + '</b></span>'

        // make a marker for each feature and add it to the map
        new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .setPopup(new mapboxgl.Popup({
                offset: 25
            }) // add popups
                .setHTML('<h3>' + marker.properties.title + '</h3><p>' + marker.properties.description + '</p>'))
            .addTo(map);
    });
}



