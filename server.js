// =======================
// get instance we need
// =======================
var express         = require('express');
var app                = express();
var bodyParser    = require('body-parser');
var morgan          = require('morgan');
var mongoose      = require('mongoose');
var jwt                   = require('jsonwebtoken');

var config              = require('./config');
var User                = require('./app/models/user');

// =======================
// configuration
// =======================
// server setting
var port = process.env.PORT || 8080;

// connect databse
mongoose.connect(config.database);

// application variables
app.set('superSecret', config.secret);

// config for body-parser
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// log request
app.use(morgan('dev'));

// =======================
// routes
// =======================
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// for create test user to db
app.get('/setup', function(req, res) {
  var demo = new User({
    name: 'demouser',
    password: 'password',   // TODO: encrypt password
    admin: true
  });

  demo.save(function(err) {
    if (err) throw err;

    console.log('User saved successfully');
    res.json({ success: true});
  });

});

// API ROUTES -------------------

var apiRoutes = express.Router();

// non secure api --------

// POST(http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {

  // find db by posted name
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;

    // validation
    if (!user) {
      res.json({
        success: false,
        message: 'Authentication failed. User not found.'
      });
      return;
    }

    if (user.password != req.body.password) {
      res.json({
        success: false,
        message: 'Authentication failed. Wrong password.'
      });
      return;
    }

    // when valid -> create token
    var token = jwt.sign(user, app.get('superSecret'), {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      message: 'Authentication successfully finished.',
      token: token
    });

  });

});


// Token Authentification Filter
apiRoutes.use(function(req, res, next) {

  // get token from body:token or query:token of Http Header:x-access-token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // validate token
  if (!token) {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }

  jwt.verify(token, app.get('superSecret'), function(err, decoded) {
    if (err) {
      return res.json({
        success: false,
        message: 'Invalid token',
        detail: err
      });
    }
    console.log(decoded['_doc'].name);
    // if token valid -> save token to request for use in other routes
    req.decoded = decoded;
    next();

  });

});

// secure api --------

// GET(http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to API routing'});
});

// GET(http://localhost:8080/api/users)
apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    if (err) throw err;
    res.json(users);
  });
});


// apply the routes to our application(prefix /api)
app.use('/api', apiRoutes);


// =======================
// start the server
// =======================
app.listen(port);
console.log('started http://localhost:' + port + '/');



