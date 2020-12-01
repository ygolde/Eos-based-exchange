var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const COUNTRIES = new Schema({
    id: { type: String, maxlength: 60, required: true },
    name: { type: String, maxlength: 60, required: true },
    sortname: { type: String, maxlength: 60, required: false },
    phonecode: { type: String, maxlength: 60, required: false }
});

module.exports = mongoose.model('COUNTRIES', COUNTRIES);
