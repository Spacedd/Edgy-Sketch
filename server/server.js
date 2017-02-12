// VARIABLE INITIALIZATION //

//loads the packages needed

var express = require('express');
var app = express();
var http = require('http').Server(app);
var favicon = require('serve-favicon');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var io = require('socket.io')(http);//, {'pingInterval': 5000, 'pingTimeout': 11000});
var mustacheExpress	= require('mustache-express');
var database = require ("./database.js");
var Game = require("./serverGame.js");
var game = new Game();
					
// Says what port to listen to incoming data on
const PORT=80;

// Enables the page logo
app.use(favicon(__dirname + "/../client/media/pen logo.png"));


// Setup Facebook login strategy
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;


// If the Facebook environment variables are not set, then use blanks
if(clientId == null) {
	clientId = "blankId";
}

if(clientSecret == null) {
	console.log(clientSecret);
}

// On returning from the Facebook login, redirect to the main page with the username extracted from the profile
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


// Use application-level middleware for common functionality, including logging, parsing, and session handling
app.use(express.static('client'));
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'edgysketch', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname);

// Uses app to send the request to the file login.html

 app.get('/', function(req,res) {
     res.redirect("login.html");
});


// Defining the routes that are taken
app.get('/login/facebook',
	passport.authenticate('facebook'));

app.get('/login/guest',
	function(req, res){
		if (game.gamerunning != true) {
			res.render('../client/game.html', {
				username: "Guest" + (game.users.length)
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

	var user = {
		name: "unknown",
		score: 0,
		socketid: socket.id
	};

	
					// SOCKETS //

	
    socket.on('Newuser', function(msg){
        console.log("User connected    : " + msg);
        user.name = msg;
        game.users[game.users.length] = user;
        io.emit('users', game.users);
    });

	socket.on('disconnect', function(){
		console.log("User disconnected : " + user.name);
		var index = game.users.indexOf(user);
		game.users.splice(index, 1);
		if ((game.gamerunning && game.users.length < 2)||socket == game.drawer){
			stopGame();
		}
		io.emit('users', game.users);
	});

    socket.on('chat message', function(msg, property){
		console.log("message: " + msg);
		var newmsg = msg.substring(msg.indexOf(":") + 1);
		if (game.gamerunning){
			if(socket == game.drawer) {
				socket.emit('chat message', "You can not speak whist drawing", 'server');
			} else {
				if(newmsg.toLowerCase() === game.currentWord.toLowerCase()){
					correctGuess(msg, property);
				} else {
					io.emit('chat message', msg, property);
				}
			}
		} else {
			io.emit('chat message', msg, property);
		}
	});

	function correctGuess(msg, property){
		io.emit('chat message', msg, 'correctGuess');
		socket.emit('chat message', "You guessed the correct word!", property);
		socket.broadcast.emit('chat message', "The word was guessed!", property);
		user.score += game.count;
		io.emit('users', game.users);
		io.emit('globalWordToShow', game.currentWord);
		stopCount();
		setTimeout(removeCurrentWord, 1000);
		setTimeout(newround, 2000);
	}

	socket.on('draw', function(msg){
		if(!game.gamerunning && msg.mouse == 'down' || socket == game.drawer && msg.mouse == 'down'){	//Doesn't allow you to draw if you are not the drawer when the game is running
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
        io.emit('users', game.users)
	});

	socket.on('newgame', function(wordSet){
		if (game.users.length > 1 ){
			game.gamerunning = true;
			console.log("Start game pressed, wordset : " + wordSet);
			io.emit('hidebox');
			var currentWordSet = database.getWordSet(wordSet, function(err, words){
				if (!err) {
					for(var index = 0; index < words.length; index++){
						game.gameWords[index] = words[index].value;
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
			socket.emit('chat message', "There must be at least two people to play a game.", 'server');
		}
	});


					// GAME SEQUENCE //


	function newround(){
		io.emit('clear');
		if (game.gameWords.length != 0){
			game.newRound(socket);
			socket.emit('current word', game.currentWord);
			socket.broadcast.emit('game start', game.round, game.currentWord.length);
			startCount();
		} else {
			stopGame();
		}
	}

	function timedCount(){
		io.emit('displayTime', "Time left: " + game.count);
		if (game.count > 0) {
			game.count -= 1;
			game.t = setTimeout(function () {
				timedCount();
			}, 1000);
		} else {
			io.emit('chat message', "Time is up, no one guessed the word!", 'server');
			stopCount();
			io.emit('globalWordToShow', game.currentWord);
			setTimeout(removeCurrentWord, 5000);
			setTimeout(newround, 6000);
		}
	}

	function startCount(){
		console.log("Timer started");
		if (!game.timerOn) {
			game.timerOn = 1;
			game.count = game.startCount;
			timedCount();
		}
	}

	function stopCount(){
		console.log("Timer stopped");
		clearTimeout(game.t);
		game.timerOn = 0;
	}

	function removeCurrentWord(){
		var index  = game.gameWords.indexOf(game.currentWord);
		game.gameWords.splice(index, 1);
		console.log(game.gameWords);
	}

	function stopGame(){
		console.log("Game stopped");
		stopCount();
		game.drawer = null;
		game.currentWord = "";
		var winners = game.calculateHighest();
		if (winners.length == 1){
			var message = "The game has ended. The winner was " + winners[0].name + " with a score of " + winners[0].score;
			io.emit('chat message', message, 'server');
		} else {
			message = "The game has ended. It was a tie of " + winners[0].score + " points, between :";
			for (var i = 0; i < winners.length; i++){
				message += winners[i].name + ", ";
			}
			io.emit('chat message', message, 'server');
		}
		game.gamerunning = false;
		game.resetScores();
		io.emit('resetElements');
		io.emit('users', game.users);
	}
});

	http.listen(PORT, function(){
	console.log("Listening on port ", PORT);
});