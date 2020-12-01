const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const { MESSAGE } = require('../helpers/messages')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
var Mailchimp = require('mailchimp-api-v3')
var mailchimp = new Mailchimp("b853d98cb2e3bb322c09447518d55b24-us19");

