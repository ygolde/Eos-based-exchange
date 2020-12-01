const express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fetch = require('node-fetch')
const User = require('../models/User')
const System = require('../models/system')
const bodyParser = require('body-parser');
const { MESSAGE } = require('../helpers/messages')
var voucher_codes = require('voucher-code-generator');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const server = 'https://dev.zipcoin.exchange'
//const server = 'http://localhost:4000'
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
var limits = {
    files: 1,
    fileSize: 2 * 1024 * 1024,
};

var fileFilter = function (req, file, cb) {
    // supported image file mimetypes
    var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png'];

    if (allowedMimes.includes(file.mimetype)) {
        // allow supported image files
        cb(null, true);
    } else {
        // throw error for invalid files
        cb(new Error('Invalid file type. Only jpg and png image files are allowed.'));
    }
};

var upload = multer({
    storage,
    limits,
    fileFilter
}).single('file')

const generate_referral_code = async () => {
    return new Promise((resolve) => {
        const date = new Date()
        const code = voucher_codes.generate({
            length: 8,
            prefix: "EXE",
            postfix: `${date.getFullYear()}`,
            charset: voucher_codes.charset("alphabetic")
        });
        return resolve(code[0])
    })
}

const generate_password = () => {
    return new Promise((resolve) => {
        const password = voucher_codes.generate({
            length: 8,
            charset: voucher_codes.charset("alphanumeric")
        });
        const hashed_password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
        return resolve({ password, hashed_password })
    })
}

const iso_date_to_simple_date = (d) => {
    const date = new Date(d)
    const dob = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    return dob
}

router.get('/users', async (req, res) => {
    var temp_users = await User.find({ "type.user.status": true },
        {
            password: 0,
            wallets: 0,
            emailStatus: 0,
            resetStatus: 0,
            isOTP: 0,
            isOnline: 0,
            withdrawBlock: 0,
            phone_code: 0,
            image: 0,
            "kyc.front": 0,
            "kyc.back": 0,
            "kyc.signature": 0,
            "kyc.selfie": 0,
            "kyc.detail.documentType": 0,
            "kyc.detail.documentNumber": 0,
            "kyc.detail.issueDate": 0,
            "kyc.detail.expiryDate": 0,
            "kyc.detail.expireCheck": 0
        }).populate('internet_details').exec()
    var all_user = []
    temp_users.forEach(user => {
        all_user.push({
            id: user['_id'],
            username: user['username'],
            account: user['account'],
            fname: user['personalInfo']['fname'],
            mname: user['personalInfo']['mname'],
            lname: user['personalInfo']['lname'],
            dob: iso_date_to_simple_date(user['personalInfo']['dob']),
            email: user['email'],
            mobile: user['mobile'],
            date: user['date'],
            refferral_code: user['refferral_code'],
            kyc: user['kyc']['detail']['status'],
            country: code_to_name[`${user['personalInfo']['country']}`],
            lock: user['isLocked'],
            status: user['status'],
            browser: user['internet_details'] === undefined ? 'Unknown' : user['internet_details']['browser'],
            ip: user['internet_details'] === undefined ? 'xx.xx.xx.xx' : user['internet_details']['ip'],
            os: user['internet_details'] === undefined ? 'Unknown' : user['internet_details']['os']
        })
    })

    res.send({ success: true, message: all_user })
})

router.post('/save_new_user', async (req, res) => {
    var data = {}
    data = req.body
    data['refferral_code'] = await generate_referral_code()
    console.log(data['refferral_code'])
    const passwords = await generate_password()
    console.log(passwords)
    data['password'] = passwords['password']
    data['tempPassword'] = passwords['hashed_password']
    console.log(data)
    const { country } = data
    var date = new Date()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const mobile = data['mobile'].substr(data['mobile'].length - 3)
    const random = Math.floor((Math.random() * 90) + 10);
    var account = `EXE-${name_to_code[`${country}`]}${month}${year}${mobile}${random}`
    console.log(account)
    // await User.create({
    // })
    res.send({ success: true, message: 'Successfully added' })
})

router.post('/save_edit_user', async (req, res) => {
    const data = req.body
    var user = await User.findOne({ username: req.body['username'] }).exec()
    user['personalInfo']['fname'] = data['fname']
    user['personalInfo']['lname'] = data['lname']
    user['personalInfo']['country'] = name_to_code[`${data['country']}`]
    user['email'] = data['email']
    user['mobile'] = data['mobile']
    user['status'] = data['status']
    user['isLocked'] = data['lock']
    user['kyc']['detail']['status'] = data['kyc']
    user['refferral_code'] = data['refferral_code']
    await user.save()
    console.log(user)
    res.send({ success: true, message: "Successfully updated" })
})

router.post('/save_basic_information', async (req, res) => {
    const data = req.body
    var user = await User.findOne({ username: req.body['username'] }).exec()
    user['personalInfo']['dob'] = data['dob']
    user['personalInfo']['city'] = data['city']
    user['personalInfo']['fname'] = data['fname']
    user['personalInfo']['lname'] = data['lname']
    user['personalInfo']['gender'] = data['gender']
    user['personalInfo']['address'] = data['address']
    user['personalInfo']['province'] = data['province']
    user['personalInfo']['occupation'] = data['occupation']
    user['personalInfo']['country'] = data['country']
    await user.save()
    console.log(user)
    res.send({ success: true, message: "Successfully updated" })
})

router.post('/save_account_information', async (req, res) => {
    const data = req.body
    console.log(data)
    var user = await User.findOne({ username: req.body['username'] }).exec()
    user['email'] = data['email']
    user['mobile'] = data['mobile']
    user['status'] = data['status']
    await user.save()
    res.send({ success: true, message: "Successfully updated" })
})

router.post('/change_password', async (req, res) => {
    console.log(req.body)
    var { username, password } = req.body
    const re = [/[0-9]/, /[a-z]/, /[A-Z]/]
    if (password.length < 8)
        return res.send({ success: false, message: MESSAGE.M_PASSLEN })
    if (!re[0].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSNUM })
    if (!re[1].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSSM })
    if (!re[2].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSCAP })
    password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    var user = await User.findOne({ username }).exec()
    user['password'] = password
    await user.save()
    res.send({ success: true, message: 'Password successfully changed' })
})

router.post('/change_user_profile_image', async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.send({ success: false, message: err.message })
        } else if (err) {
            return res.send({ success: false, message: err.message })
        }
        console.log(req.body)
        const { username } = req.body;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        let user = await User.findOne({ username }).exec()
        user.image = image;
        await user.save()
        return res.send({ success: true, message: "Upload successfully" })
    })
})

router.post('/delete_users', async (req, res) => {
    const users = req.body
    users.forEach(user => {
        User.deleteOne({ username: user['username'] }, (err) => {
        })
    })
    res.send({ success: true, message: 'Records deleted successfully' })
})

router.post('/set_active_state', async (req, res) => {
    const users = req.body
    console.log(users)
    users.forEach(user => {
        User.findOne({ username: user['username'] }, async (err, doc) => {
            doc['status'] = 'ACTIVE'
            await doc.save()
        })
    })
    res.send({ success: true, message: 'Records updated successfully' })
})

router.post('/set_blocked_state', async (req, res) => {
    const users = req.body
    console.log(users)
    users.forEach(user => {
        User.findOne({ username: user['username'] }, async (err, doc) => {
            doc['status'] = 'BLOCKED'
            await doc.save()
        })
    })
    res.send({ success: true, message: 'Records updated successfully' })
})

router.post('/set_locked_state', async (req, res) => {
    const users = req.body
    console.log(users)
    users.forEach(user => {
        User.findOne({ username: user['username'] }, async (err, doc) => {
            doc['isLocked'] = 'LOCKED'
            await doc.save()
        })
    })
    res.send({ success: true, message: 'Records updated successfully' })
})

router.post('/set_unlocked_state', async (req, res) => {
    const users = req.body
    console.log(users)
    users.forEach(user => {
        User.findOne({ username: user['username'] }, async (err, doc) => {
            doc['isLocked'] = 'UNLOCKED'
            await doc.save()
        })
    })
    res.send({ success: true, message: 'Records updated successfully' })
})

router.post('/set_document_status', async (req, res) => {
    const data = req.body
    var user = await User.findOne({ username: data['username'] })
    user['kyc'][`${data['document']}`]['status'] = data['status']
    user['kyc'][`${data['document']}`]['reason'] = data['reason']
    await user.save()
    res.send({ success: true, message: 'Status updated successfully' })
})

router.get('/wallet_balances', async (req, res) => {
    const { address } = req.query
    var balance = 0;
    const { unspent } = await get_data(`https://api.smartbit.com.au/v1/blockchain/address/${address}/unspent?sort=id`)
    if (unspent.length) {
        unspent.forEach(tx => {
            const { value_int } = tx
            balance = balance + parseInt(value_int)
        })
        return res.send({ success: true, balance: `${balance / 100000000} BTC` })
    }
    return res.send({ success: true, balance })
})

router.get('/get-fees-data', async (req, res) => {
    const settings = await System.find({});
    const { fees } = settings[0]
    res.send({ fees })
})

const get_data = async url => {
    return new Promise(async (resolve) => {
        try {
            const response = await fetch(url);
            const json = await response.json();
            return resolve(json)
        } catch (error) {
            resolve({})
        }
    })
};

var name_to_code = {
    "Afghanistan": "AF",
    "Åland Islands": "AX",
    "Albania": "AL",
    "Algeria": "DZ",
    "American Samoa": "AS",
    "Andorra": "AD",
    "Angola": "AO",
    "Anguilla": "AI",
    "Antarctica": "AQ",
    "Antigua and Barbuda": "AG",
    "Argentina": "AR"
}

var code_to_name = {
    "AF": "Afghanistan",
    "AX": "Åland Islands",
    "AL": "Albania",
    "DZ": "Algeria",
    "AS": "American Samoa",
    "AD": "Andorra",
    "AO": "Angola",
    "AI": "Anguilla",
    "AQ": "Antarctica",
    "AG": "Antigua and Barbuda",
    "AR": "Argentina",
    "AM": "Armenia",
    "AW": "Aruba",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BS": "Bahamas",
    "BH": "Bahrain",
    "BD": "Bangladesh",
    "BB": "Barbados",
    "BY": "Belarus",
    "BE": "Belgium",
    "BZ": "Belize",
    "BJ": "Benin",
    "BM": "Bermuda",
    "BT": "Bhutan",
    "BO": "Bolivia, Plurinational State of",
    "BQ": "Bonaire, Sint Eustatius and Saba",
    "BA": "Bosnia and Herzegovina",
    "BW": "Botswana",
    "BV": "Bouvet Island",
    "BR": "Brazil",
    "IO": "British Indian Ocean Territory",
    "BN": "Brunei Darussalam",
    "BG": "Bulgaria",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "KH": "Cambodia",
    "CM": "Cameroon",
    "CA": "Canada",
    "CV": "Cape Verde",
    "KY": "Cayman Island",
    "CF": "Central African Republic",
    "TD": "Chad",
    "CL": "Chile",
    "CN": "China",
    "CX": "Christmas Island",
    "CC": "Cocos (Keeling) Islands",
    "CO": "Colombia",
    "KM": "Comoros",
    "CG": "Congo",
    "CD": "Congo, the Democratic Republic of the",
    "CK": "ook Islands",
    "CR": "Costa Rica",
    "CI": "Côte d'Ivoire",
    "HR": "Croatia",
    "CU": "Cuba",
    "CW": "Curaçao",
    "CY": "Cyprus",
    "CZ": "Czech Republic",
    "DK": "Denmark",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "DO": "Dominican Republic",
    "EC": "Ecuador",
    "EG": "Egypt",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "EE": "Estonia",
    "ET": "Ethiopia",
    "FK": "Falkland Islands (Malvinas)",
    "FO": "Faroe Islands",
    "FJ": "Fiji",
    "FI": "Finland",
    "FR": "France",
    "GF": "French Guiana",
    "PF": "French Polynesia",
    "TF": "French Southern Territories",
    "GA": "Gabon",
    "GM": "Gambia",
    "GE": "Georgia",
    "DE": "Germany",
    "GH": "Ghana",
    "GI": "Gibraltar",
    "GR": "Greece",
    "GL": "Greenland",
    "GD": "",
    "GP": "",
    "GU": "",
    "GT": "",
    "GG": "",
    "GN": "",
    "GW": "",
    "GY": "",
    "HT": "",
    "HM": "",
    "VA": "",
    "HN": "",
    "HK": "",
    "HU": "",
    "IS": "",
    "IN": "",
    "ID": "",
    "IR": "",
    "IQ": "Iraq",
    "IE": "Ireland",
    "IM": "Isle of Man",
    "IL": "Israel",
    "IT": "Italy",
    "JM": "Jamaica",
    "JP": "Japan",
    "JE": "Jersey",
    "JO": "Jordan",
    "KZ": "Kazakhstan",
    "KE": "Kenya",
    "KI": "Kiribati",
    "KP": "Korea, Democratic People's Republic of",
    "KR": "Korea, Republic of",
    "KW": "Kuwait",
    "KG": "Kyrgyzstan",
    "LA": "Lao People's Democratic Republic",
    "LV": "Latvia",
    "LB": "Lebanon",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LY": "Libya",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MO": "Macao",
    "MK": "Macedonia, the former Yugoslav Republic of",
    "MG": "Madagascar",
    "MW": "Malawi",
    "MY": "Malaysia",
    "MV": "Maldives",
    "ML": "Mali",
    "MT": "Malta",
    "MH": "Marshall Islands",
    "MQ": "Martinique",
    "MR": "Mauritania",
    "MU": "Mauritius",
    "YT": "Mayotte",
    "MX": "Mexico",
    "FM": "Micronesia, Federated States of",
    "MD": "Moldova, Republic of",
    "MC": "Monaco",
    "MN": "Mongolia",
    "ME": "Montenegro",
    "MS": "Montserrat",
    "MA": "Morocco",
    "MZ": "Mozambique",
    "MM": "Myanmar",
    "NA": "Namibia",
    "NR": "Nauru",
    "NP": "Nepal",
    "NL": "Netherlands",
    "NC": "New Caledonia",
    "NZ": "New Zealand",
    "NI": "Nicaragua",
    "NE": "Niger",
    "NG": "Nigeria",
    "NU": "Niue",
    "NF": "Norfolk Island",
    "MP": "Northern Mariana Islands",
    "NO": "Norway",
    "OM": "Oman",
    "PK": "Pakistan",
    "PW": "Palau",
    "PS": "Palestinian Territory, Occupied",
    "PA": "Panama",
    "PG": "Papua New Guinea",
    "PY": "Paraguay",
    "PE": "Peru",
    "PH": "Philippines",
    "PN": "Pitcairn",
    "PL": "Poland",
    "PT": "Portugal",
    "PR": "Puerto Rico",
    "QA": "Qatar",
    "RE": "Réunion",
    "RO": "Romania",
    "RU": "Russian Federation",
    "RW": "Rwanda",
    "BL": "Saint Barthélemy",
    "SH": "Saint Helena, Ascension and Tristan da Cunha",
    "KN": "Saint Kitts and Nevis",
    "LC": "Saint Lucia",
    "MF": "Saint Martin (French part)",
    "PM": "Saint Pierre and Miquelon",
    "VC": "Saint Vincent and the Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome and Principe",
    "SA": "Saudi Arabia",
    "SN": "Senegal",
    "RS": "Serbia",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SG": "Singapore",
    "SX": "Sint Maarten (Dutch part)",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "ZA": "South Africa",
    "GS": "South Georgia and the South Sandwich Islands",
    "SS": "South Sudan",
    "ES": "Spain",
    "LK": "Sri Lanka",
    "SD": "Sudan",
    "SR": "Suriname",
    "SJ": "Svalbard and Jan Mayen",
    "SZ": "Swaziland",
    "SE": "Sweden",
    "CH": "Switzerland",
    "SY": "Syrian Arab Republic",
    "TW": "Taiwan, Province of China",
    "TJ": "Tajikistan",
    "TZ": "Tanzania, United Republic of",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TK": "Tokelau",
    "TO": "Tonga",
    "TT": "Trinidad and Tobago",
    "TN": "Tunisia",
    "TR": "Turkey",
    "TM": "Turkmenistan",
    "TC": "Turks and Caicos Islands",
    "TV": "Tuvalu",
    "UG": "Uganda",
    "UA": "Ukraine",
    "AE": "United Arab Emirates",
    "GB": "United Kingdom",
    "US": "United States",
    "UM": "United States Minor Outlying Islands",
    "UY": "Uruguay",
    "UZ": "Uzbekistan",
    "VU": "Vanuatu",
    "VE": "Venezuela, Bolivarian Republic of",
    "VN": "Viet Nam",
    "VG": "Virgin Islands, British",
    "VI": "Virgin Islands, U.S.",
    "WF": "Wallis and Futuna",
    "EH": "Western Sahara",
    "YE": "Yemen",
    "ZM": "Zambia",
    "ZW": "Zimbabwe"

}

module.exports = router
