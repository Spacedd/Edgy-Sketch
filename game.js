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

    $('form').submit(function(){
       // $('#messages').append($('<li>').text($('#m').val()));
        socket.emit('chat message', $('#m').val());
        //$('#m').val('');
        return false;
    });

    socket.on('chat message', function(msg) {
        $('#messages').append($('<li>').text(msg))
    });

});
