const express = require('express');
const bodyParser = require('body-parser');
const ORDERS = require('../models/orders');
const PAIRS = require('../models/pairs');
const HISTORY = require('../models/history');
const USERS = require('../models/User');
const txFactory = require('../fatory/transaction');
const { Types } = require('mongoose');
const balance = require('../fatory/balance');
const btc = require('../helpers/btc');
const eth = require('../helpers/eth');
const eos = require('../helpers/eos');
const errorLogs = require('../models/error-logs');

require('dotenv').config()
var router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

var io = require("socket.io").listen(8100);

var ProcessExchange = async () => {
    console.log('Process-Exchange Called')
    let pairs = await PAIRS.find({}, { _id: 1 }).exec()
    console.log(`Pairs :${pairs}`)
    pairs.forEach(pair => {
        setTimeout(MatchingEngine, 10, pair['_id'])
    })
    // setTimeout(ProcessExchange, 5000)
}

var MatchingEngine = async (pairId) => {
    console.log('Start matching orders (Matching-Engine Called)')
    console.log(pairId)
    io.emit('sellOrders', { pairId })
    io.emit('buyOrders', { pairId })

    let pair = await PAIRS.findById(pairId).exec()
    if (pair['locked']) return;
    await lockPair(pair)

    let buyOrder = await ORDERS.findOne({ pairId: Types.ObjectId(pairId), buysell: 'buy', state: 'active', locked: false, expire_at: { $gt: Date.now() } }).sort({ price: -1, created_at: 1 }).populate({
        path: 'pairId',
        populate: [{
            path: 'first_currency',
            model: 'COINS'
        }, {
            path: 'second_currency',
            model: 'COINS'
        }]
    }).exec()

    let sellOrder = await ORDERS.findOne({ pairId: Types.ObjectId(pairId), buysell: 'sell', state: 'active', locked: false, expire_at: { $gt: Date.now() } }).sort({ price: 1, created_at: 1 }).populate({
        path: 'pairId',
        populate: [{
            path: 'first_currency',
            model: 'COINS'
        }, {
            path: 'second_currency',
            model: 'COINS'
        }]
    }).exec()
    console.log('Buy Order:', buyOrder)
    console.log('Sell Order:', sellOrder)
    if (!buyOrder || !sellOrder) {
        await unlockPair(pair)
        return;
    }
    if (buyOrder['uId'] === sellOrder['uId']) {
        await unlockPair(pair)
        return;
    }
    console.log('Locking orders')
    await lockOrder(buyOrder)
    await lockOrder(sellOrder)
    console.log(`Locked Buy Order :${buyOrder}`)
    console.log(`Locked Sell Order : ${sellOrder}`)
    if (parseFloat(buyOrder['price']).toFixed(8) >= parseFloat(sellOrder['price']).toFixed(8)) {
        const match = await MatchOrder(buyOrder, sellOrder, pairId)
        await unlockOrder(buyOrder)
        await unlockOrder(sellOrder)
        await unlockPair(pair)
        if (match) {
            setTimeout(MatchingEngine, 10, pairId)
            return;
        }
    }

    async function MatchOrder(buyOrder, sellOrder, pairId) {
        return new Promise(async (resolve) => {
            console.log('Match-Order Called')
            if (!buyOrder['uId'] || !sellOrder['uId']) {
                return resolve(0);
            }
            console.log('1-Check amounts')
            if (typeof buyOrder['amount'] != 'number' || parseFloat(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals']) <= 0) {
                buyOrder['done_at'] = Date.now()
                buyOrder['state'] = 'done'
                await buyOrder.save()
                return resolve(0)
            }
            console.log('2-Check amounts')
            if (typeof sellOrder['amount'] != 'number' || parseFloat(sellOrder['amount']).toFixed(sellOrder['pairId']['first_currency']['decimals']) <= 0) {
                sellOrder['done_at'] = Date.now()
                sellOrder['state'] = 'done'
                await buyOrder.save()
                return resolve(0)
            }
            console.log('3-Check amounts')
            const newBuyAmount = parseFloat(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals']) < parseFloat(sellOrder['total']).toFixed(sellOrder['pairId']['first_currency']['decimals']) ? 0 : parseFloat(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals']) - parseFloat(sellOrder['total']).toFixed(sellOrder['pairId']['first_currency']['decimals']);
            const newSellAmount = parseFloat(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals']) < parseFloat(sellOrder['total']).toFixed(sellOrder['pairId']['first_currency']['decimals']) ? parseFloat(sellOrder['amount']).toFixed(sellOrder['pairId']['first_currency']['decimals']) - parseFloat(buyOrder['total']).toFixed(buyOrder['pairId']['second_currency']['decimals']) : 0;
            const priority = buyOrder['created_at'] > sellOrder['created_at'] ? 'buyer' : 'seller';
            const fromBuyerToSeller = parseFloat((Number(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals']) - newBuyAmount).toFixed(buyOrder['pairId']['second_currency']['decimals']));

            const fromSellerToBuyer = priority == 'buyer' ?
                parseFloat(Number(fromBuyerToSeller / buyOrder['price']).toFixed(sellOrder['pairId']['first_currency']['decimals'])) :
                parseFloat(Number(fromBuyerToSeller / sellOrder['price']).toFixed(sellOrder['pairId']['first_currency']['decimals']));

            console.log('4-Check amounts')

            const buyerChange = priority == 'buyer' ?
                (parseFloat(buyOrder['amount']).toFixed(buyOrder['pairId']['second_currency']['decimals'])) - fromBuyerToSeller :
                0.0;

            const buyerFilledUnits = fromBuyerToSeller
            const sellerFilledUnits = fromSellerToBuyer
            const buyerFilledPercentage = parseFloat((buyerFilledUnits / buyOrder['amount']).toFixed(4)) * 100
            const sellerFilledPercentage = parseFloat((sellerFilledUnits / sellOrder['amount']).toFixed(4)) * 100

            console.log('5-Check amounts')

            console.log(`
            newBuyAmount:${newBuyAmount}
            newSellAmount:${newSellAmount}
            priority:${priority}
            fromSellerToBuyer:${fromSellerToBuyer}
            fromBuyerToSeller:${fromBuyerToSeller}
            buyerChange:${buyerChange}
            buyerFilledUnits:${buyerFilledUnits}
            sellerFilledUnits:${sellerFilledUnits}
            buyerFilledPercentage:${buyerFilledPercentage}%
            sellerFillPercentage:${sellerFilledPercentage}%
            `)


            if (newBuyAmount < 0) return resolve(0)
            if (newSellAmount < 0) return resolve(0)
            if (buyerChange < 0) return resolve(0)
            if (fromSellerToBuyer <= 0) return resolve(0)
            if (fromBuyerToSeller <= 0) return resolve(0)

            console.log('6-Check amounts')

            console.log(`
            newBuyAmount:${newBuyAmount}
            newSellAmount:${newSellAmount}
            priority:${priority}
            fromSellerToBuyer:${fromSellerToBuyer}
            fromBuyerToSeller:${fromBuyerToSeller}
            buyerChange:${buyerChange}
            buyerFilledUnits:${buyerFilledUnits}
            sellerFilledUnits:${sellerFilledUnits}
            buyerFilledPercentage:${buyerFilledPercentage}%
            sellerFillPercentage:${sellerFilledPercentage}%
            `)

            const options = {
                fromSellerToBuyer,
                fromBuyerToSeller,
                buyerChange,
                newBuyAmount,
                newSellAmount,
                buyerFilledUnits,
                sellerFilledUnits,
                buyerFilledPercentage,
                sellerFilledPercentage,
            }
            try {
                await checkBalance(buyOrder['_id'], sellOrder['_id'], options)
                await makeTransfers(buyOrder['_id'], sellOrder['_id'], options)
                await updateOrders(options, buyOrder['_id'], sellOrder['_id'])
                await addTradeHistory(pairId, buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, 0)
                io.emit('sellOrders', { pairId })
                io.emit('buyOrders', { pairId })
                return resolve(1)
            } catch (error) {
                console.log(error)
                await errorLogs.create({
                    type: error.message,
                    details: options
                })
                resolve(0)
            }
        })
    }

    async function checkBalance(buyOrderId, sellOrderId, options) {
        return new Promise(async (resolve, reject) => {
            const buyOrder = await ORDERS.findOne({ _id: buyOrderId }).populate({
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
            const sellOrder = await ORDERS.findOne({ _id: sellOrderId }).populate({
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
            const { baseTicker, childTicker } = await getPairTickers(buyOrderId)
            const baseBalance = await balance.getBalance({ query: { coin: baseTicker }, userId: sellOrder['uId'] })
            const childBalance = await balance.getBalance({ query: { coin: childTicker }, userId: buyOrder['uId'] })
            console.log(baseBalance)
            console.log(childBalance)
            if (baseBalance['balance'] < options['fromSellerToBuyer'] || childBalance['balance'] < options['fromBuyerToSeller'])
                return reject(new Error('INSUFICIENT BALANCE'))
            return resolve()
        })
    }

    async function makeTransfers(buyOrderId, sellOrderId, options) {
        return new Promise(async (resolve, reject) => {
            try {
                var buyOrder = await ORDERS.findOne({ _id: buyOrderId }).populate({
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
                var sellOrder = await ORDERS.findOne({ _id: sellOrderId }).populate({
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
            } catch (error) {
                reject(new Error('ORDER TRANSFER FAILED'))
            }

            const { baseTicker, childTicker } = await getPairTickers(buyOrderId)
            const buyerWallets = await getUserWallets(buyOrder['uId'])
            const sellerWallets = await getUserWallets(sellOrder['uId'])
            let baseTransfer = false
            let childTransfer = false
            switch (baseTicker) {
                case 'BTC':
                    try {
                        await btc.decrypt_wallet()
                        const response = await txFactory.sendTx({
                            coin: baseTicker,
                            userId: sellOrder['uId'],
                            amount: options['fromSellerToBuyer'],
                            to: buyerWallets[`${baseTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        if (response['success']) {
                            baseTransfer = true
                        }
                        await btc.encrypt_wallet()
                    } catch (error) {
                        return reject(new Error('BTC TRANSFER FAILED'))
                    }
                    break;
                case 'ETH':
                    try {
                        await eth.decrypt_wallet()
                        const response = await txFactory.sendTx({
                            coin: baseTicker,
                            userId: sellOrder['uId'],
                            amount: options['fromSellerToBuyer'],
                            to: buyerWallets[`${baseTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        if (response['success']) {
                            baseTransfer = true
                        }
                        await eth.encrypt_wallet()

                    } catch (error) {
                        return reject(new Error('ETH TRANSFER FAILED'))
                    }
                    break;
                case 'ETC':
                    try {
                        const response = await txFactory.sendTx({
                            coin: baseTicker,
                            userId: sellOrder['uId'],
                            amount: options['fromSellerToBuyer'],
                            to: buyerWallets[`${baseTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        console.log(response)
                        if (response['success']) {
                            baseTransfer = true
                        }

                    } catch (error) {
                        return reject(new Error('ETC TRANSFER FAILED'))
                    }
                    break;
                case 'ZIPCO':
                    try {
                        const response = await txFactory.sendTx({
                            coin: baseTicker,
                            userId: sellOrder['uId'],
                            amount: options['fromSellerToBuyer'],
                            to: buyOrder['uId'],
                            type: 'TRADE TRANSFER'
                        })
                        if (response) {
                            baseTransfer = true
                        }
                    } catch (error) {
                        return reject(new Error('ZIPCO TRANSFER FAILED'))
                    }
                    break;
            }

            switch (childTicker) {
                case 'BTC':
                    try {
                        await btc.decrypt_wallet()
                        const response = await txFactory.sendTx({
                            coin: childTicker,
                            userId: buyOrder['uId'],
                            amount: options['fromBuyerToSeller'],
                            to: sellerWallets[`${childTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        if (response['success']) {
                            childTransfer = true
                        }
                        await btc.encrypt_wallet()
                    } catch (error) {
                        return reject(new Error('BTC TRANSFER FAILED'))
                    }
                    break;
                case 'ETH':
                    try {
                        await eth.decrypt_wallet()
                        const response = await txFactory.sendTx({
                            coin: childTicker,
                            userId: buyOrder['uId'],
                            amount: options['fromBuyerToSeller'],
                            to: sellerWallets[`${childTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        if (response['success']) {
                            childTransfer = true
                        }
                        await eth.encrypt_wallet()
                    } catch (error) {
                        return reject(new Error('ETH TRANSFER FAILED'))
                    }
                    break;
                case 'EOS':
                    const response = await txFactory.sendTx({
                        coin: childTicker,
                        userId: buyOrder['uId'],
                        amount: options['fromBuyerToSeller'],
                        to: sellOrder['uId'],
                        type: 'TRADE TRANSFER'
                    })
                    if (response)
                        childTransfer = true
                    else
                        return reject(new Error('EOS TRANSFER FAILED'))
                    break;
                case 'ETC':
                    try {
                        const response = await txFactory.sendTx({
                            coin: childTicker,
                            userId: buyOrder['uId'],
                            amount: options['fromBuyerToSeller'],
                            to: sellerWallets[`${childTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        console.log(response)
                        if (response['success']) {
                            childTransfer = true
                        }

                    } catch (error) {
                        return reject(new Error('ETC TRANSFER FAILED'))
                    }
                    break;
                case 'XRP':
                    try {
                        const response = await txFactory.sendTx({
                            coin: childTicker,
                            userId: buyOrder['uId'],
                            amount: options['fromBuyerToSeller'],
                            to: sellerWallets[`${childTicker}`]['address'].split(':')[1],
                            type: 'TRADE TRANSFER'
                        })
                        if (response['status'] === 'SUCCEEDED' || response['status'] === 'PENDING') {
                            childTransfer = true
                        }
                    } catch (error) {
                        return reject(new Error('XRP TRANSFER FAILED'))
                    }
            }
            if (baseTransfer && childTransfer)
                return resolve()
            if (baseTicker === 'ZIPCO' || baseTicker === 'EOS') {
                await eos.reverseTx({
                    coin: baseTicker,
                    userId: sellOrder['uId'],
                    amount: options['fromSellerToBuyer'],
                    to: buyOrder['uId'],
                })
            }
            reject(new Error('ORDER TRANSFER FAILED'))
        })
    }

    async function updateOrders(options, buyOrderId, sellOrderId) {
        return new Promise(async (resolve, reject) => {
            console.log(` 
                ::Update-Orders::
                newBuyAmount:${options['newBuyAmount']}
                newSellAmount:${options['newSellAmount']}
                buyOrderId:${buyOrderId}
                sellOrderId:${sellOrderId}
            `)
            let buyOrder = await ORDERS.findOne({ _id: buyOrderId }).populate({
                path: 'pairId',
                populate: [{
                    path: 'first_currency',
                    model: 'COINS'
                }, {
                    path: 'second_currency',
                    model: 'COINS'
                }]
            }).exec()
            let sellOrder = await ORDERS.findOne({ _id: sellOrderId }).populate({
                path: 'pairId',
                populate: [{
                    path: 'first_currency',
                    model: 'COINS'
                }, {
                    path: 'second_currency',
                    model: 'COINS'
                }]
            }).exec()
            if (!buyOrder || !sellOrder) return reject(new Error('UPDATE ORDER FAILED'))

            sellOrder['ordersId'].push(buyOrder['_id'])
            sellOrder['filledUnits'] = options['sellerFilledUnits']
            sellOrder['filledUnitsPercentage'] = options['sellerFilledPercentage']

            buyOrder['ordersId'].push(sellOrder['_id'])
            buyOrder['filledUnits'] = options['buyerFilledUnits']
            buyOrder['filledUnitsPercentage'] = options['buyerFilledPercentage']
            buyOrder = await buyOrder.save()
            sellOrder = await sellOrder.save()

            if (options['newSellAmount'] != 0 && sellOrder['pairId']['first_currency']['minimumOrder'] < options['newSellAmount']) {
                sellOrder['amount'] = options['newSellAmount'];
                sellOrder = await sellOrder.save()
            }

            if (options['newBuyAmount'] != 0 && buyOrder['pairId']['second_currency']['minimumOrder'] < options['newBuyAmount']) {
                buyOrder['amount'] = options['newBuyAmount'];
                buyOrder = await buyOrder.save()
            }

            if (options['newSellAmount'] < sellOrder['pairId']['first_currency']['minimumOrder'] || options['newSellAmount'] == 0) {
                sellOrder['done_at'] = Date.now()
                sellOrder['state'] = 'done'
                sellOrder = await sellOrder.save()
            }
            if (options['newBuyAmount'] < buyOrder['pairId']['second_currency']['minimumOrder'] || options['newBuyAmount'] == 0) {
                buyOrder['done_at'] = Date.now()
                buyOrder['state'] = 'done'
                buyOrder = await buyOrder.save()
            }
            else {
                sellOrder['updated_at'] = Date.now()
                buyOrder['updated_at'] = Date.now()
                sellOrder['state'] = 'active'
                buyOrder['state'] = 'active'
            }

            await sellOrder.save()
            await buyOrder.save()
            return resolve()
        })
    }

    async function addTradeHistory(pairId, buyOrder, sellOrder, fromSellerToBuyer, fromBuyerToSeller, buyerChange, fees,) {
        return new Promise(async (resolve) => {
            console.log(`
            buyOrderTime:${buyOrder['created_at']}
            sellOrderTime:${sellOrder['created_at']}
            `)
            const buysell = buyOrder['created_at'] < sellOrder['created_at'] ? 'buy' : 'sell';
            await HISTORY.create({
                sellOrderId: sellOrder['_id'],
                buyOrderId: buyOrder['_id'],
                buysell: buysell,
                sellUserId: sellOrder['uId'],
                buyUserId: buyOrder['uId'],
                pairId: pairId,
                fromBuyerToSeller: fromBuyerToSeller,
                fromSellerToBuyer: fromSellerToBuyer,
                buyerChange: buyerChange,
                price: sellOrder['price'],
                fee: fees || 0,
                created_at: Date.now()
            })
            resolve()
        })
    }

    async function getPairTickers(orderId) {
        return new Promise(async (resolve) => {
            const coins = await ORDERS.findOne({ _id: orderId }).populate({
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

            const baseTicker = coins['pairId']['first_currency']['ticker']
            const childTicker = coins['pairId']['second_currency']['ticker']
            resolve({ baseTicker, childTicker })
        })
    }

    async function getUserWallets(uId) {
        return new Promise(async (resolve) => {
            const { wallets } = await USERS.findOne({ _id: uId }).exec()
            return resolve(wallets)
        })
    }

    async function lockPair(pair) {
        return new Promise(async (resolve) => {
            pair['locked'] = true;
            await pair.save()
            resolve()
        })
    }

    async function unlockPair(pair) {
        return new Promise(async (resolve) => {
            pair['locked'] = false;
            await pair.save()
            resolve()
        })
    }

    async function lockOrder(order) {
        return new Promise(async (resolve) => {
            order['locked'] = true;
            await order.save()
            resolve()
        })
    }

    async function unlockOrder(order) {
        return new Promise(async (resolve) => {
            order['locked'] = false
            await order.save()
            resolve()
        })
    }

}

var Init = () => {
    ProcessExchange().then(() => { })
}

module.exports = {
    ProcessExchange: ProcessExchange
}