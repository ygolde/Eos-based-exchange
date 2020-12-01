var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EOSTX = new Schema({
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    amount: { type: Number, default: '' },
    symbol: { type: String, default: 'EOS' },
    quantity: { type: String, default: '' },
    memo: { type: String, default: '' },
    txId: { type: String, default: '' },
});

module.exports = mongoose.model('EOSTX', EOSTX);
