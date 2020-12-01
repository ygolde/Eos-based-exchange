var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BAN = new Schema({
    account: { type: String, maxlength: 20, required: true },
    username: { type: String, maxlength: 30, required: false },
    ip: { type: String, maxlength: 255, required: false },
    country: { type: String, default: "", required: false },
    reason: { type: String, maxlength: 30, required: false },
    banned_by: { type: String, required: false },
    date: { type: Date, default: Date.now(), required: false }
});

module.exports = mongoose.model('BAN', BAN);
