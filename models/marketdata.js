var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MARKETDATA = new Schema({
    pairId: { type: Schema.Types.ObjectId, required: false, ref: 'PAIRS' },
    type: { type: String, default: 'crypto' },
    last_price: { type: Number, default: 0, required: false },
    dayChange: { type: Number, default: 0, required: false },
    dayVolume: { type: Number, default: 0, required: false },
    marketCap: { type: Number, default: 0, required: false },
    dayHigh: { type: Number, default: 0, required: false },
    dayLow: { type: Number, default: 0, required: false },
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, required: false }
})

module.exports = mongoose.model('MARKETDATA', MARKETDATA);
