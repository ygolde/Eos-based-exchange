var mongoose = require('mongoose');
var db;
// mongoose.connect(`mongodb://admin:~gH%40wZ%3E.Dd5RD4mN@127.0.0.1:27017/admin`, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.connect(`mongodb://localhost/users`, { useNewUrlParser: true, useUnifiedTopology: true })
// mongoose.connect(`mongodb://database/users`, { useNewUrlParser: true, useUnifiedTopology: true }) // For docker deployment
db = mongoose.connection;
db.on('error', () => { console.log('Error in connecting to mongodb') });
db.once('open', function () {
    console.log("Connected to MongoDB")
});

module.exports = {
    db
}
