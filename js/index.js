const template = {
    mapbox_username: 'ivproject',
    token: 'pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuMjZvajAzZDAyd3BibDJvNmJ4bjMifQ.5FpaSBhuOWEDm3m8PQp3Zg',
    custom_basemap_ids: {
        Ligth: 'ckr65sxbr12ci17m5lqeswh81',
        Dark: 'ckr6t9kkq0ygv18qi5sazmai1',
        Streets: 'ckr6t4e5j10wd18t2jw5vw3z5',
        Outdoor: 'ckr6szbj82plx17l285zjv04t'
    },
    map_container_id: 'map',
    map_center: [-96, 37.8],
    default_zoom: 2,
    zoom_control_pos: 'top-left',
    line_style: {
        'line-color': '#000',
        "line-width": {
            'base': 1.5,
            'stops': [
                [14, 5],
                [18, 20],
            ],
        },
        "line-dasharray": [0.1, 2]
    },
    zoom_onclick: 13,
    popup_prop: {
        closeButton: false,
        closeOnClick: false,
    }
}

const mapbox_token = template.token

mapboxgl.accessToken = template.token

const map = new mapboxgl.Map({
    container: template.map_container_id,
    // Set 'light' basemap as a default
    style: `mapbox://styles/${template.mapbox_username}/${template.custom_basemap_ids.Ligth}`,
    center: template.map_center,
    zoom: template.default_zoom
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl(), template.zoom_control_pos);

// push the basemap list to the select option 
let basemap_wrapper = document.getElementById('basemaps-wrapper')
let select = document.createElement('select')
select.id = 'basemaps'

for (let i in Object.keys(template.custom_basemap_ids)) {
    let option = document.createElement('option')
    option.value = Object.values(template.custom_basemap_ids)[i]
    option.innerHTML = Object.keys(template.custom_basemap_ids)[i]

    select.appendChild(option)
}

basemap_wrapper.appendChild(select)

// List of address result
let lists = document.getElementById('listings')

let ol = document.createElement('ol')
ol.className = 'numbered mx-0 my-3'

// Increament variable for unique id
let i = 0;

// Default geocoderr marker
let geocodermarker = new mapboxgl.Marker()

// Create address input
let addInput = (TotalLayer) => {

    let TotalDefLayer = TotalLayer

    let li = document.createElement('li')
    li.className = 'list-itn'
    li.id = `step${+i}`

    let pre = document.createElement('pre')
    pre.id = `res${+i}`
    pre.style.display = 'none'

    let p = document.createElement('p')
    p.className = 'place-name text-lg text-black font-bold'

    let a = document.createElement('a')
    a.className = 'xy text-sm text-black font-light block'

    let btn = document.createElement('button')
    btn.innerText = 'Remove'
    btn.className = 'btn-remove space-x-0 bg-red-500 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-xs my-2'
    btn.id = `btn${++i}`
    btn.onclick = function () {

        let classPopup = document.querySelectorAll('.point-label')

        let L = lists.querySelectorAll("pre")

        let confirm = document.getElementById("confirm-input")
        if (L.length < 2) {
            confirm.style.display = "block"
        } else {
            confirm.style.display = "none"
            
            classPopup.forEach(a => {
                a.remove()
            })

            let index = $(this).parent('li').index()

            let id = parseInt(index)

            ol.removeChild(ol.childNodes[id]);

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
    // input.style.padding = '10px 0'
    input.className = 'py-2 space-x-0'

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
    geocoder.on('result', (e) => {

        pre.innerText = JSON.stringify(e.result);
        p.innerText = e.result.text
        a.innerText = e.result.geometry.coordinates.map(a => a.toFixed(3)).join(" , ")

        geocodermarker.setLngLat(e.result.geometry.coordinates).addTo(map)
        map.flyTo({
            center: e.result.geometry.coordinates,
            essential: true
        })
    });

    geocoder.on('clear', () => {
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

// Total default layer
let defTotalLayer;

let getRoutes = () => {

    let L = lists.querySelectorAll("pre")
    let confirm = document.getElementById("confirm-input")
    if (L.length < 2) {
        confirm.style.display = "block"
    } else {
        confirm.style.display = "none"
        let input = document.getElementById("checkpoint")
        input.checked = true
        input.disabled = false

        let geojsonMarker = GetCoordinate(L)

        let fetList = geojsonMarker.features

        let points = fetList.map((a) => {
            return [a.geometry.coordinates]
        })

        getDirection(points)

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

let getDirection = (points) => {

    // Remove existing marker on the map
    removeDuplicateMarker()

    let distance = []

    let distText = document.getElementById('distance')

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
                        id: `turfline${i}`,
                        type: 'line',
                        source: {
                            type: 'geojson',
                            data: curvedLine,
                        },
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round',
                        },
                        paint: template.line_style,
                    })

                    // Calculate length of turf curve line in meters 
                    let length = turf.length(curvedLine, {
                        units: 'meters'
                    });

                    // Push result to distance variable
                    distance.push(length)

                } else {
                    map.addLayer({
                        id: `route${i}`,
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
                        paint: template.line_style,
                    })

                    // Push default distance property from mapbox direction result
                    distance.push(data.routes[0].distance)

                }

                // Push total length to side bar
                setDistance(distText, distance)

                chaneLineColor(defTotalLayer)

            }).fail(() => {
                alert("The distance exceeds the limit (10.000 km)");
            })
        }
    }
}

let setDistance = (el, distance) => {
    el.innerText = `${SumLength(distance)} of kilometers`
}

let chaneLineColor = (totallayer) => {
    let lineCollection = map.getStyle().layers.slice(totallayer.length)

    let color = document.getElementById("change-color")

    color.addEventListener('change', (val) => {
        let color = val.target.value
        lineCollection.forEach(line => {
            map.setPaintProperty(line.id, 'line-color', color);
        })
    })
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

    let label = []

    markers.features.forEach((marker, i) => {
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
                zoom: template.zoom_onclick,
            });
        })

        let popup = new mapboxgl.Popup(template.popup_props)

        label.push(popup.setLngLat(marker.geometry.coordinates).setHTML(`<h3 class="point-label">${marker.properties.name}</h3>`))

    });

    label.forEach(popup => {
        popup.addTo(map)
    })

    let existLabel = document.querySelectorAll(".mapboxgl-popup")

    removeDuplicateLabel(existLabel, label)
}

let removeDuplicateLabel = (el, label) => {
    if (label.length != el.length) {
        for (let i = 0; i < label.length - 1; i++) {
            el[i].remove()
        }
    }
}

let removeDuplicateMarker = () => {
    let removeMarker = document.querySelectorAll(`.marker`)

    if (removeMarker.length === 1) {
        removeMarker[0].remove()
    } else {
        removeMarker.forEach(marker => {
            marker.remove()
        })
    }
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
        console.log(removeMarker)
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

    }
}

// Show/hide the points
let ShowHidePoint = () => {
    let check = document.getElementById("checkpoint")
    let classPopup = document.querySelectorAll('.point-label')
    let marker = document.querySelectorAll(".marker")

    if (check.checked == false) {
        marker.forEach((marker) => {
            marker.style.visibility = 'hidden'
        })
        classPopup.forEach((classPopup) => {
            classPopup.style.visibility = 'hidden'
        })
    } else {
        marker.forEach((marker) => {
            marker.style.visibility = 'visible'
        })
        classPopup.forEach((classPopup) => {
            classPopup.style.visibility = 'visible'
        })
    }
}

map.on('style.load', () => {

    getRoutes()

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

        map.setStyle(`mapbox://styles/${template.mapbox_username}/${this.value}`)

        getRoutes()

        // Onchange color function
        let color = document.getElementById("change-color")

        color.addEventListener('change', (val) => {
            let newcol = val.target.value
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
    map.setStyle(`mapbox://styles/${template.mapbox_username}/${existBasemapValue}`)
}
