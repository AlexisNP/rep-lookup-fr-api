const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())

const PORT = 3000

const fs = require('fs')
const path = require('path')
const GeoJsonGeometriesLookup = require("geojson-geometries-lookup")

const lookupTable = require('./rep-lookup')

app.use(express.static(path.join(__dirname, 'public')))

app.use('/rep', async (req, res) => {
    const lat = parseFloat(req.query.lat)
    const lon = parseFloat(req.query.lon)

    if (!lat || !lon) return

    const f = fs.readFileSync(path.join(__dirname, 'public/circonscriptions-legislatives.json'), 'utf-8')
    const data = JSON.parse(f)
    
    gl = new GeoJsonGeometriesLookup(data)

    const pos = {
        type: "Point",
        coordinates: [lon, lat],
    };

    const code = gl.getContainers(pos).features[0]?.properties["REF"]

    if (!code) {
        res.json({
            "message": "The requested data couldn't be found. Maybe it was moved or the data isn't generated properly."
        }).status(404).end();
        return
    }

    const repFile = fs.readFileSync(path.join(__dirname, `public/reps/${lookupTable[code]}.json`), 'utf-8')

    res.end(repFile)

    /**
     * GENERATE INITIAL DATA
     * Basically a bad crawler made in an hour
     */

    // const output = {}

    // for (let i = 500; i < lookupTable.length; i++) {
    //     const repId = lookupTable[i]
    //     console.log(repId)

    //     const response = await fetch(`https://www.assemblee-nationale.fr/dyn/deputes/${repId}`)
    //     const body = await response.text()

    //     const depRegex = new RegExp(/(data-content=\"\/dyn\/carte\/departement\/)([A-Za-z0-9]{2,})/g)
    //     const cirRegex = new RegExp(/(\?circonscriptionNumero=)([A-Za-z0-9]{1,})/g)

    //     const depString = body.match(depRegex)?.[0]?.split('departement/')?.[1]
    //     const cirString = body.match(cirRegex)?.[0]?.split('circonscriptionNumero=')?.[1]

    //     if (!depString || !cirString) {
    //         output[`WRONG-WRONG`] = repId

    //         return
    //     }

    //     const depStringPad = String("0000" + depString)
    //     const cirStringPad = String("0000" + cirString)

    //     const rep = {
    //         departement: depStringPad.substring(depStringPad.length - 3),
    //         circo: cirStringPad.substring(cirStringPad.length - 2)
    //     }

    //     output[`${rep.departement}-${rep.circo}`] = repId
    // }

    // res.json(output)
})

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
