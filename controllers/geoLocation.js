const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const { db } = require('../helpers/db')
let Geolocation = require('../helpers/geography')
const geo = new Geolocation(db)

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


router.get('/get-countries', async (req, res) => {
    try {
        const countries = await geo.get_all_countries()
        res.send(countries)
    }
    catch (err) {
        res.send(err)
    }
})

router.get('/get-states', async (req, res) => {
    try {
        const states = await geo.get_states()
        res.send(states)
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.get('/get-states-by-country', async (req, res) => {
    try {
        const countryId = req.query.countryId
        const states = await geo.get_states_by_country(countryId)
        res.send(states)
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.get('/get-cities', async (req, res) => {
    try {
        console.log(req.query)
        const cities = await geo.get_cities()
        res.send(cities)
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.get('/get-cities-by-state', async (req, res) => {
    try {
        const stateId = req.query.stateId
        const countryId = req.query.countryId
        const cities = await geo.get_cities_by_state(stateId, countryId)
        res.send(cities)
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/add-country', async (req, res) => {
    try {
        const country = req.body
        if (!country['name'] || !country)
            return res.send({ success: false, message: 'country name is missing' })
        if (!country['sortname'])
            return res.send({ success: false, message: 'sortname is missing' })
        if (!country['phonecode'])
            return res.send({ success: false, message: 'phonecode is missing' })

        const message = await geo.add_country(country)
        res.send({ success: true, message })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/remove-country', async (req, res) => {
    try {
        const country = req.body
        if (!country.length || !country)
            return res.send({ success: false, message: 'Please select at least one record' })

        await geo.remove_country(country)
        res.send({ success: true, message: 'Country removed successfully' })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/add-state', async (req, res) => {
    try {
        const state = req.body
        if (!state['name'] || !state)
            return res.send({ success: false, message: 'state name is missing' })
        if (!state['countryId'])
            return res.send({ success: false, message: 'countryId is missing' })

        const created = await geo.add_state_by_country(state)
        res.send({ success: true, message: created })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/remove-state', async (req, res) => {
    try {
        const state = req.body
        if (!state.length || !state)
            return res.send({ success: false, message: 'Please select at least one record' })

        await geo.remove_state(state)
        res.send({ success: true, message: 'State removed successfully' })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/add-city', async (req, res) => {
    try {
        const city = req.body
        if (!city['name'] || !city)
            return res.send({ success: false, message: 'city name is missing' })
        if (!city['countryId'])
            return res.send({ success: false, message: 'country is missing' })
        if (!city['stateId'])
            return res.send({ success: false, message: 'state is missing' })


        const created = await geo.add_city(city)
        res.send({ success: true, message: created })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.post('/remove-city', async (req, res) => {
    try {
        const city = req.body
        if (!city.length || !city)
            return res.send({ success: false, message: 'Please select at least one record' })

        await geo.remove_city(city)
        res.send({ success: true, message: 'City removed successfully' })
    }
    catch (err) {
        res.send({ success: false, message: err.message })
    }
})

router.get('/load-countries', async (req, res) => {
    await geo.load_countries()
    res.end()
})

router.get('/load-states', async (req, res) => {
    await geo.load_states()
    res.end()
})

router.get('/load-cities', async (req, res) => {
    const response = await geo.load_cities()
    res.send(response)
})

router.get('/drop-countries', async (req, res) => {
    await geo.drop_countries()
    res.end()
})

router.get('/drop-states', async (req, res) => {
    await geo.drop_states()
    res.end()
})

router.get('/drop-cities', async (req, res) => {
    await geo.drop_cities()
    res.end()
})


module.exports = router;