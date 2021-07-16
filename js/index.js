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

let toTalLayer =  []

map.on('load',() => {
    let si = map.getStyle().layers
    toTalLayer.push(si.length)
    
   console.log(si)
})

document.getElementById('basemaps').addEventListener('change', function () {
    map.setStyle(`mapbox://styles/mapbox/${this.value}`)
       
   
    let si = map.getStyle().layers
    
    toTalLayer.push(si.length)

    
    // console.log(toTalLayer.slice(-1))
 
 
   
})



// map.on('style.load',()=> {
//     document.getElementById('basemaps').addEventListener('change', function () {
//         map.setStyle(`mapbox://styles/mapbox/${this.value}`)
//         let si = map.getStyle().layers
//         toTalLayer = si.length
//     });
// })

// function ChangeBaseMap(option) {
//     var optionVal = option.value;
//     map.setStyle(`mapbox://styles/mapbox/${optionVal}`);
//     let si = map.getStyle().layers
    
//    toTalLayer = si.length
// }



function ShowHidePoint() {
    let check = document.getElementById("checkpoint")
    let classPopup = document.querySelectorAll('.point-label')
    let marker = document.querySelectorAll(".marker")

    if (check.checked == false) {
        marker.forEach((marker,i) => {
            marker.style.visibility = 'hidden'
        })
        classPopup.forEach((classPopup,i) => {
            classPopup.style.visibility = 'hidden'
        })
    } else {
        marker.forEach((marker,i) => {
            marker.style.visibility = 'visible'
        })
        classPopup.forEach((classPopup,i) => {
            classPopup.style.visibility = 'visible'
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

            let defLayer = map.getStyle().layers.slice(toTalLayer.slice(-1)[0], this.length)

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
    let si = map.getStyle().layers
 
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
                    "name": parseObj.text
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

                        distance.push(data.routes[0].distance)

                    }

                    let sum = distance.map((a) => {
                        let km = a / 1000
                        return parseFloat(km.toFixed(0))
                    }).reduce((a, b) => {
                        return a + b
                    })

                    distText.innerText = `${sum} of kilometers`

                    let defaultLayer =toTalLayer.slice(-1)
                    
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
                closeOnClick: false,
            })

            popup.setLngLat(marker.geometry.coordinates).setHTML(`<h3 class="point-label">${marker.properties.name}</h3>`).addTo(map);

        });

        marker.remove()

        let bbox = turf.bbox(data);
        map.fitBounds(bbox, {
            padding: 70,
        })
    }

}
