const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
var VerifyToken = require('../auth/VerifyToken');
const APIKEY = require('../models/api-keys')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const uuidAPIKey = require('uuid-apikey');

router.post('/generate', VerifyToken, async (req, res) => {
    const { type } = req.body;
    const userId = req.userId;
    if (!type) {
        return res.send({ success: false, message: 'Please provide required parameters' })
    }
    if (typeof type != 'string')
        return res.send({ success: false, message: 'type must be a valid string' })
    const { uuid, apiKey } = uuidAPIKey.create()
    switch (type) {
        case 'free':
            await COIN.create({ userId, apiKey, uuid, readLimit: 1000, writeLimit: 1000 })
            return res.send({ success: true, message: apiKey })
        case 'premium':
            await COIN.create({ userId, apiKey, uuid, readLimit: 10000, writeLimit: 10000 })
            return res.send({ success: true, message: apiKey })
    }
})


module.exports = router;