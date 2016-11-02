$(function(){
    var socket = io();

// Initialize variables
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // Input for username
    // var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('.chat.page'); // The chatroom page

// Prompt for setting a username
    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();

// Creates the canvas and gives it the element draw
    var c = document.getElementById("draw");
    var ctx = c.getContext("2d");

// Variables for the canvas and pen
    var startX;
    var startY;
    var endX;
    var endY;
    var old = {x:0 , y:0};

// States what the pen will draw
    ctx.fillStyle = "solid";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

// Adds the listeners for the canvas for when the mouse goes up, down or just moves
    c.addEventListener("mousedown", doMouseDown, false);
    c.addEventListener("mouseup", doMouseUp, false);
    c.addEventListener("mousemove", doMouseMove, false);


// Variable which later decides whether to draw or not
    var ismousedown = false;

// Grabs the x and y coordinates of the mousedown position
    function doMouseDown(event){
        ismousedown = true;
        startX = event.pageX - ctx.canvas.offsetLeft;
        startY = event.pageY - ctx.canvas.offsetTop;

    }

// Grabs the x and y coordinates of the mouseup position and then sends an emit to the function draw
    function doMouseUp(event){
        ismousedown = false;
        endX = event.pageX - ctx.canvas.offsetLeft;
        endY = event.pageY - ctx.canvas.offsetTop;
        socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY});}

// Allows the pen to draw freely, not in straight lines, by setting the position it has just been as the
// beginning of the "line"
    function doMouseMove(event){
        if (ismousedown) {
            endX = event.pageX - ctx.canvas.offsetLeft;
            endY = event.pageY - ctx.canvas.offsetTop;
            socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY});
            startX = endX;
            startY = endY;
        }
    }

// Actually draws the line with the function 'stroke', moves to the start coordinates and draws a line to the end ones
// and sets the old variable to the current x and y coordinates, so that it can run again
    socket.on("draw", function(msg){
        ctx.beginPath();
        ctx.moveTo(msg.startX, msg.startY);
        ctx.lineTo(msg.endX, msg.endY);
        ctx.stroke();
        old = msg;
    });

// Validates the message, then sets the contents to blank after it has been sent
   $('form').submit(function(){
        if ($('#m').val() !== "") {
            socket.emit('chat message', $('#m').val());
            $('#m').val('');
        };
        return false;
    });

//  Replaces the canvas with a white rectangle, aka clearing it
   ctx.clear = function () {
       ctx.clearRect(0, 0, c.width, c.height);
   };

// When the button "clear" is pressed, it calls the socket 'clear'
   $('#clearbutton').on('click',function(){
       socket.emit('clear');
   });

// Calls the clear function when it receives the call from the server
   socket.on('clear', function(){
       ctx.clear();
   });


// Outputs the latest message
   socket.on('chat message', function(msg) {
        $('#messages').append($('<ul>').text(msg))
   });

});
