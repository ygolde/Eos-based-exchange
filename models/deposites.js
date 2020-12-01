var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DEPOSITES = new Schema({
    state: { type: String, enum: ['confirmed', 'pending'], required: false },
    userId: { type: String, maxlength: 60, required: true },
    currency: { type: String, default: '', required: true },
    created_at: { type: Date, default: Date.now() },
    amount: { type: Number, required: true },
    txId: { type: String, required: false },
    paymentId: { type: String, required: false },
    type: { type: String, required: false },
    fee: { type: Number, required: false },
    receipt_url: { type: String, default: '' }
});

module.exports = mongoose.model('DEPOSITES', DEPOSITES);
