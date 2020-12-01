var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const REFERRALS = new Schema({
    userFrom: { type: String, maxlength: 60, required: true },
    ip: { type: String, maxlength: 60, required: false },
    timeIn: { type: String, maxlength: 60, required: false },
    timeRegistration: { type: String, maxlength: 255, required: false },
    userRegId: { type: String, maxlength: 255, required: false },
    history: { type: String, maxlength: 255, required: false },
    uid: { type: String, required: false },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('REFERRALS', REFERRALS);
