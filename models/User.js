var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
  username: { type: String, maxlength: 60, default: '' },
  account: { type: String, maxlength: 20, required: false },
  password: { type: String, minlength: 8, maxlength: 60, required: true },
  tempPassword: { type: String, required: false },
  email: { type: String, maxlength: 255, required: true },
  mobile: {
    number: { type: String, default: '' },
    internationalNumber: { type: String, default: '' },
    nationalNumber: { type: String, default: '' },
    dialCode: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    id: { type: String, default: '' }
  },
  currency: { type: String, default: 'CAD' },
  phone_code: { type: String, default: '', maxlength: 60 },
  mobileStatus: { type: Boolean, default: false },
  refferral_code: { type: String, default: '' },
  emailStatus: { type: Boolean, default: false },
  resetStatus: { type: Boolean, default: false },
  TFA: { type: {}, default: null },
  isTFA: { type: Boolean, default: false },
  isOTP: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true },
  status: { type: String, default: 'ACTIVE' }, //[Active,Blocked]
  isLocked: { type: String, default: 'UNLOCKED' },//[Locked,Unlocked]
  withdrawBlock: { type: Boolean, default: false },
  image: {
    image: { type: String, default: "" },
    contentType: { type: String, default: "" }
  },
  type: {
    admin: {
      status: { type: Boolean, default: false, required: false }
    },
    user: {
      status: { type: Boolean, default: false, required: false }
    },
    support: {
      status: { type: Boolean, default: false, required: false }
    },
    compliance: {
      status: { type: Boolean, default: false, required: false }
    },
    financial: {
      status: { type: Boolean, default: false, required: false }
    },
    accounting: {
      status: { type: Boolean, default: false, required: false }
    },
    roles_status: {
      status: { type: Boolean, default: false, required: false }
    }
  },
  personalInfo: {
    fname: { type: String, default: '', required: false },
    mname: { type: String, default: '', required: false },
    lname: { type: String, default: '', required: false },
    gender: { type: String, default: '', required: false },
    dob: { type: Date, default: '', required: false },
    address: { type: String, default: '', required: false },
    country: { type: Schema.Types.ObjectId, ref: 'COUNTRIES' },
    province: { type: Schema.Types.ObjectId, ref: 'STATES' },
    city: { type: Schema.Types.ObjectId, ref: 'CITIES' },
    postal_code: { type: String, default: '' },
    ssn_last_4: { type: String, default: '' },
    ssn: { type: String, default: '' },
    occupation: { type: String, default: '', maxlength: 60, required: false },
  },
  kyc: {
    front: {
      image: { type: String, default: "" },
      contentType: { type: String, default: "" },
      status: { type: Boolean, dafault: false },
      reason: { type: String, default: "" }
    },
    back: {
      image: { type: String, default: "" },
      contentType: { type: String, default: "" },
      status: { type: Boolean, dafault: false },
      reason: { type: String, default: "" }
    },
    detail: {
      documentType: { type: String, default: "" },
      documentNumber: { type: String, default: "" },
      documentAddress: { type: String, default: "" },
      issueDate: { type: Date, default: null },
      expiryDate: { type: Date, default: null },
      expireCheck: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      status: { type: String, default: 'PENDING' },
      reason: { type: String, default: "" }
    },
    signature: {
      image: { type: String, default: "" },
      contentType: { type: String, default: "" },
      status: { type: Boolean, dafault: false },
      reason: { type: String, default: "" }
    },
    selfie: {
      image: { type: String, default: "" },
      contentType: { type: String, default: "" },
      status: { type: Boolean, dafault: false },
      reason: { type: String, default: "" }
    },
    utility_bill: {
      image: { type: String, default: "" },
      contentType: { type: String, default: "" },
      status: { type: Boolean, dafault: false },
      reason: { type: String, default: "" },
      expiry_date: { type: String, default: "", required: false }
    }
  },
  business_kyc: {
    business_details: {
      company_type: { type: String, default: '' },
      role: { type: String, default: '' },
      registration_number: { type: String, default: '' },
      company_website: { type: String, default: '' },
      business_type: { type: String, default: '' }
    },
    business_address: {
      address: { type: String, default: '' },
      country: { type: String, default: '' },
      province: { type: String, default: '' },
      city: { type: String, default: '' },
      postal_code: { type: String, default: '' },
    },
    personal_details: {
      fname: { type: String, default: '' },
      mname: { type: String, default: '' },
      lname: { type: String, default: '' },
      dob: { type: String, default: '' },
      mobile: { type: String, default: '' },
      country: { type: String, default: '' },
      province: { type: String, default: '' },
      city: { type: String, default: '' },
      postal_code: { type: String, default: '' },
      occupation: { type: String, default: '' },
    },
    documents: {
      place_of_incorporation: { type: String, default: '' },
      business_commence_date: { type: String, default: '' },
      net_worth: { type: String, default: '' },
      signature: {
        title: { type: String, default: 'Signature' },
        image: { type: String, default: '' },
        contentType: { type: String, default: '' },
        status: { type: Boolean, default: false },
      },
      other_documents: [{
        image: { type: String, default: '' },
        contentType: { type: String, default: '' },
        status: { type: Boolean, default: false }
      }],
      legal_documents: {
        name: { type: String, defaul: '' },
        photograph: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false },
        },
        pan: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false },
        },
        proof_of_identity: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false },
        },
        address_proof: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false },
        },
        bank_statement: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false }
        },
        balance_sheet: {
          image: { type: String, default: '' },
          contentType: { type: String, default: '' },
          status: { type: Boolean, default: false },
        }
      }
    }
  },
  wallets: {
    BTC: {
      name: { type: String, default: 'Bitcoin' },
      ticker: { type: String, default: 'BTC' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '' },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number },
      type: { type: String, default: 'lagacy' }
    },
    ETH: {
      name: { type: String, default: 'Ethereum' },
      ticker: { type: String, default: 'ETH' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number }
    },
    LTC: {
      name: { type: String, default: 'Litecoin' },
      ticker: { type: String, default: 'LTC' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number }
    },
    DASH: {
      name: { type: String, default: 'Dash' },
      ticker: { type: String, default: 'DASH' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/dash-dash-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number }
    },
    XRP: {
      name: { type: String, default: 'ripple' },
      ticker: { type: String, default: 'XRP' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/xrp-xrp-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      Xaddress: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number },
      tag: { type: String, default: '' }
    },
    ETC: {
      name: { type: String, default: 'Ethereum Classic' },
      ticker: { type: String, default: 'ETC' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number }
    },
    EOS: {
      name: { type: String, default: 'EOS' },
      ticker: { type: String, default: 'EOS' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/eos-eos-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 53, default: '', required: false },
      memo: { type: String, default: '' },
      account: { type: String, default: '' }
    },
    ZIPCO: {
      name: { type: String, default: 'Zipcoin' },
      ticker: { type: String, default: 'ZIPCO' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/eos-eos-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 12, default: '', required: false },
      memo: { type: String, default: '' },
      account: { type: String, default: '' },
    },
    XLM: {
      name: { type: String, default: 'Zipcoin' },
      ticker: { type: String, default: 'ZIPCO' },
      logo: { type: String, default: 'https://cryptologos.cc/logos/eos-eos-logo.png?v=001' },
      withdrawAddress: { type: String, maxlength: 255, default: '', required: false },
      address: { type: String, maxlength: 255, default: '' },
      accountIndex: { type: Number },
      chainIndex: { type: Number },
      addressIndex: { type: Number }
    }
  },
  location: {
    country: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    region: { type: String, default: '' },
    regionName: { type: String, default: '' },
    city: { type: String, default: '' },
    zip: { type: String, default: '' },
    lat: { type: String, default: '' },
    lon: { type: String, default: '' },
    timezone: { type: String, default: '' },
    isp: { type: String, default: '' },
    org: { type: String, default: '' },
    as: { type: String, default: '' },
  },
  internet_details: {
    type: Schema.Types.ObjectId,
    ref: 'LoginHistory'
  },
  stripe: {
    connects: {
      accountId: { type: String, default: '' },
      cardId: { type: String, default: '' },
      bankId: { type: String, default: '' },
    },
    customer: {
      customerId: { type: String, default: '' },
      cardId: { type: String, default: '' },
      bankId: { type: String, default: '' },
    }
  }
});

module.exports = mongoose.model('User', User);
