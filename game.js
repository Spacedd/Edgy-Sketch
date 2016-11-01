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

    var c = document.getElementById("draw");
    var ctx = c.getContext("2d");

    var pen = "?";
    var dXpos;
    var dYpos;
    var uXpos;
    var uYpos;


    c.addEventListener("mousedown", doMouseDown, false);
    c.addEventListener("mouseup", doMouseUp, false);
    c.addEventListener("mousemove", doMouseMove, false);

    function doMouseDown(event){
        dXpos = event.pageX - ctx.canvas.offsetLeft;
        dYpos = event.pageY - ctx.canvas.offsetTop;
        socket.emit('draw', {xDown: dXpos, yDown: dYpos})
        pen = "down";
    }

    function doMouseUp(event){
        uXpos = event.pageX - ctx.canvas.offsetLeft;
        uYpos = event.pageY - ctx.canvas.offsetTop;
        socket.emit('draw', {xDown: dXpos, yDown: dYpos, xUp: uXpos, yUp: uYpos});
        pen = "up";
    }

    function doMouseMove(event){

    }

    socket.on("draw", function(msg){
        ctx.beginPath();
        ctx.moveTo(msg.xDown, msg.yDown);
        ctx.lineTo(msg.xUp, msg.yUp);
        ctx.stroke();


    });

    $('form').submit(function(){
        if ($('#m').val() !== "") {
            socket.emit('chat message', $('#m').val());
            $('#m').val('');
        };
        return false;
    });

    socket.on('chat message', function(msg) {
        $('#messages').append($('<li>').text(msg))
    });



});
