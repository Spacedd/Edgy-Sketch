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
	startCount: 5,
	count: 0,
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
		keepAlive();
        console.log("User connected : " + msg);
        user.name = msg;
        users[users.length] = user;
        io.emit('users', users);
    });

	socket.on('keepAlive', function(){
		setTimeout(keepAlive, 2000);
		console.log("stayin' alive:" + user.name)
	});

	function keepAlive(){
		socket.emit("keepAlive");
	}

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
		var newmsg = msg.substring(msg.indexOf(":") + 1);
		if (game.gamerunning){
			if(socket == game.drawer) {
				socket.emit('chat message', "You can not speak whist drawing");
			} else {
				if(newmsg.toLowerCase() === game.currentWord.toLowerCase()){
					socket.emit('chat message', "You guessed the correct word!");
					socket.broadcast.emit('chat message', "The word was guessed!");
					user.score += game.count;
					io.emit('users', users);
					io.emit('globalWordToShow', game.currentWord);
					stopCount();
					setTimeout(removeCurrentWord, 5000);
					setTimeout(newround, 6000);
				} else {
					io.emit('chat message', msg);
				}
			}
		} else {
			io.emit('chat message', msg);
		}
});

	var removeCurrentWord = function(){
		var index  = game.gameWords.indexOf(game.currentWord);
		game.gameWords.splice(index, 1);
		console.log(game.gameWords);
	};

    socket.on('draw', function(msg){
		if(!game.gamerunning && msg.mouse == "down" || socket == game.drawer && msg.mouse == "down"){	//Doesn't allow you to draw if you are not the drawer when the game is running
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
			io.emit('hidebox');
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
		var winners = calculateHighest();
		if (winners.length == 1){
			var message = "The game has ended. The winner was " + winners[0].name + " with a score of " + winners[0].score;
			io.emit('chat message', message);
		} else {
			message = "The game has ended. It was a tie of " + winners[0].score + " points, between :";
			for (var i = 0; i < winners.length; i++){
				message += winners[i].name + ", ";
			}
			io.emit('chat message', message);
		}
		io.emit('resetElements');
		game.gamerunning = false;
		resetScores();
	};

	var resetScores = function(){
		for(var i = 0; i < users.length; i++){
			users[i].score = 0;
			io.emit('users', users);
		}
	};

	var calculateHighest = function(){
		var highest = users[0].score;
		for(var i = 0; i < users.length; i++){
			if (users[i].score > highest)
				highest = users[i].score;
		}
		var winners = new Array();
		for(i = 0; i < users.length; i++){
			if(users[i].score == highest){
				winners.push(users[i]);
			}
		}
		return winners;
	};

	var timedCount = function(){
		io.emit('displayTime', "Time left: " + game.count);
		if (game.count > 0){
			game.count -= 1;
			game.t = setTimeout(function(){
				timedCount();
			}, 1000);
		} else {
			io.emit('chat message', "Time is up, no one guessed the word!");
			stopCount();
			io.emit('globalWordToShow', game.currentWord);
			setTimeout(removeCurrentWord, 5000);
			setTimeout(newround, 6000);
		}
	};

	var startCount = function(){
		console.log("Timer started");
		if (!game.timerOn){
			game.timerOn = 1;
			game.count = game.startCount;
			timedCount();
		}
	};

	var stopCount = function() {
		console.log("Timer stopped");
		clearTimeout(game.t);
		game.timerOn = 0;
	}
});

http.listen(PORT, function(){
	console.log("Listening on port ", PORT);
});
