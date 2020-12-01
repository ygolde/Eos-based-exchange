
const express = require('express');
const LOGS = require('../models/error-logs')
const Rates = require('../models/currency-rate')
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


router.get('/convert', async (req, res) => {
    // const { from, to, amount } = req.body
    client.convert({ from: 'USD', to: 'CAD', amount: 1 }).then(converted => {
        console.log(converted)
        return res.send(converted)
    })
        .catch(async e => {
            await LOGS.create({
                type: 'CURRENCY LAYER CONVERSION',
                details: e
            })
            return res.send(e)
        })
})


router.get('/get-price', async (req, res) => {
    const data = await Rates.find().sort({ $natural: -1 }).limit(1)
    res.send(data)
})
module.exports = router