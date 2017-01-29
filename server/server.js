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

var game = {
	gameWords: new Array(),
	currentWord: "",
	round: 0,
	drawer: null,
	gamerunning: false,
	count: 60,
	t: 0,
	timerOn: 0
};

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
		if (game.gamerunning != true) {
			res.render('../client/game.html', {
				username: "Guest" + (users.length)
			});
		} else {
			res.redirect("../gameInProgress.html");
		}
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

    var user = {name: "unknown", score: 0, socketid: socket.id};

    socket.on('Newuser', function(msg){
        console.log("User connected : " + msg);
        user.name = msg;
        users[users.length] = user;
        io.emit('users', users);
    });

	socket.on('disconnect', function(msg){
		console.log('User disconnected:' + user.name);
		user.name = msg;
		for (var i = 0; i < users.length; i++) {
			if(users[i]){
				if (users[i].name === user.name){
					users.splice(i, 1);
					if ((game.gamerunning && users.length < 2)||socket == game.drawer){
						stopGame();
					}
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
		if(socket == game.drawer) {
			socket.emit('chat message', "You can not speak whist drawing");
		} else {
			if(newmsg === game.currentWord){
				socket.emit('chat message', "You guessed the correct word!");
				socket.broadcast.emit('chat message', "The word was guessed!");
				user.score += game.count;
				socket.emit('users', users);
				socket.broadcast.emit('users', users);
				socket.emit('globalWordToShow', game.currentWord);
				socket.broadcast.emit('globalWordToShow', game.currentWord);
				setTimeout(correctGuess, 5000);
			} else {
				io.emit('chat message', msg);
			}
		}
	});

	var correctGuess = function(){
		var index  = game.gameWords.indexOf(game.currentWord);
		game.gameWords.splice(index, 1);
		console.log(game.gameWords);
		newround();
	};

    socket.on('draw', function(msg){
		if(!game.gamerunning || socket == game.drawer){	//Doesn't allow you to draw if you are not the drawer when the game is running
			console.log("Draw msg received");
			io.emit('draw', msg);
		}
	});

    socket.on('clear', function(){
		if(!game.gamerunning || socket == game.drawer){
			console.log("Clearing canvas");
			io.emit('clear');
		}
	});

    socket.on('nickname', function(msg){
		console.log("Nickname changed to: " + msg);
		io.emit('nickname', msg);
        user.name = msg;
        io.emit('users', users)
	});

	
	socket.on('newgame', function(wordSet){
		if (users.length > 1 ){
			game.gamerunning = true;
			console.log("Start game pressed, wordset = " + wordSet);
			socket.emit('hidebox');
			socket.broadcast.emit('hidebox');
			var currentWordSet = database.getWordSet(wordSet, function(err, words){
				if (!err) {
					for(var index = 0; index < words.length; index++){
						game.gameWords[index]=words[index].value;
					}
					console.log(game.gameWords);
					game.round = 0;
					newround();
				}else{
					console.log(err);
					return err;
				}
			});
		} else {
			socket.emit('chat message', "There must be at least two people to play a game.");
		}
	});

	var newround = function(){
		stopCount();
		if (game.gameWords.length != 0){
			game.drawer = socket;
			game.round++;
			game.currentWord = game.gameWords[Math.floor(Math.random()*game.gameWords.length)];
			socket.emit('current word', game.currentWord);
			socket.broadcast.emit('game start', game.round, game.currentWord.length);
			startCount();
		} else {
			stopGame();
		}
	};

	var stopGame = function(){
		console.log("Game stopped");
		stopCount();
		game.drawer = null;
		game.currentWord = "";
		var winner = calculateHighest();
		socket.emit('chat message', "The game has ended. The winner was " + winner.name + " with a score of " + winner.score);
		socket.broadcast.emit('chat message', "The game has ended. The winner was " + winner.name + " with a score of " + winner.score);
		socket.emit('showbox');
		socket.broadcast.emit('showbox');
		game.gamerunning = false;
		resetScores();
	};

	var resetScores = function(){
		for(var i = 0; i < users.length; i++){
			users[i].score = 0;
			socket.emit('users', users);
			socket.broadcast.emit('users', users);
		}
	};

	var calculateHighest = function(){
		var highest = users[0];
		for(var i = 0; i < users.length; i++){
			if (users[i].score > highest.score)
				highest = users[i];
		}
		return highest
	};

	var timedCount = function(){
		if (game.count !==0){
			socket.emit('displayTime', "Time left: " + game.count);
			socket.broadcast.emit('displayTime', "Time left: " + game.count);
			game.count -= 1;
			game.t = setTimeout(function(){
				timedCount();
			}, 1000);
		} else {
			socket.emit('chat message', "Time is up");
			socket.broadcast.emit('chat message', "Time is up");
			stopCount();
			newround();
		}
	};

	var startCount = function(){
		console.log("Timer started");
		if (!game.timerOn){
			game.timerOn = 1;
			timedCount();
		}
	};

	var stopCount = function() {
		console.log("Timer stopped");
		clearTimeout(game.t);
		game.count = 60;
		game.timerOn = 0;
	}
});

http.listen(PORT, function(){
	console.log("Listening on port ", PORT);
});
