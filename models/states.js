var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const STATES = new Schema({
    id: { type: String, maxlength: 60, required: true },
    name: { type: String, maxlength: 60, required: true },
    country_id: { type: Schema.Types.ObjectId, ref: 'COUNTRIES', required: true },
});

module.exports = mongoose.model('STATES', STATES);
