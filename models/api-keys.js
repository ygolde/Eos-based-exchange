var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const APIKEYS = new Schema({
    username: { type: String, maxlength: 60, required: true },
    uuid: { type: String, maxlength: 255, required: false },
    key: { type: String, maxlength: 60, required: false },
    read: { type: Number, required: false, default: 0 },
    readLimit: { type: Number, required: false },
    write: { type: Number, required: false, default: 0 },
    writeLimit: { type: Number, required: false },
    type: { type: String, required: false, enum: ['free', 'premium'], default: 'free' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('APIKEYS', APIKEYS);
