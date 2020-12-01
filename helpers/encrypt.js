var crypto = require('crypto');

const ENCRYPTION_SECRET = '6ubr]h%d{Te(yWBe5T5`kk=.hH}^?T*V'
 
var encodeDecode = function (message, action) {
  return new Promise(async resolve => {
    const keyHash = ENCRYPTION_SECRET;
    const secretIV = "0000";
    var ivHash = crypto.createHash('sha256').update(secretIV).digest();
    ivHash = ivHash.toString('hex').slice(0, 16);
    if (action == 'e') {
      let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyHash), ivHash);
      let encrypted = cipher.update(message);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      resolve(encrypted.toString('base64'));
    }
    if (action == 'd') {
      let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyHash), ivHash);
      let decrypted = decipher.update(message, "base64");
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      resolve(decrypted.toString());
    }
  });
}

var hash = function(str){
  return crypto.createHash("sha256").update(str).digest('base64');
}
module.exports = {
  secret: ENCRYPTION_SECRET,
  encodeDecode:encodeDecode,
  hash
};

