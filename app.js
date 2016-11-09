"use strict";
/**
 * Module dependencies.
 */
var express = require('express'), 
  routes = require('./routes'), 
  http = require('http'), 
  path = require('path'), 
  app = express(), 
  config = require('./config.json'), 
  user = {id: "abc"}, 
  passport = require('passport'), 
  TwitterStrategy = require('passport-twitter').Strategy, 
  oa, 
  twitterAuthn, 
  twitterAuthz, 
  sys = require('sys');
  ;
  
function initTwitterOauth() {
  var OAuth= require('oauth').OAuth;
  
  oa = new OAuth(
    "https://twitter.com/oauth/request_token",
    "https://twitter.com/oauth/access_token", 
    config.consumerKey, 
    config.consumerSecret, 
    "1.0A", 
    "https://twitter-app-seanskiver.c9users.io/oauthn/twitter/callback", 
    "HMAC-SHA1"
  );
}  

function makeTweet(cb) {
  oa.post(
    "https://api.twitter.com/1.1/statuses/update.json",
    user.token, 
    user.tokenSecret,
    {"status":"Posted from Node.js webapp OAuth"},
    cb
  );
}

function makeDm(sn, cb) {
  oa.post(
    "https://api.twitter.com/1.1/direct_messages/new.json",
    user.token,
    user.tokenSecret, 
    {"screen_name":sn, "text": "This is a test message from my twitter app"},
    cb
  )
}
function getDms(callback) {
    oa.get(
      "https://api.twitter.com/1.1/direct_messages.json?count=10",
      user.token,
      user.tokenSecret,
      callback
    );
}


passport.serializeUser(function(err, done) {
  done(null, user.id);
});

passport.deserializeUser(function(err, done) {
  done(null, user);
});

// For posting 
twitterAuthn = new TwitterStrategy({
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    callbackURL: "https://twitter-app-seanskiver.c9users.io/authn/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    user.token= token;
    user.tokenSecret = tokenSecret;
    user.profile = profile;
    initTwitterOauth();
    done(null, user);
  }
);
twitterAuthn.name = 'twitterAuthn';

// For Direct Messages
twitterAuthz = new TwitterStrategy({
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    callbackURL: "https://twitter-app-seanskiver.c9users.io/authz/twitter/callback",
    userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
  },
  
  function(token, tokenSecret, profile, done) {
    user.token= token;
    user.tokenSecret = tokenSecret;
    user.profile = profile;
    initTwitterOauth();
    done(null, user);
  }
);
twitterAuthz.name = 'twitterAuthz';


passport.use(twitterAuthn);
passport.use(twitterAuthz);  
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(express.session({secret: "askdjkasjdklasjldkirutoeirut"}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/authn/twitter', passport.authenticate('twitterAuthn'));
app.get('/authz/twitter', passport.authenticate('twitterAuthz'));
app.get(
  '/authn/twitter/callback', 
  passport.authenticate(
    'twitterAuthn', { 
      successRedirect: '/nsuccess',
      failureRedirect: '/nfailure' 
    }
));
app.get(
  '/authz/twitter/callback', 
  passport.authenticate(
    'twitterAuthz', { 
      successRedirect: '/zsuccess',
      failureRedirect: '/zfailure' 
    }
));
app.get('/twitter/tweet', function(req, res) {
  makeTweet(function(error, data) {
    if(error) {
      console.log(require('sys').inspect(error));
      res.end('Something went wrong');
    } else {
      console.log(data);
      res.end('Success! Check out your tweets');
    }
  });
});

app.get('/twitter/direct/:sn', function(req, res) {
  makeDm(req.params.sn, function(error, data) {
    if(error) {
      console.log(require('sys').inspect(error));
      res.end('Something went wrong');
    } else {
      console.log(data);
      res.end('Message Sent! But you can\'t see it :(');
    }
  });
});

// View Direct Messages
app.get('/twitter/dms', function(req, res) {
  getDms(function(error, data) {
    if (error) {
      console.log(require('sys').inspect(error));
      res.end('There was an error getting your DMs');
    } else {
      res.end(data);
      console.log(data);
    }
  })
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
