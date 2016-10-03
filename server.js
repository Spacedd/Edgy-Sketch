//loads the packages needed
var http = require('http');
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;


// Says what port to listen to incoming data on

const PORT=80;


// Setup facebook login strategy

passport.use(new Strategy({
	clientID: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	callbackURL: 'http://edgysketch.ddns.net/login/facebook/return'
	},
	function(accessToken, refreshToken, profile, cb){
		console.log("User logged in - Name: %s Profile id: %s", profile.displayName, profile.id );
		return cb(null, profile);

}));


// Configure Passport authenticated session persistence

passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});


// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'edgysketch', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the session.

app.use(passport.initialize());
app.use(passport.session());




// Uses app to send the request to the file login.html

app.get('/', function(req,res) {
	res.sendFile(__dirname + "\\login.html");
});


// Defining the routes that are taken

app.get('/login/facebook',
	passport.authenticate('facebook'));

app.get('/login/facebook/return',
	passport.authenticate('facebook', { failureRedirect: '/' }),
	function(req, res) {
		console.log("Successful login");
		res.redirect('/index');
	});

// Takes them to index if there is a successful login

app.get('/index',function(req,res) {
	res.send("Hello " + req.user.displayName);
});


// Enables the icon

app.use(favicon(__dirname + "\\claypepe.png"));


// When the app listens it logs where it is listening to

app.listen(PORT, function() {
	console.log("Listening on port ", PORT);
});



