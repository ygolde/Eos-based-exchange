const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
const COINS = require('../models/coins')
const PAIRS = require('../models/pairs')
const MARKETDATA = require('../models/marketdata')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/addPair', async (req, res) => {
    let response = await addPair(req);
    res.send(response);
})

router.get('/deletePair', async (req, res) => {
    let response = await deletePair(req)
    return res.send(response)
})

router.get('/updatePair/:pairId', async (req, res) => {
    let response = await updatePair(req)
    return res.send(response)
})

router.get('/changePairStatus/:pairId', async (req, res) => {
    let response = await changePairState(req);
    return res.send(response);
})

router.get('/getAllPairs', async (req, res) => {
    let pairs = await PAIRS.find({}).populate('first_currency').populate('second_currency').populate('baseCoin').exec()
    return res.send({ success: true, pairs })
})

router.get('/getAllCryptoMarkets', async (req, res) => {
    const response = await getAllCryptoMarketsData()
    return res.send(response)
})

router.get('/getAllFiatMarkets', async (req, res) => {
    const response = await getAllFaitMarketsData()
    return res.send(response)
})

var getAllCryptoMarketsData = async () => {
    return new Promise(async (resolve) => {
        try {
            var markets = await MARKETDATA.find({ type: 'crypto' }).populate({
                path: 'pairId',
                populate: [{
                    path: 'first_currency',
                    model: 'COINS'
                }, {
                    path: 'second_currency',
                    model: 'COINS'
                }, {
                    path: 'baseCoin',
                    model: 'COINS'
                }
                ]
            }).exec()
            var filtered = markets.filter((doc)=>{
                return doc['pairId']['state']==true
            })
            markets = filtered.map(market => {
                return {
                    pairId: market['pairId']['_id'],
                    baseTicker: market['pairId']['baseCoin']['ticker'],
                    childTicker: market['pairId']['second_currency']['ticker'],
                    baseDecimals: market['pairId']['baseCoin']['decimals'],
                    childDecimals: market['pairId']['second_currency']['decimals'],
                    baseStep: market['pairId']['baseCoin']['step'],
                    childStep: market['pairId']['second_currency']['step'],
                    baseFormat: 0.0.toFixed(market['pairId']['baseCoin']['decimals']),
                    childFormat: 0.0.toFixed(market['pairId']['second_currency']['decimals']),
                    baseIcon: `assets/crypto/32/color/${market['pairId']['baseCoin']['icon']}`,
                    childIcon: `assets/crypto/32/color/${market['pairId']['second_currency']['icon']}`,
                    pair: `${market['pairId']['baseCoin']['ticker']}-${market['pairId']['second_currency']['ticker']}`,
                    base: market['pairId']['baseCoin']['name'],
                    child: market['pairId']['second_currency']['name'],
                    base_volume: `${market['dayVolume']} ${market['pairId']['baseCoin']['ticker']}`,
                    zip_volume: `${market['dayVolume']} ${market['pairId']['second_currency']['ticker']}`,
                    change: `+${market['dayChange']}%`,
                }
            })
            return resolve({ markets })
        } catch (error) {
            resolve({ markets: [] })
        }

    })
}

var getAllFaitMarketsData = async () => {
    return new Promise(async (resolve) => {
        try {
            var markets = await MARKETDATA.find({ type: 'fait' }).populate({
                path: 'pairId',
                populate: [{
                    path: 'first_currency',
                    model: 'COINS'
                }, {
                    path: 'second_currency',
                    model: 'COINS'
                }, {
                    path: 'baseCoin',
                    model: 'COINS'
                }
                ]
            })
            markets = markets.map(market => {
                return {
                    baseTicker: market['pairId']['baseCoin']['ticker'],
                    childTicker: market['pairId']['second_currency']['ticker'],
                    baseIcon: `assets/crypto/32/color/${market['pairId']['baseCoin']['icon']}`,
                    childIcon: `assets/crypto/32/color/${market['pairId']['second_currency']['icon']}`,
                    pair: `${market['pairId']['baseCoin']['ticker']}-${market['pairId']['second_currency']['ticker']}`,
                    base: market['pairId']['baseCoin']['name'],
                    child: market['pairId']['second_currency']['name'],
                    base_volume: `${market['dayVolume']} ${market['pairId']['baseCoin']['ticker']}`,
                    zip_volume: `${market['dayVolume']} ${market['pairId']['second_currency']['ticker']}`,
                    change: `+${market['dayChange']}%`,
                }
            })
            return resolve({ markets })
        } catch (error) {
            resolve({ markets: [] })
        }

    })
}

var addPair = async (req) => {
    return new Promise(async (resolve) => {
        let { first_currency, second_currency, type, baseCoin } = req.body;
        if (!first_currency || !second_currency || !type || !baseCoin) {
            return resolve({ success: false, message: 'Please provide required parameters' })
        }
        if (typeof first_currency != 'string')
            return resolve({ success: false, message: 'first_currency must be a valid string' })
        if (typeof second_currency != 'string')
            return resolve({ success: false, message: 'second_currency must be a valid string' })
        if (typeof type != 'string')
            return resolve({ success: false, message: 'type must be a valid string' })
        if (typeof baseCoin != 'string')
            return resolve({ success: false, message: 'baseCoin must be a valid string' })

        let coins = await COINS.findOne({ _id: first_currency }, { name: 1 }).exec();
        if (!coins)
            return resolve({ success: false, message: `coin is not registerd against this Id:${first_currency}` })
        coins = await COINS.findOne({ _id: second_currency }, { name: 1 }).exec();
        if (!coins)
            return resolve({ success: false, message: `coin is not registerd against this Id:${second_currency}` })

        let pair = await checkPair(first_currency, second_currency)
        if (!pair['success'])
            return resolve(pair)
        let pairRecord = await PAIRS.create({ first_currency, second_currency, type, baseCoin }).catch(e => {
            return resolve({ success: false, message: e.message })
        })
        await MARKETDATA.create({
            pairId: pairRecord._id,
            type: type,
            last_price: 0,
            dayChange: 0,
            dayVolume: 0,
            marketCap: 0,
            dayHigh: 0,
            dayLow: 0
        })
        return resolve({ success: true, message: `Pair successfully added` })
    })
}

var deletePair = async (req) => {
    return new Promise(async (resolve) => {
        let pairId = req.query.pairId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must be a valid string' })
        await PAIRS.deleteOne({ _id: pairId }).exec();
        return resolve({ success: true, message: 'Pair successfully deleted' })
    })
}

var updatePair = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.params.pairId;
        let { first_currency, second_currency, type, baseCoin } = req.body;
        if (!first_currency || !second_currency || !type || !baseCoin || !pairId) {
            return resolve({ success: false, message: 'Please provide required parameters' })
        }
        if (typeof first_currency != 'string')
            return resolve({ success: false, message: 'first_currency must be a valid string' })
        if (typeof second_currency != 'string')
            return resolve({ success: false, message: 'second_currency must be a valid string' })
        if (typeof type != 'string')
            return resolve({ success: false, message: 'type must be a valid string' })
        if (typeof baseCoin != 'string')
            return resolve({ success: false, message: 'baseCoin must be a valid string' })

        let coins = await COINS.findOne({ _id: first_currency }, { name: 1 }).exec();
        if (!coins)
            return resolve({ success: false, message: `coin is not registerd against this Id:${first_currency}` })
        coins = await COINS.findOne({ _id: second_currency }, { name: 1 }).exec();
        if (!coins)
            return resolve({ success: false, message: `coin is not registerd against this Id:${second_currency}` })

        let pair = await PAIRS.findById({ _id: pairId }).exec()
        if (!pair)
            return resolve({ success: false, message: 'This pair does not exist' })
        pair.first_currency = first_currency;
        pair.second_currency = second_currency;
        pair.type = type;
        pair.baseCoin = baseCoin;
        pair.updated_at = Date.now()
        await pair.save()
        return resolve({ success: true, message: 'Pair successfully updated' })
    })
}

var changePairState = async (req) => {
    return new Promise(async (resolve) => {
        let pairId = req.params.pairId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must be a valid string' })
        let pair = await PAIRS.findById({ _id: pairId }).exec()
        if (!pair)
            return resolve({ success: false, message: 'Pair does not exist' })
        pair.state = !pair.state;
        await pair.save().catch(e => {
            return resolve({ success: false, message: e.message })
        })
        return resolve({ success: true, message: `Pair status successfully updated` })
    })
}

var checkPair = async (first_currency, second_currency) => {
    return new Promise(async (resolve) => {
        let pairs = await PAIRS.find({}, { first_currency: 1, second_currency: 1, _id: 0 }).exec()
        let coins = await COINS.find({ $or: [{ _id: first_currency }, { _id: second_currency }] })
        let p = false, e = false;
        coins.forEach(coin => {
            if (!coin['state'])
                e = true;
        })
        pairs.forEach(element => {
            if (element['first_currency'] == first_currency && element['second_currency'] == second_currency)
                p = true;
        });
        if (e)
            return resolve({ success: false, message: `One of pair ${first_currency.toUpperCase()}/${second_currency.toUpperCase()} currency is disabled` })
        if (p)
            return resolve({ success: false, message: `Pair ${first_currency.toUpperCase()}/${second_currency.toUpperCase()} is already exist` })
        return resolve({ success: true })
    })
}


module.exports = router;