var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BALANCELOG = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    pairId: { type: Schema.Types.ObjectId, required: false },
    currency: { type: String, default: '', required: false },
    amount: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BALANCELOG', BALANCELOG);
