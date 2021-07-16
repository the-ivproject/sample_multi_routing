const mapbox_token = 'pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuOWltYzJyeGMycW1jNDVlbDQwejQifQ.97Y2eucdbVp1F2Ow8EHgBQ';

mapboxgl.accessToken = mapbox_token

let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ivproject/ckr65sxbr12ci17m5lqeswh81',
    center: [-96, 37.8],
    zoom: 2
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

let results = document.getElementById('result');

let lists = document.getElementById('listings')

let ol = document.createElement('ol')
ol.className = 'numbered'

// Increament variable for unique id
let i = 0;
let x = []
let geocodermarker = new mapboxgl.Marker()

// Show/hide the points
function ShowHidePoint() {
    let check = document.getElementById("checkpoint")
    let classPopup = document.querySelectorAll('.point-label')
    let marker = document.querySelectorAll(".marker")

    if (check.checked == false) {
        marker.forEach((marker, i) => {
            marker.style.visibility = 'hidden'
        })
        classPopup.forEach((classPopup, i) => {
            classPopup.style.visibility = 'hidden'
        })
    } else {
        marker.forEach((marker, i) => {
            marker.style.visibility = 'visible'
        })
        classPopup.forEach((classPopup, i) => {
            classPopup.style.visibility = 'visible'
        })
    }
}

// Create address input
function addInput(TotalLayer) {

    let TotalDefLayer = TotalLayer

    let li = document.createElement('li')
    li.className = 'list-itn'
    li.id = `step${+i}`

    let pre = document.createElement('pre')
    pre.id = `res${+i}`
    pre.style.display = 'none'

    let p = document.createElement('p')
    p.className = 'place-name'

    let a = document.createElement('a')
    a.className = 'xy'

    let btn = document.createElement('button')
    btn.innerText = 'X'
    btn.className = 'btn-remove'
    btn.id = `btn${++i}`
    btn.onclick = function () {

        let classPopup = document.querySelectorAll('.point-label')

        let L = lists.querySelectorAll("pre")

        if (L.length <= 2) {
            alert('Need at least 2 inputs')
        } else {
            classPopup.forEach(a => {
                a.remove()
            })

            let index = $(this).parent('li').index()

            let id = parseInt(index)

            ol.removeChild(ol.childNodes[id]);

            let removeMarker = document.querySelectorAll(`#marker${index}`)

            if (removeMarker.length === 1) {
                removeMarker[0].remove()
            } else {
                removeMarker.forEach(marker => {
                    marker.remove()
                })
            }

            let defLayer = map.getStyle().layers.slice(TotalDefLayer.slice(-1)[0], this.length)

            defLayer.forEach(element => {
                map.removeLayer(element.id)
            });

            getRoutes()
            setDefStyle()
        }
    }

    let input = document.createElement('div')
    input.id = `itn${+i}`
    input.style.padding = '10px'

    li.appendChild(input)
    li.appendChild(p)
    li.appendChild(a)
    li.appendChild(btn)
    li.appendChild(pre)

    ol.appendChild(li)
    lists.appendChild(ol)

    let geocoder = new MapboxGeocoder({
        accessToken: mapbox_token,
        mapboxgl: mapboxgl,
        placeholder: null,
    })

    geocoder.addTo(input)
    geocoder.on('result', function (e) {

        pre.innerText = JSON.stringify(e.result);
        p.innerText = e.result.text
        a.innerText = e.result.geometry.coordinates.map(a => a.toFixed(3)).join(" , ")

        x.push(e.result.geometry.coordinates)

        geocodermarker.setLngLat(e.result.geometry.coordinates).addTo(map)
        map.flyTo({
            center: e.result.geometry.coordinates,
            essential: true
        })
    });

    geocoder.on('clear', function (e) {
        pre.innerText = ''
    })
}

// Get input coordinates
let GetCoordinate = listCoordinate => {
    let data = {
        "type": "FeatureCollection",
        "features": []
    }

    listCoordinate.forEach((b) => {
        let parseObj = JSON.parse(b.innerText)
        data.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": parseObj.geometry.coordinates
            },
            "properties": {
                "name": parseObj.text
            }
        })
    })

    return data

}

let defTotalLayer;

let getRoutes = () => {
    
    let distText = document.getElementById('distance')
    let L = lists.querySelectorAll("pre")

    if (L.length < 2) {
        console.log('Need at least 2 inputs')
    } else {
        let input = document.getElementById("checkpoint")
        input.checked = true
        input.disabled = false
        let distance = []
        let geojsonMarker = GetCoordinate(L)

        let fetList = geojsonMarker.features

        let points = fetList.map((a) => {
            return [a.geometry.coordinates]
        })

        for (let i = 0; i < points.length; i++) {
            if (i + 1 !== points.length) {

                let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${points[i]};${points[i + 1]}?steps=true&geometries=geojson&overview=full&access_token=${mapbox_token}`

                $.get(url, (data) => {

                    if (data.routes.length === 0) {
                        // Use turf curve line if route unvailable
                        let start = turf.point(points[i][0])
                        let end = turf.point(points[i + 1][0])

                        let curvedLine = turf.greatCircle(start, end)

                        map.addLayer({
                            id: `routecustom${new Date().getMilliseconds()}`,
                            type: 'line',
                            source: {
                                type: 'geojson',
                                data: curvedLine,
                            },
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                            },
                            paint: {
                                'line-color': '#ff7e5f',
                                "line-width": {
                                    'base': 1.5,
                                    'stops': [
                                        [14, 5],
                                        [18, 20],
                                    ],
                                },
                                "line-dasharray": [0.1, 1.8]
                            },
                        })

                        // Calculate length of turf curve line in meters 
                        let length = turf.length(curvedLine, {
                            units: 'meters'
                        });

                        // Push result to distance variable
                        distance.push(length)

                    } else {
                        map.addLayer({
                            id: `route${new Date().getMilliseconds()}`,
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
                                "line-width": {
                                    'base': 1.5,
                                    'stops': [
                                        [14, 5],
                                        [18, 20],
                                    ],
                                },
                                "line-dasharray": [0.1, 1.8]
                            },
                        })

                        // Push default distance property from mapbox direction result
                        distance.push(data.routes[0].distance)

                    }

                    let totalLength = SumLength(distance)

                    // Push total length to side bar
                    distText.innerText = `${totalLength} of kilometers`

                    defaultLayer = defTotalLayer

                    let lineCollection = map.getStyle().layers.slice(defaultLayer.length)
                
                    let color = document.getElementById("change-color")

                    color.addEventListener('change', (val) => {
                        let color = val.srcElement.value
                        lineCollection.forEach(line => {
                            map.setPaintProperty(line.id, 'line-color', color);
                        })
                    })
                }).fail(function () {
                    alert("The distance exceeds the limit (10.000 km)");
                })
            }
        }

        // Hide the geocoder form
        let disInput = document.querySelectorAll('.list-itn div')

        for (let i = 0; i < disInput.length; i++) {
            disInput[i].style.display = 'none'
        }

        // Remove geocoder marker
        geocodermarker.remove()

        // Function to add markers and its label
        addCustomMarker(geojsonMarker)

        // Fit map to points function
        fitBounds(geojsonMarker)

    }
}

let SumLength = distancelist => {
    let sum = distancelist.map((a) => {
        let km = a / 1000
        return parseFloat(km.toFixed(0))
    }).reduce((a, b) => {
        return a + b
    })

    return sum
}

// Add custom marker to the map including its label
let addCustomMarker = markers => {
    markers.features.forEach(function (marker, i) {
        // create a HTML element for each feature
        let el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = '<span><b>' + (i + 1) + '</b></span>'
        el.id = `marker${i}`
        // make a marker for each feature and add it to the map
        new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .addTo(map);

        el.addEventListener('click', () => {
            map.flyTo({
                center: marker.geometry.coordinates,
                zoom: 13,
            });
        })

        let popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
        })

        popup.setLngLat(marker.geometry.coordinates).setHTML(`<h3 class="point-label">${marker.properties.name}</h3>`).addTo(map);
        
        let val = document.getElementById('basemap')
        
        changeToWhite(val)
    });
}

let fitBounds = marker => {
    let bbox = turf.bbox(marker);
    map.fitBounds(bbox, {
        padding: 70,
    })
}

let RemoveStep = (totalLayer) => {
    let classPopup = document.querySelectorAll('.point-label')
    let L = lists.querySelectorAll("pre")

    if (L.length <= 2) {
        alert('Need at least 2 inputs')
    } else {
        classPopup.forEach(a => {
            a.remove()
        })
        let index = $(this).parent('li').index()
        let id = parseInt(index)

        ol.removeChild(ol.childNodes[id]);

        let removeMarker = document.querySelectorAll(`#marker${index}`)

        if (removeMarker.length === 1) {
            removeMarker[0].remove()
        } else {
            removeMarker.forEach(marker => {
                marker.remove()
            })
        }

        let defLayer = map.getStyle().layers.slice(totalLayer.slice(-1)[0], this.length)

        defLayer.forEach(element => {
            map.removeLayer(element.id)
        });

        getRoutes()
        
        let val = document.getElementById('basemap')
        
        changeToWhite(val)
    }
}

map.on('style.load', function () {

    defTotalLayer = map.getStyle().layers

})
map.on('load', () => {

    let btnGetRoute = document.getElementById('getRoutes')

    btnGetRoute.addEventListener('click', getRoutes)

    let totalLayers = map.getStyle().layers

    let addInputBtn = document.getElementById('addInput')

    addInputBtn.addEventListener('click', () => {
        addInput(totalLayers)
    })

    document.getElementById('basemaps').addEventListener('change', function () {

        map.setStyle(`mapbox://styles/ivproject/${this.value}`)

        getRoutes()
        
        changeToWhite(this)
        
        let color = document.getElementById("change-color")

        color.addEventListener('change', (val) => {
            let newcol = val.srcElement.value
            defTotalLayer = defTotalLayer
            let refreshDefLayer = map.getStyle().layers

            let sliceLayer = refreshDefLayer.slice(defTotalLayer.length, refreshDefLayer.length)

            sliceLayer.forEach(line => {
                map.setPaintProperty(line.id, 'line-color', newcol);
            })
        })
    });
})

let setDefStyle = () => {
    let existBasemapValue = document.getElementById('basemaps').value
    map.setStyle(`mapbox://styles/ivproject/${existBasemapValue}`)
}

let changeToWhite = (bVale) => {
    if (bVale.value === "ckr6t9kkq0ygv18qi5sazmai1") {
    let label = document.querySelectorAll(".point-label")
    label.forEach(label => {
        label.style.color = "white"
    })
}
}
