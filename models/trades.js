var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TRADES = new Schema({
    pairId: { type: Schema.Types.ObjectId, required: true },
    price: { type: String, maxlength: 60, required: true },
    volume: { type: String, maxlength: 60, required: true },
    askId: { type: Schema.Types.ObjectId, required: false },
    bidId: { type: Schema.Types.ObjectId, required: false },
    askMemberId: { type: Schema.Types.ObjectId, required: false },
    bidMemberId: { type: Schema.Types.ObjectId, required: false },
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, required: false }
});

module.exports = mongoose.model('TRADES', TRADES);
