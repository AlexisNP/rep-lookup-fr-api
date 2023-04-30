const { createReadStream, readFileSync } = require('fs')
const { join } = require('path')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require("helmet");
const json = require('big-json')

const GeoJsonGeometriesLookup = require("geojson-geometries-lookup")
const lookupTable = require('./rep-lookup')

const app = express()

const port = 3000

// Add modules to express app
app.use(cors())
app.use(morgan('common'))
app.use(helmet())

// Static files
app.use(express.static(join(__dirname, 'public')))

/**
 * MAIN ROUTE
 * Query params :
 *      latitude
 *      longitude
 */
app.use('/rep', async (req, res) => {
    let { lat, lon } = req.query

    // If the query doesn't contain the required params...
    if (!lat || !lon) {
        res.status(401).json({
            "message": "La requête doit contenir une latitude et une longitude pour récupérer les données de votre député."
        });
        return
    }

    lat = parseFloat(lat)
    lon = parseFloat(lon)

    // Gets closest city from gov api to establish region data
    const closestCity = await (await fetch(
        `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}`
    )).json();
    let codeDepartement = closestCity[0]?.codeDepartement

    // If somehow, the gov api can't find the nearest city...
    if (!codeDepartement || codeDepartement === "") {
        res.status(400).json({
            "message": "Les coordonnées de géolocalisation ne sont pas correctes ; vérifiez votre navigateur ou contactez l'administrateur du site si vous pensez qu'il s'agit d'une erreur."
        });
        return
    }

    // Changes dep code to format of filenames on server, ie "075"
    codeDepartement = String(codeDepartement).padStart(3, "0");

    // Gets the associated features with a read and parse stream
    const pathToFeatures = join(__dirname, `public/cirs/${codeDepartement}.json`)
    const readStream = createReadStream(pathToFeatures)
    const parseStream = json.createParseStream()

    parseStream.on('data', (pojo) => {
        // Searches through all the geometries from the departement file data...
        gl = new GeoJsonGeometriesLookup(pojo)

        const pos = {
            type: "Point",
            coordinates: [lon, lat],
        };

        // Gets associated code for the country
        const code = gl.getContainers(pos).features[0]?.properties["REF"]
    
        // If no code is found, send a 404
        if (!code) {
            res.status(404).json({
                "message": "Impossible de trouver la circonscription demandée. Veuillez contacter l'administrateur du site si vous pensez qu'il s'agit d'une erreur."
            });
            return
        }
    
        // If a code is found, send the associated file containing the representant data
        const repFile = readFileSync(join(__dirname, `public/reps/${lookupTable[code]}.json`), 'utf-8')
        res.end(repFile)
    })
    readStream.pipe(parseStream);
})

app.listen(port, () => console.log(`Server listening on port: ${port}`));

/**
* CUT DOWN CIRCO JSON
*/
// const f = fs.readFileSync(join(__dirname, 'public/circonscriptions-legislatives.json'), 'utf-8')
// const data = JSON.parse(f)

// const features = Object.values(data.features)

// const departements = groupBy(features, e => e.properties['REF'].substring(0, 3));

// for (const [key, value] of departements.entries()) {
//     const output = {
//         "type": "FeatureCollection",
//         "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
//         "features": value
//     }
//     fs.writeFileSync(join(__dirname, `public/cirs/${key}.json`), JSON.stringify(output))
// }

// function groupBy(list, keyGetter) {
//     const map = new Map();
//     list.forEach((item) => {
//          const key = keyGetter(item);
//          const collection = map.get(key);
//          if (!collection) {
//              map.set(key, [item]);
//          } else {
//              collection.push(item);
//          }
//     });
//     return map;
// }

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