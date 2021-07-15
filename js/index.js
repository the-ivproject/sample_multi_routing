const mapbox_token = 'pk.eyJ1Ijoibm92dXMxMDIwIiwiYSI6ImNrcGltcnp0MzBmNzUybnFlbjlzb2R6cXEifQ.GjmiO9cPjoIozKaG7nJ4qA';

mapboxgl.accessToken = mapbox_token

let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-96, 37.8],
    zoom: 2
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

function ChangeBaseMap(option) {
    var optionVal = option.value;
    map.setStyle(`mapbox://styles/mapbox/${optionVal}`);
}

function ShowHidePoint() {
    let check = document.getElementById("checkpoint")

    let marker = document.querySelectorAll(".marker")

    if (check.checked == false) {
        marker.forEach((marker) => {
            marker.style.visibility = 'hidden'
        })
    } else {
        marker.forEach((marker) => {
            marker.style.visibility = 'visible'
        })
    }
}

let results = document.getElementById('result');

let lists = document.getElementById('listings')

let ol = document.createElement('ol')
ol.className = 'numbered'

let i = 0;
let x = []
let marker = new mapboxgl.Marker()
let marker2 = ''

function addInput() {

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
        let L = lists.querySelectorAll("pre")

        if (L.length <= 2) {
            alert('Need at least 2 inputs')
        } else {
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

            let defLayer = map.getStyle().layers.slice(83, this.length)

            defLayer.forEach(element => {
                map.removeLayer(element.id)
            });

            getRoutes()

            
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

    let g = new MapboxGeocoder({
        accessToken: mapbox_token,
        mapboxgl: mapboxgl,
        placeholder: null,
        filter: function (item) {
            // returns true if item contains New South Wales region
            return item.context
                .map(function (i) {
                    // ID is in the form {index}.{id} per https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
                    // This example searches for the `region`
                    // named `New South Wales`.
                    return (
                        i.id.split('.').shift() === 'region' ||
                        i.id.split('.').shift() === 'address'
                    );
                })
                .reduce(function (acc, cur) {
                    return acc || cur;
                });
        },
    })

    g.addTo(input)
    g.on('result', function (e) {

        pre.innerText = JSON.stringify(e.result);
        p.innerText = e.result.text
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

    if (L.length < 2) {
        alert('Need at least 2 inputs')
    } else {

        let input = document.getElementById("checkpoint")
        input.checked = true
        input.disabled = false

        let data = {
            "type": "FeatureCollection",
            "features": []
        }

        L.forEach((b) => {
            let parseObj = JSON.parse(b.innerText)
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

                let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${existRoute[i]};${existRoute[i + 1]}?steps=true&geometries=geojson&overview=full&access_token=${mapbox_token}`

                let id = `${fetList[i].properties.name}${i}`

                $.get(url, (data) => {

                    if (data.routes.length === 0) {

                        let start = turf.point(existRoute[i][0])
                        let end = turf.point(existRoute[i + 1][0])

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
                                'line-width': 3,
                            },
                        })

                        let length = turf.length(curvedLine, {
                            units: 'meters'
                        });
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
                                'line-width': 3,
                            },
                        })

                        distance.push(data.routes[0].distance)

                    }

                    let sum = distance.map((a) => {
                        let km = a / 1000
                        return parseFloat(km.toFixed(2))
                    }).reduce((a, b) => {
                        return a + b
                    })

                    distText.innerText = `${sum} of kilometers`

                    let defaultLayer = 83

                    let lineCollection = map.getStyle().layers.slice(defaultLayer)

                    let color = document.getElementById("change-color")

                    color.addEventListener('change',(val)=>{
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

        let disInput = document.querySelectorAll('.list-itn div')

        for (let i = 0; i < disInput.length; i++) {
            disInput[i].style.display = 'none'
        }

        // add markers to map
        data.features.forEach(function (marker, i) {
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
                closeOnClick: false
            })

            el.addEventListener('mouseenter', () => {
                let latlng = marker.geometry.coordinates
                let prop = marker.properties.name

                popup.setLngLat(latlng).setHTML(`<h3>Place </h3><p>${prop}</p>`).addTo(map);
            })

            el.addEventListener('mouseleave', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });

        });

        marker.remove()

        let bbox = turf.bbox(data);
        map.fitBounds(bbox, {
            padding: 70,
        })
    }

}
