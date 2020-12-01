var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RATES = new Schema({
    rate: { type: Object, default: {} },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RATES', RATES);
