const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const fetch = require('node-fetch')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment')
var ta = require('time-ago')
var voucher_codes = require('voucher-code-generator');
const TwoFactor = new (require('2factor'))('d03ce752-7c1e-11e9-ade6-0200cd936042')
const { db } = require('../helpers/db')
const User = require('../models/User')
const LoginHistory = require('../models/login-history')
const ResetPassword = require('../models/reset-password')
var VerifyToken = require('./VerifyToken');
const { generateVerificationHash, verifyHash } = require('dbless-email-verification');
const sendmail = require('sendmail')({
  smtpPort: 25
});
const mail = require('../helpers/mails')
const { MESSAGE } = require('../helpers/messages')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
dotenv.config()

const secret = 'C-!xfLcBV@&BT7JU'

router.post('/login', async function (req, res) {
  console.log(req.body)

  const username = req.body.user.username;
  const password = req.body.user.password;
  const admin = req.body.user.admin;
  const browser = req.body.clientInfo.browser || 'Chrome';
  const ip = req.body.clientInfo.ip || '127.0.0.1';
  const os = req.body.clientInfo.os || 'Windows';
  var tempuser;
  var find = { username };
  if (!username || username === "" || username === undefined
    || !password || password === "" || password === undefined)
    return res.send({ success: false, message: 'Please provide required parameters' })

  if (typeof username != 'string' || username.trim() === '') return res.send({ success: false, message: MESSAGE.M_USERERR })
  if (typeof password != 'string' || password.trim() === '') return res.send({ success: false, message: MESSAGE.M_PASSERR })
  if (typeof admin != 'boolean') return res.send({ success: false, message: MESSAGE.M_ADMINNOTFOUND })

  const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

  if (emailReg.test(username)) {
    find.email = username
    delete find['username']
  }

  switch (Object.keys(find)[0]) {
    case 'username':
      tempuser = await db.collection('users').countDocuments({ username: username, emailStatus: false })
      if (tempuser)
        return res.send({ success: false, message: MESSAGE.M_CHECKEMAIL })
      break;

    case 'email':
      tempuser = await db.collection('user').countDocuments({ email: username, emailStatus: false })
      if (tempuser)
        return res.send({ success: false, message: MESSAGE.M_CHECKEMAIL })
      break;
  }
  var user = await User.findOne(find).exec();
  if (!user)
    return res.send({ success: false, message: 'Username/Password does not match' })
  if (!user['type']['admin']['status'] && admin) {
    return res.send({ success: false, message: 'Please use administrator credentials' })
  }


  if (!user) return res.send({ success: false, message: MESSAGE.M_NOTMATCH });
  var passwordIsValid = bcrypt.compareSync(password, user.password);
  if (!passwordIsValid) return res.send({ success: false, message: MESSAGE.M_NOTMATCH });
  var token = jwt.sign({ id: user._id }, process.env.ENCRYPTION_SECRET, {
    expiresIn: 86400
  });

  var location = await getLocation(ip)
  if (location['status'] === 'fail')
    location = 'Unknown'
  else
    location = `${location['city']},${location['country']}`
  const history = await LoginHistory.create({
    username: user.username || user.email,
    email: user.email,
    browser,
    ip,
    os,
    location
  })

  user['internet_details'] = history._id
  await user.save()

  res.send({ success: true, token: token });
});

router.post('/register', async function (req, res) {

  let { data, request } = req.body;
  const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const re = [/[0-9]/, /[a-z]/, /[A-Z]/]
  if (request === 'send') {

    const valid = await validate_registration(data)
    if (!valid['success']) return res.send(valid)

    if (!emailReg.test(data['email'])) return res.send({ success: false, message: MESSAGE.M_EMAILERR })

    User.find({ email: data['email'] }, async (err, docs) => {
      if (err) {
        return res.send({ success: false, message: MESSAGE.M_INVALID_PARAMETERS })
      }
      if (docs.length) {
        return res.send({ success: false, message: MESSAGE.M_EMAILEXIST })
      } else {
        if (data['password'].length < 8)
          return res.send({ success: false, message: MESSAGE.M_PASSLEN })
        if (!re[0].test(data['password']))
          return res.send({ success: false, message: MESSAGE.M_PASSNUM })
        if (!re[1].test(data['password']))
          return res.send({ success: false, message: MESSAGE.M_PASSSM })
        if (!re[2].test(data['password']))
          return res.send({ success: false, message: MESSAGE.M_PASSCAP })

        const hash = generateVerificationHash(data['email'], secret, 10)
        const verificationURL = `${process.env.HOST}/authentication/verified/?email=${data['email']}&verificationHash=${hash}`;

        sendmail({
          from: 'no-reply@zipcoin.exchange',
          to: data['email'],
          subject: 'Zipcoin Exchange Email Verification Link',
          html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"><head> <meta http-equiv="Content-Type" content="text/html; charset=utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"> <meta http-equiv="X-UA-Compatible" content="IE=Edge"> <style type="text/css"> body, p, div{font-family: inherit; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 100% !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style> <link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet"><style>body{font-family: "Muli", sans-serif;}</style> </head> <body> <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#FFFFFF;"> <div class="webkit"> <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF"> <tbody><tr> <td valign="top" bgcolor="#FFFFFF" width="100%"> <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td width="100%"> <table width="100%" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center"> <tbody><tr> <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;"> <tbody><tr> <td role="module-content"> <p></p></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 20px 30px 20px;" bgcolor="#f6f6f6"> <tbody> <tr role="module-content"> <td height="100%" valign="top"> <table class="column" width="540" style="width:540px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor=""> <tbody> <tr> <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="72aac1ba-9036-4a77-b9d5-9a60d9b05cba"> <tbody> <tr> <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"> <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="29" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/9200c1c9-b1bd-47ed-993c-ee2950a0f239/29x27.png" height="27"> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="331cde94-eb45-45dc-8852-b7dbeb9101d7"> <tbody> <tr> <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor=""> </td></tr></tbody> </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="d8508015-a2cb-488c-9877-d46adf313282"> <tbody> <tr> <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"> <h5 class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="95" alt="" data-proportionally-constrained="true" data-responsive="false" height="33">ZipCoin Exchange</h5> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="27716fe9-ee64-4a64-94f9-a4f28bc172a0"> <tbody> <tr> <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor=""> </td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="948e3f3f-5214-4721-a90e-625a47b1c957" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:50px 30px 18px 30px; line-height:36px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 43px">Thanks for signing up</span></div><div></div></div></td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a10dcb57-ad22-4f4d-b765-1d427dfddb4e" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:18px 30px 18px 30px; line-height:22px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 18px">To complete your account creation process, please click the button below to verify your email address</span><span style="font-size: 18px">.</span></div><div style="font-family: inherit; text-align: center"><span style="color: #dba84e; font-size: 18px"><strong>Thank you!&nbsp;</strong></span></div><div></div></div></td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d"> <tbody> <tr> <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="#ffffff"> </td></tr></tbody> </table><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1"> <tbody> <tr> <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px;"> <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;"> <tbody> <tr> <td align="center" bgcolor=#dba84e class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"> <a href="' + verificationURL + '" style="background-color:#dba84e; border:1px solid #dba84e; border-color:#dba84e; border-radius:0px; border-width:1px; color:#000000; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Verify Email Address </a> </td></tr></tbody> </table> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d.1"> <tbody> <tr> <td style="padding:0px 0px 50px 0px;" role="module-content" bgcolor="#ffffff"> </td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a265ebb9-ab9c-43e8-9009-54d6151b1600" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:50px 30px 50px 30px; line-height:22px; text-align:inherit; background-color:#6e6e6e;" height="100%" valign="top" bgcolor="#6e6e6e" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px"><strong>Here’s what happens next:</strong></span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">1. Register yourself and Login</span></div> <div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">2. Verify &nbsp;and complete your KYC process.</span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">3. Start Trading.'
            + '</span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">If you did not create this account, please email <b>support@zipcoin.exchange</b></span></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">If you did, no further action is required</span></div><div></div></div></td></tr></tbody > </table > <table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1.1"> <tbody> <tr> <td align="center" bgcolor="#6e6e6e" class="outer-td" style="padding:0px 0px 0px 0px;"> <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;"> <tbody> <tr> <td align="center" bgcolor="#dba84e" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"> <a href="' + process.env.HOST + '/home/support" style="background-color:#dba84e; border:1px solid #dba84e; border-color:#dba84e; border-radius:0px; border-width:1px; color:#000000; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Contact Support</a> </td></tr></tbody> </table> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c37cc5b7-79f4-4ac8-b825-9645974c984e"> <tbody> <tr> <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="6E6E6E"> </td></tr></tbody> </table></td ></tr ></tbody > </table > </td ></tr ></tbody > </table ></td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </div ></center > </body ></html >',
        }, async function (err, reply) {
          if (err)
            return res.send({ success: false, message: 'Please try again after some time' })

          var date = new Date()
          const month = date.getMonth() + 1
          const year = date.getFullYear()
          const random = Math.floor((Math.random() * 90) + 10);
          data['password'] = bcrypt.hashSync(data['password'], bcrypt.genSaltSync(8), null);
          const memo = await get_eos_memo()
          const tag = await get_xrp_tag()
          await User.create({
            account: `EXE-${data['country']}${month}${year}${data['mobile']['number'].substr(data['mobile']['number'].length - 3)}${random}`,
            username: data['fname'][0] + data['lname'],
            refferral_code: data['lname'] + data['mobile']['number'].substr(data['mobile']['number'].length - 4),
            email: data['email'],
            password: data['password'],
            mobile: data['mobile'],
            personalInfo: {
              fname: data['fname'],
              mname: data['mname'],
              lname: data['lname'],
              gender: data['gender'],
              dob: data['dob'],
              occupation: data['occupation'],
              country: data['country'],
              province: data['province'],
              city: data['city'],
              address: data['address'],
              ssn: data['ssn'],
              last_ssn: data['last_ssn'],
              postal_code: data['postal_code']
            },
            emailStatus: false,
            image: {
              image: 'https://dev.zipcoin.exchange/api/kyc/getDummyImage',
              contentType: 'image/png'
            },
            type: {
              user: {
                status: true
              }
            },
            wallets: {
              XRP: {
                tag: tag
              },
              EOS: {
                memo: memo
              },
              ZIPCO: {
                memo: memo
              }
            }
          })
          return res.send({ success: true, message: 'Verification mail sent successfully on ' + data['email'] })
        });

      }
    })
  }

});

router.get('/verifyemail/', async function (req, res) {
  var { email, verificationHash } = req.query;
  var token = ""
  let user = await User.findOne({ email: email }).exec()
  token = jwt.sign({ id: user._id }, process.env.ENCRYPTION_SECRET, {
    expiresIn: 86400
  });
  if (user['emailStatus'])
    return res.send({ success: false, redirect: true, token })

  const isEmailVerified = verifyHash(verificationHash, email, secret)
  console.log('Is verified', isEmailVerified)
  if (isEmailVerified) {


    sendmail({
      from: 'no-reply@zipcoin.exchange',
      to: email,
      subject: 'Zipcoin Exchange Email Verification',
      html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"><head> <meta http-equiv="Content-Type" content="text/html; charset=utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"> <meta http-equiv="X-UA-Compatible" content="IE=Edge"> <style type="text/css"> body, p, div{font-family: inherit; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 100% !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style> <link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet"><style>body{font-family: "Muli", sans-serif;}</style> </head> <body> <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#FFFFFF;"> <div class="webkit"> <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF"> <tbody><tr> <td valign="top" bgcolor="#FFFFFF" width="100%"> <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td width="100%"> <table width="100%" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center"> <tbody><tr> <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;"> <tbody><tr> <td role="module-content"> <p></p></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 20px 30px 20px;" bgcolor="#f6f6f6"> <tbody> <tr role="module-content"> <td height="100%" valign="top"> <table class="column" width="540" style="width:540px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor=""> <tbody> <tr> <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="72aac1ba-9036-4a77-b9d5-9a60d9b05cba"> <tbody> <tr> <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"> <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="29" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/9200c1c9-b1bd-47ed-993c-ee2950a0f239/29x27.png" height="27"> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="331cde94-eb45-45dc-8852-b7dbeb9101d7"> <tbody> <tr> <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor=""> </td></tr></tbody> </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="d8508015-a2cb-488c-9877-d46adf313282"> <tbody> <tr> <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"> <h5 class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="95" alt="" data-proportionally-constrained="true" data-responsive="false" height="33">ZipCoin Exchange</h5> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="27716fe9-ee64-4a64-94f9-a4f28bc172a0"> <tbody> <tr> <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor=""> </td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="948e3f3f-5214-4721-a90e-625a47b1c957" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:50px 30px 18px 30px; line-height:36px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 43px">Thanks for email verification</span></div><div></div></div></td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a10dcb57-ad22-4f4d-b765-1d427dfddb4e" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:18px 30px 18px 30px; line-height:22px; text-align:inherit; background-color:#ffffff;" height="100%" valign="top" bgcolor="#ffffff" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 18px">Enjoy Zipcoin Exchange Easy , Fast & Secure Trading Platform</span><span style="color: #000000; font-size: 18px; font-family: arial,helvetica,sans-serif"> </span><span style="font-size: 18px">.</span></div><div style="font-family: inherit; text-align: center"><span style="color: #dba84e; font-size: 18px"><strong>Thank you!&nbsp;</strong></span></div><div></div></div></td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d"> <tbody> <tr> <td style="padding:0px 0px 20px 0px;" role="module-content" bgcolor="#ffffff"> </td></tr></tbody> </table><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1"> <tbody> <tr> <td align="center" bgcolor="#ffffff" class="outer-td" style="padding:0px 0px 0px 0px;"> <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">  </table> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="7770fdab-634a-4f62-a277-1c66b2646d8d.1"> <tbody> <tr> <td style="padding:0px 0px 50px 0px;" role="module-content" bgcolor="#ffffff"> </td></tr></tbody> </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a265ebb9-ab9c-43e8-9009-54d6151b1600" data-mc-module-version="2019-10-22"> <tbody> <tr> <td style="padding:50px 30px 50px 30px; line-height:22px; text-align:inherit; background-color:#6e6e6e;" height="100%" valign="top" bgcolor="#6e6e6e" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px"><strong>Here’s what happens next:</strong></span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">1. Upload your resume &nbsp;and we\'ll keep it on file for every job submission.</span></div> <div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">2. Submit and edit personalized cover letters for every job you apply to.</span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">3. Get access to our career coaches when you need 1:1 help with your job application.'
        + '</span></div><div style="font-family: inherit; text-align: center"><span style="color: #dba84e; font-size: 18px"><strong>+ much more!</strong></span></div><div style="font-family: inherit; text-align: center"><br></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">Need support? Our support team is always</span></div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 18px">ready to help!&nbsp;</span></div><div></div></div></td></tr></tbody > </table > <table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="d050540f-4672-4f31-80d9-b395dc08abe1.1"> <tbody> <tr> <td align="center" bgcolor="#6e6e6e" class="outer-td" style="padding:0px 0px 0px 0px;"> <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;"> <tbody> <tr> <td align="center" bgcolor="#dba84e" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"> <a href="" style="background-color:#dba84e; border:1px solid #dba84e; border-color:#dba84e; border-radius:0px; border-width:1px; color:#000000; display:inline-block; font-size:14px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:12px 40px 12px 40px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Contact Support</a> </td></tr></tbody> </table> </td></tr></tbody> </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="c37cc5b7-79f4-4ac8-b825-9645974c984e"> <tbody> <tr> <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="6E6E6E"> </td></tr></tbody> </table></td ></tr ></tbody > </table > </td ></tr ></tbody > </table ></td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </td ></tr ></tbody ></table > </div ></center > </body ></html >',
    }, async function (err, reply) {
      if (err)
        return res.send({ success: false, message: err.message })

      user['emailStatus'] = true
      await user.save()
      token = jwt.sign({ id: user._id }, process.env.ENCRYPTION_SECRET, {
        expiresIn: 86400
      });
      return res.send({ success: true, token, redirect: false, message: MESSAGE.M_EMAILVERIFIED })
    })

  }
  else {
    return res.send({ success: false, redirect: false, message: 'Please verify your email with valid verification link' })
  }
});

router.get('/send_password_reset_link', async function (req, res) {
  const { email } = req.query
  const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || email == "" || email == undefined) return res.send({ success: false, message: MESSAGE.M_EMAILERR })
  if (!emailReg.test(email)) return res.send({ success: false, message: MESSAGE.M_EMAILERR })

  User
    .findOne({ email: email })
    .then(async function (user) {
      if (!user) {
        return res.send({ success: false, message: MESSAGE.M_MAILNOTEXIST })
      }
      await ResetPassword.remove({ email: user.email }).exec()
      // token = crypto.randomBytes(32).toString('base64')
      const token = generateVerificationHash(email, secret, 10)
      // token = token.replace("+", "a")
      ResetPassword.create({
        email: user.email,
        resetPasswordToken: token,
        status: false,
        expire: moment.utc().add(process.env.RESET_EXPIRY, 'seconds'), //10 minutes
      }).then(async function (item) {
        if (!item)
          return res.send({ success: false, message: MESSAGE.M_PASSOOPS })
        let mailOptions = {
          from: 'no-reply@zipcoin.exchange',
          to: user.email,
          subject: 'Reset your account password',
          email: user.email,
          token: token
        }
        let mailSent = await mail.sendPasswordResetMail(mailOptions)
        return res.send(mailSent)
      })
    })
})

router.get('/reset_token', async function (req, res) {
  console.log('reset_token')
  const { email, token } = req.query;
  console.log(req.query)
  ResetPassword.findOne({ email: email }, async function (err, user) {
    if (err) return res.send({ success: false, message: MESSAGE.M_USRNOTFOUND })
    if (!user) return res.send({ success: false, message: MESSAGE.M_USRNOTFOUND })
    const isValid = verifyHash(token, email, secret)
    console.log('Is verified', isValid)
    if (isValid) {
      return res.send({ success: true });
    }
    else {
      return res.send({ success: false, message: 'Please use valid reset link' });
    }
  });
})

router.get('/getProfile', VerifyToken, function (req, res, next) {
  console.log('-------------------GetProfile----------------------')
  console.log('Query::', req.query.userId)
  let userId = req.userId;
  if (req.query['userId']) {
    userId = req.query.userId
  }
  User.findById(userId, { password: 0 }, function (err, user) {
    if (err) return res.status(500).send({ success: false, message: MESSAGE.M_SERVERERR });
    if (!user) return res.send({ success: false, message: MESSAGE.M_USRNOTFOUND });
    delete user['TFA']
    delete user['password'];
    delete user['_id']
    res.send({ success: true, message: user });
  });
});

router.get('/loginhistory', VerifyToken, async (req, res) => {
  console.log('-------------------LoginHistory----------------------')
  const userId = req.userId;
  const user = await User.findById(userId)
  let history = await LoginHistory.find({ username: user['username'] })
  let records = []
  for (let i = 0; i < history.length; i++) {
    records.push({
      browser: history[i]['browser'],
      ip: history[i]['ip'],
      location: history[i]['location'],
      os: history[i]['os'],
      username: history[i]['username'],
      email: history[i]['email'],
      created_at: ta.ago(history[i]['created_at'])
    })
  }

  console.log(history)
  res.send({ success: true, history: records })
})

router.post('/loginactivity', VerifyToken, async (req, res) => {
  console.log('-------------------LoginActivity----------------------')
  const userId = req.userId;
  const clientInfo = req.body;
  var user = await User.findById({ _id: userId })
  user.loginActivity.push(clientInfo);
  await user.save()
  res.send({ success: true })
})

router.post('/token_validate', async (req, res) => {

  let token = req.body.recaptcha;
  const secretkey = "6LfuyvQUAAAAABMubw7P6DkBlTr8FsZyTPoULgeY";
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${token}&remoteip=${req.connection.remoteAddress}`

  if (token === null || token === undefined) {
    console.log("token empty");
    return res.send({ success: false, message: "Token is empty or invalid" })
  }

  fetch(url)
    .then(resp => resp.json())
    .then(json => {
      return res.send(json)
    })
})

router.get('/get_countries', async (req, res) => {
  console.log('Fetching all countries')
  const url = "https://restcountries.eu/rest/v2/all"
  fetch(url)
    .then(resp => resp.json())
    .then(json => {
      console.log(json)
      return res.send(json)
    })
})


router.get('/get_all_countries', async (req, res) => {
  console.log('get_all_countries')
  const url = "http://battuta.medunes.net/api/country/all/?key=a4947ab3dc38ea0324084737463b87b7"
  fetch(url)
    .then(resp => resp.json())
    .then(json => {
      return res.send(json)
    })
})

router.get('/get_all_regions', async (req, res) => {
  const { country_code } = req.query
  const url = `http://battuta.medunes.net/api/region/${country_code}/all/?key=a4947ab3dc38ea0324084737463b87b7`
  fetch(url)
    .then(resp => resp.json())
    .then(json => {
      return res.send(json)
    })
})

router.get('/get_all_cities', async (req, res) => {
  const { country_code, region } = req.query
  const url = `http://battuta.medunes.net/api/city/${country_code}/search/?region=${region}&key=a4947ab3dc38ea0324084737463b87b7`
  fetch(url)
    .then(resp => resp.json())
    .then(json => {
      return res.send(json)
    })
})

router.get('/get-ip-location', async (req, res) => {
  const ip = req.query.ip
  const location = await getLocation(ip)
  res.send(location)
})

module.exports = router;

var getLocation = async (ip) => {
  return new Promise((resolve) => {
    fetch(`http://ip-api.com/json/${ip}`)
      .then(res => res.json())
      .then(json => resolve(json))
  })
}


const send_sms = async (phoneNumber, otp, template) => {
  return new Promise((resolve) => {
    TwoFactor.sendOTP(phoneNumber, { otp, template })
      .then((sessionId) => {
        console.log(sessionId)
        resolve(sessionId)
      },
        (err) => {
          console.log(err)
          resolve(err)
        })
  })
}

const validate_registration = async (data) => {
  return new Promise((resolve) => {
    if (!data['fname'] || data['fname'] == '') return resolve({ success: false, message: 'Please provide your First Name' })
    if (!data['lname'] || data['lname'] == '') return resolve({ success: false, message: 'Please provide your Last Name' })
    if (!data['email'] || data['email'] == '') return resolve({ success: false, message: 'Please provide Email Address' })
    if (!data['password'] || data['password'] == '') return resolve({ success: false, message: 'Please provide Password' })
    if (!data['confirm_password'] || data['confirm_password'] == '') return resolve({ success: false, message: 'Please confirm your password' })
    if (!data['gender'] || data['gender'] == '') return resolve({ success: false, message: 'Please select your gender' })
    if (!data['dob'] || data['dob'] == '') return resolve({ success: false, message: 'Please provide your DOB' })
    if (!data['occupation'] || data['occupation'] == '') return resolve({ success: false, message: 'Please provide your profession' })
    if (!data['country'] || data['country'] == '') return resolve({ success: false, message: 'Please select your country' })
    if (!data['province'] || data['province'] == '') return resolve({ success: false, message: 'Please select state/province' })
    if (!data['city'] || data['city'] == '') return resolve({ success: false, message: 'Please select your city' })
    if (!data['address'] || data['address'] == '') return resolve({ success: false, message: 'Please provide your address' })
    if (!data['mobile']) return resolve({ success: false, message: 'Please provide your mobile number' })
    if (data['password'] !== data['confirm_password']) return resolve({ success: false, message: 'Password are not matching' })
    if (!data['signterms']) return resolve({ success: false, message: 'Please accept our privacy terms' })
    if (data['country'] == 'us') {
      if (!data['ssn']) return resolve({ success: false, message: 'Please provide Social Security Number' })
      if (!data['last_ssn']) return resolve({ success: false, message: 'Please provide last 4 digits of SSN' })
      if (!data['postal_code']) return resolve({ success: false, message: 'Please provide postal code' })
    }

    return resolve({ success: true })
  })
}

var get_eos_memo = async () => {
  return new Promise((resolve) => {
    const code = voucher_codes.generate({
      length: 8,
      prefix: "ZIPCX-",
      charset: voucher_codes.charset("alphabetic")
    });
    resolve(code[0])
  })
}

var get_xrp_tag = async () => {
  return new Promise((resolve) => {
    const code = voucher_codes.generate({
      length: 8,
      charset: voucher_codes.charset("numbers")
    });
    resolve(code[0])
  })
}