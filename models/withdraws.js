var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WITHDRAW = new Schema({
    userId: { type: String, maxlength: 60, required: true },
    currency: { type: String, maxlength: 60, required: false },
    amount: { type: Number, required: false },
    fee: { type: String, required: false },
    txId: { type: String, required: false },
    state: { type: String, required: false },
    destination: { type: String, default: 'card', required: false },
    created_at: { type: Boolean, required: false, default: true },
    updated_at: { type: Date, default: Date.now },
    type: { type: String, required: false },
});

module.exports = mongoose.model('WITHDRAW', WITHDRAW);
