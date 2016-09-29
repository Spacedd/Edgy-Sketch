//loads the package http
var http = require('http');

//says what port to listen to incoming data on
const PORT=8080; 

//if a request comes in, respond with message
function handleRequest(request, response){
    response.end('It Works!! Path Hit: ' + request.url);
}

//uses http function to create server which passes in handlerequest 
var server = http.createServer(handleRequest);

//listens on the server port and calls function
server.listen(PORT, function(){
    //if the server runs, log that it is listening
    console.log("Server listening on: http://localhost:%s", PORT);
});