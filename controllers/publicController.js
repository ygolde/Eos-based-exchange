const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
const MARKET = require('../models/markets')
const PAIRS = require('../models/pairs')
const HISTORY = require('../models/history')
const ORDER = require('../models/orders')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/getOrderBook', async (req, res) => {
    let orders = await ORDERS.find({ state: 'active' }).exec()
    orders = await filterExpired(orders);
    return res.send({ success: true, orders: orders })
})

router.get('getOrderBookByPair', async (req, res) => {
    let response = await OrderBookByPair(req);
    return res.send(response)
})

router.get('/getActiveOrdersByPair', async (req, res) => {
    let response = await getActiveOrdersByCoin(req)
    return res.send(response)
})

router.get('/getMarkets', async (req, res) => {
    let markets = await PAIRS.find({}).exec();
    return res.send({ success: true, markets })
})

router.get('getMarketSummary', async (req, res) => {
    let response = await MarketSummary(req);
    return res.send(response)
})

router.get('getMarketHistory', async (req, res) => {
    let response = await MarketHistory(req)
    return res.send(response)
})

router.get('/getMarkets24', async (req, res) => {
    let markets = await getMarket24();
    return res.send(markets)
})

var getActiveOrdersByCoin = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.query.pairId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        let pairs = await PAIRS.find({}).exec();
        if (!pairs)
            return resolve({ success: false, message: `Pair against pairId:${pairId} is not registerd` })
        let orders = await ORDERS.find({ pairId: pairId, state: 'active' }).exec()
        return resolve({ success: true, orders: orders })
    })
}

var OrderBookByPair = async (req) => {
    return new Promise(async (resolve) => {
        let pairId = req.query.pairId
        if (!pairId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must be a valid string' })
        let orders = await ORDERS.find({ pairId, state: 'active' }).exec()
        orders = await filterExpired(orders);
        return resolve({ success: true, orders })
    })
}

var filterExpired = async (orders) => {
    return new Promise((resolve) => {
        let filtered = orders.filter(order => order['expire_at'] >= Date.now())
        return resolve(filtered)
    })
}

var MarketSummary = async (req) => {
    return new Promise(async (resolve) => {
        let pairId = req.query.pairId;
        let period = req.query.period;
        if (!pairId || !period)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must be a valid string' })
        if (typeof period != 'number')
            return resolve({ success: false, message: 'period must a number' })
        if (period != 24 || period != 168 || period != 720)
            return resolve({ success: false, message: 'period can be [24,168,720] in hours' })
        let now = new Date()
        now.setHours(-period)
        //now.setHours(0, 0, 0, 0); //setting time for day-start
        let High = await HISTORY.aggregate([
            {
                $project: { _id: 0, high: { $divide: ["$fromBuyerToSeller", "$fromSellerToBuyer"] } }
            },
            { $match: { created_at: { $gte: now }, pairId } },
            { $sort: { high: -1 } },
            { $limit: 1 },
        ]);
        let Low = await HISTORY.aggregate([
            { $match: { created_at: { $gte: now }, pairId } },
            {
                $project: { _id: 0, low: { $divide: ["$fromBuyerToSeller", "$fromSellerToBuyer"] } }
            },
            { $sort: { low: 1 } },
            { $limit: 1 },
        ]);
        let Volume = await HISTORY.aggregate(
            { $match: { created_at: { $gte: now }, pairId } },
            { $group: { volume: { $sum: "$fromSellerToBuyer" }, } }
        );
        let Last = await HISTORY.find({ created_at: { $gte: now }, pairId }).sort({ "price": -1 }).limit(1);
        let openBuyOrders = await ORDERS.find({ created_at: { $gte: now }, pairId, buysell: 'buy' }).length;
        let openSellOrders = await ORDERS.find({ created_at: { $gte: now }, pairId, buysell: 'sell' }).length;
        let Bid = await ORDERS.find({ created_at: { $gte: now }, pairId, buysell: 'buy' }).sort({ "price": -1 });
        let Ask = await ORDERS.find({ created_at: { $gte: now }, pairId, buysell: 'sell' }).sort({ "price": 1 });
        return resolve({
            pairId,
            High: parseFloat(High).toFixed(8),
            Low: parseFloat(Low).toFixed(8),
            Volume: parseFloat(Volume).toFixed(8),
            Last: parseFloat(Last).toFixed(8),
            Bid: parseFloat(Bid).toFixed(8),
            Ask: parseFloat(Ask).toFixed(8),
            openBuyOrders,
            openSellOrders
        })
    })
}

var MarketHistory = async (req) => {
    return new Promise(async (resolve) => {
        let pairId = req.query.pairId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must a valid string' })
        let marketHistory = []
        let pairs = await PAIRS.find({}).exec()
        pairs.forEach(async (pair) => {
            let market = await HISTORY.find({ pairId: pair['_id'] }).limit(100).exec()
            marketHistory.push({
                type: pair['type'],
                pair: `${pair['first_currency']}-${pair['second_currency']}`,
                state: pair['state'],
                baseCoin: pair['baseCoin'],
                timeStamp: market['created_at'],
                quantity: market['fromSellerToBuyer'],
                price: market['price'],
                total: market['price'] * market['fromSellerToBuyer'],
                fillType: 'Fill',
                orderType: (market['buysell']).toUpperCase()
            })
        })
        return resolve({ success: true, marketHistory })
    })
}

var getMarket24 = async () => {
    return new Promise(async (resolve) => {
        let pairs = await PAIRS.find({}, { _id: 1 });
        let now = new Date()
        let end = new Date()
        let day = new Date()
        let firstday = new Date(day.setDate(day.getDate() - day.getDay()));
        var lastday = new Date(day.setDate(day.getDate() - day.getDay() + 6));
        now.setHours(0, 0, 0, 0); //setting time for day-start
        end.setHours(23, 59, 59, 999);
        pairs.forEach(async (pair) => {
            let max = await ORDER.find({ created_at: { $gte: now }, pairId: pair['_id'] }).sort({ "price": -1 }).limit(1);
            let min = await ORDER.find({ created_at: { $gte: now }, pairId: pair['_id'] }).sort({ "price": 1 }).limit(1);
            let openDay = await ORDER.find({ created_at: { $gte: firstday }, pairId: pair['_id'] }).sort({ 'created_at': 1 }).limit(1)
            let closeDay = await ORDER.find({ created_at: { $lte: lastday }, pairId: pair['_id'] }).sort({ 'created_at': -1 }).limit(1)

            let high = parseFloat(max[0]['price']).toFixed(8) || 0;
            let low = parseFloat(min[0]['price']).toFixed(8) || 0;
            let open = parseFloat(openDay[0]['price']).toFixed(8) || 0;
            let close = parseFloat(closeDay[0]['price']).toFixed(8) || 0;
            await MARKET.create({ pairId: pair['_id'], high, low, open, close })
        })
        resolve({ success: true })
    })
}
module.exports = router;