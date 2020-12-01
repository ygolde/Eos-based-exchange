var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResetPassword = new Schema({
  email: { type: String, maxlength: 60, required: true },
  resetPasswordToken: { type: String, maxlength: 255, required: true },
  status: { type: Boolean, required: true },
  expire: { type: String, maxlength: 255, required: true },
});

module.exports = mongoose.model('ResetPassword', ResetPassword);
