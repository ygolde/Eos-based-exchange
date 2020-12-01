var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PAIRS = new Schema({
    type: { type: String, enum: ['crypto', 'fait', 'commodity'], required: true },
    first_currency: { type: Schema.Types.ObjectId, required: true,ref:'COINS' },
    second_currency: { type: Schema.Types.ObjectId, required: true, ref: 'COINS' },
    state: { type: Boolean, default: true, required: false },
    baseCoin: { type: Schema.Types.ObjectId, required: false, ref: 'COINS'},
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, required: false },
    locked: { type: Boolean, default: false }
});

module.exports = mongoose.model('PAIRS', PAIRS); 