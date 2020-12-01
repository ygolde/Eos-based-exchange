var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const COINS = new Schema({
    name: { type: String, maxlength: 60, required: true },
    ticker: { type: String, maxlength: 60, required: false },
    decimals: { type: Number, default: 8 },
    step: { type: Number, default: 0.00000001 },
    icon: { type: String, maxlength: 60, required: false },
    minimumOrder: { type: Number, default: 0.0001 },
    maximumOrder: { type: Number, default: 100 },
    state: { type: Boolean, required: false, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, required: false }
});

module.exports = mongoose.model('COINS', COINS);
 