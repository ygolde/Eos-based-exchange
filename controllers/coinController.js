const fs = require('fs')
const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
var VerifyToken = require('../auth/VerifyToken');
const COIN = require('../models/coins')
const { encodeDecode } = require('../helpers/encrypt')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


router.post('/addCoin', async (req, res) => {
    let response = await addCoin(req);
    return res.send(response)
})

router.post('/updateCoin/:coinId', async (req, res) => {
    let response = await updateCoin(req);
    return res.send(response)
})

router.post('/encryptPassword/:coinId', async (req, res) => {
    let response = await encryptPassword(req);
    return res.send(response)
})

router.post('/decryptPassword/:coinId', async (req, res) => {
    let response = await decryptPassword(req);
    return res.send(response)
})

router.get('/getAllCoins', async (req, res) => {
    let coins = await COIN.find({}).exec()
    return res.send({ success: true, coins: coins })
})

router.get('/getAllCoinsIcons', async (req, res) => {
    fs.readdir(`${process.cwd()}/uploads/crypto/32/black`, null, (err, files) => {
        if (err)
            res.send({ icons: [] })
        const icons = files.map(file => {
            return {
                icon: file,
                ticker: file.split('.')[0].toUpperCase()
            }
        })
        res.send(icons)
    })
})

router.get('/getCoinByTicker', async (req, res) => {
    let response = await getCoinByTicker(req);
    return res.send(response);
})
router.get('/getCoinById', async (req, res) => {
    let response = await getCoinById(req);
    return res.send(response)
})

router.post('/deleteCoin/:coinId', async (req, res) => {
    let response = await deleteCoin(req);
    return res.send(response);
})

router.get('/updateCoinState/:coinId', async (req, res) => {
    let response = await updateState(req);
    return res.send(response);
})


var addCoin = async (req) => {
    return new Promise(async (resolve) => {
        let { name, ticker, icon, state, minimumOrder, maximumOrder } = req.body;
        if (!name || !ticker || !icon) {
            return resolve({ success: false, message: 'Please provide required parameters' })
        }
        if (typeof name != 'string')
            return resolve({ success: false, message: 'name must be a valid string' })
        if (typeof ticker != 'string')
            return resolve({ success: false, message: 'ticker must be a valid string' })
        if (typeof icon != 'string')
            return resolve({ success: false, message: 'icon must be a valid string' })
        let coin = await checkCoin(name, ticker);
        if (!coin['success'])
            return resolve(coin)
        await COIN.create({ name, ticker, icon, state, minimumOrder: parseFloat(minimumOrder), maximumOrder: parseFloat(maximumOrder) })
        return resolve({ success: true, message: 'Coin successfully added' })
    })
}

var updateCoin = async (req) => {
    return new Promise(async (resolve) => {
        let { name, ticker, icon, state, minimumOrder, maximumOrder } = req.body;
        const coinId = req.params.coinId;
        if (!name || !ticker || !icon || !coinId) {
            return resolve({ success: false, message: 'Please provide required parameters' })
        }
        if (typeof name != 'string')
            return resolve({ success: false, message: 'name must be a valid string' })
        if (typeof ticker != 'string')
            return resolve({ success: false, message: 'ticker must be a valid string' })
        if (typeof icon != 'string')
            return resolve({ success: false, message: 'icon must be a valid string' })

        let coin = await COIN.findOne({ _id: coinId }).exec();
        coin.name = name
        coin.ticker = ticker
        coin.icon = icon
        coin.state = state
        coin.minimumOrder = parseFloat(minimumOrder)
        coin.maximumOrder = parseFloat(maximumOrder)
        coin.updated_at = Date.now();
        await coin.save()
        return resolve({ success: true, message: 'Coin settings successfully updated' })
    })
}

var encryptPassword = async (req) => {
    return new Promise(async (resolve) => {
        let coinId = req.params.coinId;
        if (!coinId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof coinId != 'string')
            return resolve({ success: false, message: 'coinId must be a boolean' })
        let coin = await COIN.findById({ _id: coinId }).exec()
        coin.rpc_password = await encodeDecode(coin.rpc_password, 'e')
        await coin.save()
        return resolve({ success: true, message: 'Password successfully encrypted' })
    })
}

var decryptPassword = async (req) => {
    return new Promise(async (resolve) => {
        let coinId = req.params.coinId;
        if (!coinId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof coinId != 'string')
            return resolve({ success: false, message: 'coinId must be a boolean' })
        let coin = await COIN.findById({ _id: coinId }).exec()
        coin.rpc_password = await encodeDecode(coin.rpc_password, 'd')
        await coin.save()
        return resolve({ success: true, message: 'Password successfully decrypted' })
    })
}
var getCoinById = async (req) => {
    return new Promise(async (resolve) => {
        let coinId = req.query.coinId;
        if (!coinId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof coinId != 'string')
            return resolve({ success: false, message: 'coinId must be valid string' })
        let coin = await COIN.findOne({ _id: coinId }, { _id: 1, name: 1, icon: 1, ticker: 1 }).exec()
        return resolve({ success: true, coin })
    })
}
var getCoinByTicker = async (req) => {
    return new Promise(async (resolve) => {
        const ticker = req.query.ticker;
        if (!ticker)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        let coin = await COIN.find({ ticker: ticker }, { name: 1, ticker: 1, icon: 1 }).exec()
        if (coin.length)
            return resolve({ success: true, coin: coin[0] })
        return resolve({ success: false, message: 'Ticker not found' })
    })
}

var deleteCoin = async (req) => {
    return new Promise(async (resolve) => {
        const coinId = req.params.coinId;
        if (!coinId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        let result = await COIN.deleteOne({ _id: coinId }).exec()
        return resolve({ success: true, result })
    })
}

var updateState = async (req) => {
    return new Promise(async (resolve) => {
        try {
            let coinId = req.params.coinId;
            if (!coinId)
                return resolve({ success: false, message: 'Please provide required parameters' })
            if (typeof coinId != 'string')
                return resolve({ success: false, message: 'coinId must be a valid string' })
            let coin = await COIN.findById(coinId).exec();
            coin.state = !coin.state;
            await coin.save()
            return resolve({ success: true, message: 'Status changed successfully' })
        } catch (error) {
            return resolve({ success: false, message: 'Coin not found' })
        }

    })
}

var checkCoin = async (name, ticker) => {
    return new Promise(async (resolve) => {
        let names = await COIN.find({}, { name: 1, _id: 0 }).exec()
        let tickers = await COIN.find({}, { ticker: 1, _id: 0 }).exec()
        let n = false, t = false;
        names.forEach(element => {
            if (element['name'] == name)
                n = true;
        });
        tickers.forEach(element => {
            if (element['ticker'] == ticker)
                t = true;
        });
        if (n)
            return resolve({ success: false, message: `coin ${name} is already exist` })
        if (t)
            return resolve({ success: false, message: `ticker ${ticker} is already exist` })
        return resolve({ success: true })
    })
}

module.exports = router;