const express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config()
const VerifyToken = require('../auth/VerifyToken')
const ORDERS = require('../models/orders')
const USERS = require('../models/User')
const PAIRS = require('../models/pairs')
const SYSTEM = require('../models/system')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

const users = {
    ADMIN: 'admin',
    USER: 'user',
    SUPPORT: 'support',
    FINANCE: 'finance',
    ACCOUNTANT: 'accountant'
}
router.post('/placeOrder', VerifyToken, async (req, res) => {
    let response = await placeOrder(req);
    res.send(response);
})

router.get('/getAllOrders', VerifyToken, async (req, res) => {
    let userId = req.userId;
    if (!userId)
        return res.send({ success: false, message: 'Please provide required parameters' })
    console.log('getAllOrders')
    let orders = await ORDERS.find({}).populate({
        path: 'pairId',
        populate: [
            {
                path: 'first_currency',
                model: 'COINS'
            }, {
                path: 'second_currency',
                model: 'COINS'
            }
        ]
    }).exec()
    return res.send({ success: true, orders: orders })
})

router.get('/getAllCryptoOrders', VerifyToken, async (req, res) => {
    let userId = req.userId;
    if (!userId)
        return res.send({ success: false, message: 'Please provide required parameters' })
    let orders = await ORDERS.find({ uId: userId, currencyType: 'crypto' }).populate({
        path: 'pairId',
        populate: [
            {
                path: 'first_currency',
                model: 'COINS'
            }, {
                path: 'second_currency',
                model: 'COINS'
            }
        ]
    }).exec()
    orders = orders.map(order => {
        return {
            orderId: order['_id'],
            type: order['type'],
            side: order['buysell'],
            price: order['price'],
            state: order['state'],
            units: order['amount'],
            filledUnits: order['filledUnits'],
            filledUnitsPercentage: `${order['filledUnitsPercentage']}%`,
            pair: `${order['pairId']['first_currency']['ticker']}-${order['pairId']['second_currency']['ticker']}`,
        }
    })
    return res.send({ success: true, orders })
})

router.get('/getActiveOrdersByPair', VerifyToken, async (req, res) => {
    try {
        let response = await getActiveOrdersByPair(req)
        return res.send(response)
    } catch (error) {
        console.log(error)
    }

})

router.get('/closeAllOrders', async (req, res) => {
    let response = await closeAllOrders(req);
    return res.send(response)
})

router.get('/getCancelledOrders', VerifyToken, async (req, res) => {
    let uId = req.userId;
    let orders = await ORDERS.find({ uId, state: 'cancelled' }).exec();
    res.send({ success: true, orders })
})

router.get('/getDoneOrders', VerifyToken, async (req, res) => {
    let uId = req.userId;
    let orders = await ORDERS.find({ uId, state: 'done' }).exec();
    return res.send({ success: true, orders })
})

router.get('/changeOrderStatus/:orderId', VerifyToken, async (req, res) => {
    let response = await changeOrderState(req);
    return res.send(response);
})

router.get('/getReservedBalance', VerifyToken, async (req, res) => {
    try {
        const response = await getReservedBalance(req)
        return res.send(response)
    } catch (error) {
        return res.send({ baseBalance: 0.00, childBalance: 0.00 })
    }
})

router.get('/getSellOrders', VerifyToken, async (req, res) => {
    try {
        const response = await getSellOrders(req)
        return res.send(response)
    } catch (error) {

    }
})

router.get('/getBuyOrders', VerifyToken, async (req, res) => {
    try {
        const response = await getBuyOrders(req)
        return res.send(response)
    } catch (error) {

    }
})

router.get('/getCompletedOrders', VerifyToken, async (req, res) => {
    try {
        const response = await getCompletedOrders(req)
        return res.send(response)
    } catch (error) {

    }
})


const placeOrder = async (req) => {
    return new Promise(async (resolve) => {
        const uId = req.userId;
        const { pairId, buysell, amount, price, total, volume, type, currencyType, expiry, baseCurrencyBalance, childCurrencyBalance } = req.body;
        console.log(req.body)
        req.query.pairId = pairId
        const { baseBalance, childBalance } = await getReservedBalance(req)
        if (!pairId || !buysell || !uId || !amount || !price || !type) {
            return resolve({ success: false, message: 'Please provide required parameters' })
        }
        if (typeof pairId != 'string')
            return resolve({ success: false, message: 'pairId must be a valid string' })
        if (typeof buysell != 'string')
            return resolve({ success: false, message: 'buysell must be a valid string' })
        if (typeof uId != 'string')
            return resolve({ success: false, message: 'uId must be a valid string' })
        if (typeof amount != 'number')
            return resolve({ success: false, message: 'amount must be a number' })
        if (typeof price != 'number')
            return resolve({ success: false, message: 'price must be a number' })
        if (typeof type != 'string')
            return resolve({ success: false, message: 'type must be a valid string' })
        if (typeof currencyType != 'string')
            return resolve({ success: false, message: 'currency type must be a valid string' })
        let pair = await PAIRS.findById({ _id: pairId }).populate('first_currency').populate('second_currency').exec();
        console.log(pair)
        if (!pair)
            return resolve({ success: false, message: `Pair with given Id:${pairId} is not registerd` })

        if (amount <= pair['first_currency']['minimumOrder'] && buysell == 'sell')
            return resolve({ success: false, message: 'You don\'t have enough balance for this order' })

        if (amount > pair['first_currency']['maximumOrder'] && buysell == 'sell')
            return resolve({ success: false, message: 'You are exceeding your limits' })

        if (amount <= pair['second_currency']['minimumOrder'] && buysell == 'buy')
            return resolve({ success: false, message: 'You don\'t have enough balance for this order' })

        if (amount > pair['second_currency']['maximumOrder'] && buysell == 'buy')
            return resolve({ success: false, message: 'You are exceeding your limits' })

        if (buysell === 'sell' && (baseCurrencyBalance - baseBalance) < amount)
            return resolve({ success: false, message: 'You don\'t have enough balance for this order ' })

        if (buysell === 'buy' && (childCurrencyBalance - childBalance) < amount)
            return resolve({ success: false, message: 'You don\'t have enough balance for this order ' })


        let order = await ORDERS.create({ uId, pairId, buysell, amount, price, total, volume, currencyType, type }).catch(e => {
            console.log(e)
            return resolve({ success: false, message: e.message })
        })

        let systems = await SYSTEM.find({}).exec()
        const system = systems[0]
        if (buysell === 'buy') {
            order['bid'] = price;
            order['fees'] = system['fees']['quicktrade']['maker']
        }
        if (buysell === 'sell') {
            order['ask'] = price;
            order['fees'] = system['fees']['quicktrade']['taker']
        }
        order['state'] = 'active';
        let now = new Date();
        now.setDate(now.getDate() + 1);
        order['expire_at'] = expiry || now
        await order.save()
        return resolve({ success: true, message: `order(order_id:${order._id}) placed successfully` })
    })
}

const getActiveOrdersByPair = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.query.pairId;
        const uId = req.userId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        await markExpiredOrders(uId)
        let orders = await ORDERS.find({ uId, pairId: mongoose.Types.ObjectId(pairId), state: 'active' }).exec()
        orders = await filterExpired(orders);
        return resolve({ success: true, orders })
    })
}

const closeAllOrders = async (req) => {
    return new Promise(async (resolve) => {
        let userId = req.userId;
        let user = await USERS.findById(userId)
        if (!user)
            return resolve({ success: false, message: 'User not found' })
        if (user['type'] != users.ADMIN)
            return resolve({ success: false, message: 'You don\'t have permission to close orders' })
        if (user['isBlock'])
            return resolve({ success: false, message: 'blocked user can\'t close orders' })
        let orders = await ORDERS.find({ state: 'active', locked: false, expire_at: { $gt: Date.now() } })
        if (!orders.length)
            return resolve({ success: true, message: 'No active orders' })
        orders.forEach(async (order) => {
            order['state'] = 'cancelled'
            await order.save()
        })
        return resolve({ success: true, message: 'Orders closed successfully' })
    })
}

const changeOrderState = async (req) => {
    return new Promise(async (resolve) => {
        let uId = req.userId;
        let orderId = req.params.orderId;
        let state = req.query.state;
        if (!orderId || !state)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof orderId != 'string')
            return resolve({ success: false, message: 'orderId must be a valid string' })
        if (typeof state != 'string')
            return resolve({ success: false, message: 'state must be a valid string' })
        let order = await ORDERS.findOne({ _id: orderId, uId }).exec();
        if (!order)
            return resolve({ success: false, message: 'No order found' })
        order['state'] = state;
        await order.save().catch(e => {
            return resolve({ success: false, message: e.message })
        })
        return resolve({ success: true, message: `Order successfully ${state}` })
    })
}

const filterExpired = async (orders) => {
    return new Promise((resolve) => {
        let filtered = orders.filter(order => order['expire_at'] >= Date.now())
        return resolve(filtered)
    })
}

const markExpiredOrders = (userId) => {
    return new Promise(async (resolve) => {
        await ORDERS.updateMany({ uId: userId, state: 'active', expire_at: { $lte: Date.now() } }, { $set: { state: 'expired' } }).exec();
        resolve()
    })
}

const getReservedBalance = (req) => {
    return new Promise(async resolve => {
        const pairId = req.query.pairId
        const uId = req.userId
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        const sell_orders = await ORDERS.find({ uId, pairId, state: 'active', buysell: 'sell' }).exec()
        const buy_orders = await ORDERS.find({ uId, pairId, state: 'active', buysell: 'buy' }).exec()
        const base_reserve = sell_orders.reduce((prev, order) => prev + order['amount'], 0)
        const child_reserve = buy_orders.reduce((prev, order) => prev + order['amount'], 0)
        resolve({ baseBalance: base_reserve, childBalance: child_reserve })
    })
}

const getSellOrders = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.query.pairId;
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        const orders = await ORDERS.find({ buysell: 'sell', pairId: mongoose.Types.ObjectId(pairId), state: 'active' }).exec()
        return resolve({ success: true, orders })
    })
}

const getBuyOrders = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.query.pairId;
        const uId = req.userId
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        const orders = await ORDERS.find({ uId: { $ne: uId }, buysell: 'buy', pairId: mongoose.Types.ObjectId(pairId), state: 'active' }).exec()
        return resolve({ success: true, orders })
    })
}

const getCompletedOrders = async (req) => {
    return new Promise(async (resolve) => {
        const pairId = req.query.pairId;
        const uId = req.userId
        if (!pairId)
            return resolve({ success: false, message: 'Please provide valid parameter' })
        const orders = await ORDERS.find({ state: 'done', pairId: mongoose.Types.ObjectId(pairId) }).exec()
        return resolve({ success: true, orders })
    })
}

module.exports = router;