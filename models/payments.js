var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PAYMENTS = new Schema({
    userTo: { type: String, maxlength: 60, required: true },
    userFrom: { type: String, maxlength: 60, required: false },
    volume: { type: String, maxlength: 60, required: false },
    coin: { type: String, maxlength: 255, required: false },
    time: { type: String, maxlength: 255, required: false },
    comment: { type: String, maxlength: 255, required: false },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PAYMENTS', PAYMENTS);
