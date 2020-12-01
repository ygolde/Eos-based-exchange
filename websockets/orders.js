const ORDERS = require('../models/orders')
var mongoose = require('mongoose');

const Orders = function (socket, engineSocket) {
    this.engineSocket = engineSocket;
    this.socket = socket;
    this.handler = {};

    this.engineSocket.on('sellOrders', async (data) => {
        console.log(socket.userId)
        const response = await getSellOrders(data, socket.userId)
        this.socket.emit('sellorders', response)
    })
    this.engineSocket.on('buyOrders', async (data) => {
        const response = await getBuyOrders(data, socket.userId)
        this.socket.emit('buyorders', response)
    })
}

const getSellOrders = async (data, uId) => {
    const { pairId } = data;
    if (pairId) {
        const orders = await ORDERS.find({ uId: { $ne: uId }, buysell: 'sell', pairId: mongoose.Types.ObjectId(pairId), state: 'active' }).exec()
        return { pairId, orders }
    }
    else {
        return { pairId, orders: [] }
    }
}

const getBuyOrders = async (data, uId) => {
    const { pairId } = data;
    if (pairId) {
        const orders = await ORDERS.find({ uId: { $ne: uId }, buysell: 'buy', pairId: mongoose.Types.ObjectId(pairId), state: 'active' }).exec()
        return { pairId, orders }
    } else {
        return { pairId, orders: [] }
    }
}

module.exports = Orders;