var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CITIES = new Schema({
    id: { type: String, maxlength: 60 },
    name: { type: String, maxlength: 60 },
    state_id: { type: Schema.Types.ObjectId, ref: 'STATES' },
    country_id: { type: Schema.Types.ObjectId, ref: 'COUNTRIES' }
});

module.exports = mongoose.model('CITIES', CITIES);
