var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ALERTS = new Schema({
    alertId: { type: String, maxlength: 20, required: true },
    alertType: { type: String, maxlength: 20, required: false },
    description: { type: String, maxlength: 255, required: false },
    status: { type: Boolean, default: false, required: false },
    created_by: { type: String, maxlength: 30, required: false },
    creation_date: { type: Date, default: Date.now(), required: false },
    from_date: { type: Date, required: false },
    to_date: { type: Date, required: false }
});

module.exports = mongoose.model('ALERTS', ALERTS);
