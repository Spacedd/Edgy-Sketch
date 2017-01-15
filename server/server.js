//loads the packages needed

var express = require('express');
var app = express();
var http = require('http').Server(app);
var favicon = require('serve-favicon');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var io = require('socket.io')(http);
var mustacheExpress	= require('mustache-express');
var users = new Array();
var database = require ("./database.js");
var gameWords = new Array();
var currentWord;
var round;
var drawer;

// Says what port to listen to incoming data on

const PORT=80;

// Enables the page logo

app.use(favicon(__dirname + "/../client/media/pen logo.png"));


// Setup Facebook login strategy

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;


// if Facebook env vars not set - then use blanks
if(clientId == null) {
	clientId = "blankId";
}

if(clientSecret == null) {
	console.log(clientSecret);
}

passport.use(new Strategy({
	clientID: clientId,
	clientSecret: clientSecret,
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


// Use application-level middleware for common functionality, including logging, parsing, and session handling.

app.use(express.static('client'));
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
//app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'edgysketch', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the session.

app.use(passport.initialize());
app.use(passport.session());

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname);

// Uses app to send the request to the file login.html

 app.get('/', function(req,res) {
	//res.sendFile(__dirname + "\\login.html");
     res.redirect("login.html");
});


// Defining the routes that are taken

app.get('/login/facebook',
	passport.authenticate('facebook'));

app.get('/login/guest',
	function(req, res){
		res.render('../client/game.html', {
			username: "Guest" + (users.length)
		});
	});

app.get('/login/facebook/return',
	passport.authenticate('facebook', {
		failureRedirect: '/'
	}),
	function(req, res) {
		console.log("Successful login");
		res.render('../client/game.html', {
			username: req.user.displayName
		});
	});


// When the server receives connections it opens certain sockets and logs what is has done
// When the app listens it logs where it is listening to

io.on('connection', function(socket){

    var user = {name: "unknown"};

    socket.on('Newuser', function(msg){
        console.log("User connected : " + msg);
        user.name = msg;
        users[users.length] = user;
        io.emit('users', users);
    });

	socket.on('disconnect', function(msg){
		console.log('User disconnected:' + msg);
		user.name = msg;
		for (var i = 0; i < users.length; i++) {
			if(users[i]){
				if (users[i].name === user.name){
					users[i] = null
				}
			}
		}
		io.emit('users', users);
	});

    socket.on('Enter', function(){
		console.log("Enter pressed");
	});

    socket.on('chat message', function(msg){
		console.log("message: " + msg);
		var newmsg;
		newmsg = msg.substring(msg.indexOf(":") + 1);
		if(socket == drawer) {
			socket.emit('chat message', "You can not speak whist drawing");
		} else {
			if(newmsg === currentWord){
				socket.emit('chat message', "You guessed the correct word!");
				socket.broadcast.emit('chat message', "The word was guessed!");
				var index  = gameWords.indexOf(currentWord);
				gameWords.splice(index, 1);
				console.log(gameWords);
				newround();
			} else {
				io.emit('chat message', msg);
			}
		}
	});

    socket.on('draw', function(msg){
		//console.log(msg);
		console.log("Draw msg received");
		io.emit('draw', msg);
	});

    socket.on('clear', function(){
		console.log("Clearing canvas");
		io.emit('clear');
	});

    socket.on('nickname', function(msg){
		console.log("Nickname changed to: " + msg);
		io.emit('nickname', msg);
        user.name = msg;
        io.emit('users', users)
	});


	socket.on('newgame', function(){
		console.log("Start game pressed");
		socket.broadcast.emit('hidebox');
		var currentWordSet = database.getWordSet("Easy", function(err, words){
            if (!err) {
				for(var index = 0; index < words.length; index++){
					gameWords[index]=words[index].value;
				}
				console.log(gameWords);
				round = 0;
				newround()
            }else{
                console.log(err);
                return err;
            }
        });
	});
	
	var newround = function(){
		drawer = socket;
		if (gameWords.length != 0){
			round++;
			currentWord = gameWords[Math.floor(Math.random()*gameWords.length)];
			socket.emit('current word', currentWord);
			socket.broadcast.emit('game start', round, currentWord.length);
		} else {
			currentWord = "";
			socket.emit('chat message', "The game has ended");			
		}	
	}	
});

http.listen(PORT, function(){
	console.log("Listening on port ", PORT);
});
