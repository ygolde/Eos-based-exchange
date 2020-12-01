var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LoginHistory = new Schema({
    username: { type: String, maxlength: 60, required: true },
    email: { type: String, maxlength: 60, required: true },
    browser: { type: String, default: '', required: false },
    ip: { type: String, default: '', required: false },
    location: { type: String, default: '', required: false },
    os: { type: String, default: '', required: false },
    created_at: { type: Date, default: Date.now }

});

module.exports = mongoose.model('LoginHistory', LoginHistory);
