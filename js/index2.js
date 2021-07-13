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
});

// Add the geocoder to the map
map.addControl(geocoder);
map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

var directions = new MapboxDirections({
    accessToken: mapboxgl.accessToken,
});

// map.addSource('single-point', {
//     'type': 'geojson',
//     'data': data
// });


let lists = document.getElementById('listings')
map.on('load', () => {


    geocoder.on('result', (e) => {

       
        let id = e.result.id
        let name = e.result.place_name
        let coords = e.result.geometry.coordinates


        let input = document.createElement('input')
        input.innerText = name
        input.id = `${id}`
        input.value = name
        input.name = coords

        lists.appendChild(input)

    })


})



function getCoordianate() {
  
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

    map.addSource('points', {
        'type': 'geojson',
        'data': data
    });

    map.addLayer({
        'id': 'routes',
        'type': 'circle',
        'source': 'points',
    });

    let existRoute = map.getSource('points')._data.features.map((a) => {
        return [a.geometry.coordinates]
    })
    map.on('load', function () {
        for (let i = 0; i < existRoute.length; i++) {
            if (i + 1 !== existRoute.length) {
                let first = existRoute[i][0].map(a => { return parseFloat(a) })
                let second = existRoute[i + 1][0].map(a => { return parseFloat(a) })
            console.log(first)
            console.log(second)
                directions.setOrigin(first); // On load, set the origin to "Toronto, Ontario".
                directions.setDestination(second); // On load, set the destination to "Montreal, Quebec".

            }
        }

    })
}
