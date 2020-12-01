var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Support = new Schema({
    username: { type: String, maxlength: 60, required: true },
    subject: { type: String, maxlength: 60, required: false },
    message: { type: String, maxlength: 60, required: false },
    status: { type: Boolean, required: false, enum: ['pending', 'resolved', 'conflicted'], default: 'pending' },
    ticket: { type: String, maxlength: 255, required: false },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Support', Support);
