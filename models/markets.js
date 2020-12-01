var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MARKET = new Schema({
    pairId: { type: Schema.Types.ObjectId, required: true },
    open: { type: Number, required: true },
    close: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    created_at: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('MARKET', MARKET);

 