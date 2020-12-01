var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WALLETS = new Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    coin: { type: Number, default: 0, required: true },
    accountIndex: { type: Number, default: 0, required: true },
    chainIndex: { type: Number, default: 0, required: true },
    addressIndex: { type: Number, default: 0, required: true }
});

module.exports = mongoose.model('WALLETS', WALLETS);
