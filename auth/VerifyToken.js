var jwt = require('jsonwebtoken');
require('dotenv').config()
const { MESSAGE } = require('../helpers/messages')

function verifyToken(req, res, next) {

  let token = req.headers['x-access-token'] || req.headers['authorization'];
  if (!token || token == undefined)
    return res.status(403).send({ success: false, message: MESSAGE.M_NOTOKEN });
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  jwt.verify(token, process.env.ENCRYPTION_SECRET, function (err, decoded) {
    if (err)
      return res.status(401).send({ success: false, auth: false, message: MESSAGE.M_EXPIRETOKEN });

    req.userId = decoded.id;
    next();
  });
}


module.exports = verifyToken;