var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DEPARTMENT = new Schema({
    username: { type: String, maxlength: 30, required: true },
    depId: { type: String, maxlength: 30, required: false },
    department: { type: String, maxlength: 255, required: false },
    description: { type: String, default: "", required: false },
    created_by: { type: String, maxlength: 30, required: false },
    enabled: { type: Boolean, default: false, required: false },
    start_date: { type: Date, default: Date.now(), required: false },
    end_date: { type: Date, default: Date.now() + 3600, required: false }
});

module.exports = mongoose.model('DEPARTMENT', DEPARTMENT);
