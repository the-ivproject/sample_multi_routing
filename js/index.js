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

});

let geocoder2 = new MapboxGeocoder({ // Initialize the geocoder
    accessToken: mapbox_token, // Set the access token

});

// Get the geocoder results container.
var results = document.getElementById('result');

// Add geocoder result to container.
geocoder.on('result', function (e) {
    results.innerText = JSON.stringify(e.result);

});

geocoder.on('clear', function () {
    results.innerText = '';
});

let directions = new MapboxDirections({
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

let i = 0;
let x = []
let marker = new mapboxgl.Marker()
function addInput() {

    let li = document.createElement('li')
    li.className = 'list-itn'

    let pre = document.createElement('pre')
    pre.id = `res${+i}`
    pre.style.display = 'none'

    let p = document.createElement('p')
    p.className = 'place-name'

    let a = document.createElement('a')
    a.className = 'xy'

    let btn = document.createElement('button')
    btn.innerText = 'remove'

    let input = document.createElement('div')
    input.id = `itn${+i}`
    input.style.padding = '10px'

    li.appendChild(input)
    li.appendChild(p)
    li.appendChild(a)
    li.appendChild(pre)

    ol.appendChild(li)
    lists.appendChild(ol)

    let g = new MapboxGeocoder({
        accessToken: mapbox_token, // Set the access token
        mapboxgl: mapboxgl, // Set the mapbox-gl instance
        placeholder: null,
    })

    g.addTo(input)
    g.on('result', function (e) {

        pre.innerText = JSON.stringify(e.result);
        p.innerText = e.result.place_name
        a.innerText = e.result.geometry.coordinates.map(a => a.toFixed(3)).join(" , ")

        x.push(e.result.geometry.coordinates)

        marker.setLngLat(e.result.geometry.coordinates).addTo(map)
        map.flyTo({
            center: e.result.geometry.coordinates,
            essential: true
        })
        
    });

    g.on('clear', function (e) {
        pre.innerText = ''
    })
    
}

function getRoutes() {

    let distText = document.getElementById('distance')
    let L = lists.querySelectorAll("pre")

    if(L.length < 2) {
        alert('Need at least 2 inputs')
    } else {

        let data = {
            "type": "FeatureCollection",
            "features": []
        }
    
        L.forEach((b) => {
            let parseObj = JSON.parse(b.innerText)
            console.log(parseObj.geometry.coordinates)
            data.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": parseObj.geometry.coordinates
                },
                "properties": {
                    "name": parseObj.place_name
                }
            })
        })
    
        let fetList = data.features
    
        let existRoute = fetList.map((a) => {
            return [a.geometry.coordinates]
        })
        
        let distance = []

        for (let i = 0; i < existRoute.length; i++) {
            if (i + 1 !== existRoute.length) {
                // geojson&overview=full&access_token=
                let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${existRoute[i]};${existRoute[i + 1]}?steps=true&geometries=geojson&overview=full&access_token=${mapbox_token}`
               
                let id = `${fetList[i].properties.name}${i}`
          
                $.get(url, (data) => {

                    distance.push(data.routes[0].distance)
                   
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
                            'line-width': 3,
                        },
                    })
                    let sum = distance.map((a)=>{
                        let km = a / 1000
                        return parseFloat(km.toFixed(2))
                    }).reduce((a, b)=>{
                        return a + b
                    })
               
                    distText.innerText = `${sum} of kilometers`

                }).fail(function() {
                    alert("Route not found or the distance exceeds the limit (10.000 km)");
                })
              
            }
        }

        let disInput = document.querySelectorAll('.list-itn div')
       
        for(let i = 0; i < disInput.length; i++) {
            disInput[i].style.display = 'none'
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
}



