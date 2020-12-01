var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HISTORY = new Schema({
    buysell: { type: String, enum: ['buy', 'sell'], required: false },
    created_at: { type: Date, default: Date.now() },
    sellOrderId: { type: Schema.Types.ObjectId, ref: 'ORDERS' },
    buyOrderId: { type: Schema.Types.ObjectId, ref: 'ORDERS' },
    sellUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    buyUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    pairId: { type: Schema.Types.ObjectId, ref: 'PAIRS' },
    txIds: { type: Array, default: [] },
    fromSellerToBuyer: { type: Number },
    fromBuyerToSeller: { type: Number },
    buyerChange: { type: Number },
    coin_price: { type: Number },
    price: { type: Number },
    fee: { type: Number },
});

module.exports = mongoose.model('HISTORY', HISTORY);
