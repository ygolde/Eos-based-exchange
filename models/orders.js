var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ORDERS = new Schema({
    state: { type: String, enum: ['active', 'cancelled', 'done', 'expired'], default: 'active', required: false },
    currencyType: { type: String, enum: ['crypto', 'fiat', 'commodity'], default: 'crypto' },
    buysell: { type: String, maxlength: 60, enum: ['buy', 'sell'], required: true },
    type: { type: String, enum: ['market', 'limit'], required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: false },
    locked: { type: Boolean, required: false, default: false },
    uId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    pairId: { type: Schema.Types.ObjectId, required: true, ref: 'PAIRS' },
    ordersId: [
        { id: { type: Schema.Types.ObjectId, ref: 'ORDERS' } }
    ],
    volume: { type: Number, required: false },
    bid: { type: Number, required: false },
    ask: { type: Number, required: false },
    filledUnits: { type: Number, required: false, default: 0 },
    filledUnitsPercentage: { type: Number, required: false, default: 0 },
    fees: { type: Number, default: 0 },
    done_at: { type: Date, required: false },
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, required: false },
    expire_at: { type: Date, required: false },
});

module.exports = mongoose.model('ORDERS', ORDERS);
 