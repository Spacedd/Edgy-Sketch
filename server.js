//loads the packages needed
var http = require('http');
var express = require('express');
var app = express();
var favicon = require('serve-favicon');

//uses app to send the request to the file index.html
app.get('/', function(req,res) {
	res.sendFile(__dirname + "\\index.html");
});

app.use(favicon(__dirname + "\\claypepe.png"));

//says what port to listen to incoming data on
const PORT=80; 

//when the app listens it logs where it is listening to
app.listen(PORT, function() {
	console.log("Listening on port ", PORT);
});


