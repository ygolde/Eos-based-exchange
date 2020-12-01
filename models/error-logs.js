var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LOGS = new Schema({
    type: { type: String },
    details: { type: Object },
    created_at: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('LOGS', LOGS);
