var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BALANCE = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    coinId: { type: Schema.Types.ObjectId, ref:'COINS' },
    currency: { type: String, default: '' },
    deposited: { type: Number, default: 0 },
    withdrawn: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    useBalance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BALANCE', BALANCE);
