const express = require('express');
const app = express();
const PORT = 3000;

const fs = require('fs');
const path = require('path');
const GeoJsonGeometriesLookup = require("geojson-geometries-lookup");

app.use(express.static(path.join(__dirname, 'public')));

app.use('/rep', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (!lat || !lon) return

    const f = fs.readFileSync(path.join(__dirname, 'public/circonscriptions-legislatives.json'), 'utf-8');
    const data = JSON.parse(f)
    
    gl = new GeoJsonGeometriesLookup(data);

    const pos = {
        type: "Point",
        coordinates: [lon, lat],
    };

    const code = gl.getContainers(pos).features[0]?.properties["REF"]

    res.json({});
})

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
