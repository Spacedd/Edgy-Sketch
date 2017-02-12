$(function () {

                        // INITIALIZING VARIABLES //
    

    var socket = io();

    // Creates the canvas and gives it the element draw
    var c = document.getElementById('draw');
    var ctx = c.getContext('2d');

    // Variables for the canvas and pen
    var startPos;
    var endPos;
    var thickness = 5;
    var colour = '000000';


                            // CANVAS EVENTS //


    // States what the pen will draw
    ctx.fillStyle = 'solid';
    ctx.lineCap = 'round';

    // Variable which later decides whether to draw or not
    var ismousedown = false;

    function getPos(clientX,clientY){
        var rect = c.getBoundingClientRect();
        var width = (rect.right - rect.left);
        var height = (rect.bottom - rect.top);
        var originalX = clientX - rect.left;
        var originalY = clientY - rect.top;
        var x = originalX * (c.width/width);
        var y = originalY * (c.height/height);
        return {x: x, y: y};
    }

    // Grabs the x and y coordinates of the mousedown position
    function doMouseDown(event){
        startPos = getPos(event.clientX, event.clientY);
        ismousedown = true;
    }

    // Grabs the x and y coordinates of the mouseup position and then sends an emit to the function draw
    function doMouseUp(event){
        ismousedown = false;
        endPos = getPos(event.clientX, event.clientY);
        socket.emit('draw', {end: endPos, start: startPos, colour: colour, thickness: thickness, mouse: 'up'});
    }

    // Allows the pen to draw freely, by setting the position it has just been as the beginning of the "line"
    function doMouseMove(event){
        if (ismousedown){
            endPos = getPos(event.clientX, event.clientY);
            socket.emit('draw', {end: endPos, start: startPos, colour: colour, thickness: thickness, mouse: 'down'});
            startPos = endPos;
        }
    }

    function doTouchDown(event){
        event.preventDefault();
        startPos = getPos(event.targetTouches[0].pageX, event.targetTouches[0].pageY);
    }

    function doTouchMove(event){
        event.preventDefault();
        endPos = getPos(event.targetTouches[0].pageX, event.targetTouches[0].pageY);
        socket.emit('draw', {end: endPos, start: startPos, colour: colour, thickness: thickness, mouse: 'down'});
        startPos = endPos;
    }

    function onMouseOut(){
        ismousedown = false;
    }


    // Adds the listeners for the canvas for when the mouse goes up, down or just moves
    c.addEventListener('mousedown', doMouseDown, false);
    c.addEventListener('mouseup', doMouseUp, false);
    c.addEventListener('mousemove', doMouseMove, false);
    c.addEventListener('mouseout', onMouseOut, false);
    c.addEventListener('touchstart', doTouchDown, false);
    c.addEventListener('touchmove', doTouchMove, false);


                            // DRAWING EVENTS //
    

    // When the pen is selected the colour is refreshed, the thickness is corrected and the sliders are enabled
    $("#penmode").on('click', function(){
        colour = refreshColour();
        thickness = refreshSize();
        $('#sliderR, #sliderG, #sliderB').slider({
            disabled: false
        });
    });

    // When erase is selected the pen is set to white, the thickness is corrected and the sliders are disabled
    $("#erases").on('click', function(){
        colour = '#ffffff';
        thickness = refreshSize();
        $("#sliderR, #sliderG, #sliderB").slider({
            disabled : true
        });
    });

    // Makes sure only one box can be ticked at a time from array of checkboxes
    $('input:checkbox').on('click', function(){
        var $box = $(this);
        if ($box.is(":checked")) {
            var group = "input:checkbox[name='" + $box.attr("name") + "']";
            $(group).prop('checked', false);
            $box.prop('checked', true);
        } else {
            $box.prop('checked', false);
        }
    });

    // The slider class for the thickness slider
    $("#sliderPen").slider({
        orientation: 'horizontal',
        range: 'min',
        max: 30,
        value: thickness,
        slide: refreshSize,
        change: refreshSize
    });

    // Sets the rgb sliders to a min and max
    $("#sliderR, #sliderG, #sliderB").slider({
        orientation: 'horizontal',
        range: 'min',
        max: 255,
        value: 1,
        slide: refreshColour,
        change: refreshColour
    });

    // Returns the colour of the hex value generated from the rgb sliders, also displays the colour in the display box
    function refreshColour(){
        var red = $("#sliderR").slider('value'),
        green = $("#sliderG").slider('value'),
        blue = $("#sliderB").slider('value'),
        hex = hexFromRGB(red, green, blue);
        colour = '#' + hex;
        $("#colourDisplay").css('background-color', colour);
        return colour
    }

    // Returns the value of the thickness slider into the pen sizes
    function refreshSize(){
       thickness = $("#sliderPen").slider('value');
    }

    // Converts the binary value to hex for each slider
    function hexFromRGB(r, g, b) {
        var hex = [
            r.toString(16),
            g.toString(16),
            b.toString(16)
        ];
        $.each(hex, function(nr, val){
            if (val.length === 1){
                hex[nr] = "0" + val;  // If the value of the hex is only 0 - F then a 0 is added to the front
            }
    });
        return hex.join("").toUpperCase();  // Joins the hex values to one string
    }

    //  Replaces the canvas with a white rectangle, aka clearing it
    ctx.clear = function () {
        ctx.clearRect(0, 0, c.width, c.height);
    };

    // When the button "clear" is pressed, it calls the socket 'clear'
    $('#clearbutton').on('click', function () {
        socket.emit('clear');
    });


                            // MESSAGING EVENTS //


    // The message is passed through as a string and this outputs it into the messagearea
    function messageCreation(text, property){
        var message = document.createElement('div');       
        message.setAttribute('class', property);
        message.innerHTML = text;
        var messageArea = $('.chat-messages');
        messageArea.append(message);
        message.scrollIntoView(false);
    }

    // Validates the message, then sets the contents to blank after it has been sent
    $('#sendmessage').submit(function () {
        if ($('#m').val() !== "") {
            socket.emit('chat message', username + " :" +  $('#m').val(), 'client');
            $('#m').val('');
        }
        return false;
    });

    // When the user selects their nickname it emits that the user has changed their name, and their new nickname.
    $('#setnick').submit(function () {
        var re = new RegExp("^[a-zA-Z]{1,20}$"); //Only allows characters between a-z lower and uppercase, and only 1-20 of them
        var newusername = $("#nick").val();
        if (re.test(newusername)){
            socket.emit('chat message', username + " changed their nickname to: " + newusername, 'server');
            socket.emit('nickname', newusername);
            username = newusername;
            $('#nick').val('');
        } else {
            messageCreation("Enter a valid nickname - Only UPPER and lower case letters, max 20 letters", 'server');
            $('#nick').val('');
        }
        return false;
    });
    
    
                            // SOCKETS //

    
    socket.on('connect', function(){
        socket.emit('Newuser', username)
    });

    // Adds the connected user to the list, or if game is running, it is used to updates the users' scores
    socket.on('users', function(users){
        var messageArea = $('#userlist');
        messageArea.empty();
        for (i = 0; i < users.length; i ++){
            if (users[i]){
                var message = document.createElement('li');
                message.setAttribute('class', 'users');
                message.innerHTML = users[i].name + " [" + users[i].score + "]";
                messageArea.append(message);
                message.scrollIntoView(false);
            }
        }
    });

    // Outputs the latest message
    socket.on('chat message', function(msg, property){
        messageCreation(msg, property);  // The property defines whether the message is coming from the client or server
    });

    // Draws the line with the function 'stroke', moves to the startPos coordinates and draws a line to the endPos ones
    // and sets the old variable to the current x and y coordinates, so that it can run again
    socket.on('draw', function(msg){
        ctx.beginPath();
        ctx.moveTo(msg.start.x, msg.start.y);
        ctx.lineTo(msg.end.x, msg.end.y);
        ctx.strokeStyle = msg.colour;
        ctx.lineWidth = msg.thickness;
        ctx.stroke();
    });

    // Calls the clear function when it receives the call from the server
    socket.on('clear', function () {
        ctx.clear();
    });

    socket.on('game start', function(round, currentWordLength){
        if (round === 1) {
            messageCreation("The game is afoot", 'server');
        }else {
            messageCreation("Round : " + round, 'server');
        }        
        document.getElementById('wordDisplay').innerHTML = "Word : " + wordToUnderscore(currentWordLength);
    });

    socket.on('hidebox', function(){
        document.getElementById('startGame').disabled = true;
    });

    socket.on('current word', function(wordToGuess){
        document.getElementById('wordDisplay').innerHTML = ("Draw the word: " + wordToGuess);
    });

    socket.on('displayTime', function(msg){
        document.getElementById('displayTime').innerHTML = msg;
    });

    socket.on('globalWordToShow', function(msg){
        document.getElementById('wordDisplay').innerHTML = "The word was '" + msg + "'";
    });

    socket.on('resetElements', function(){
        document.getElementById('startGame').disabled = false;
        document.getElementById('displayTime').innerHTML = "";
        document.getElementById('wordDisplay').innerHTML = "";
    });


                            // GAME OPTIONS //

    
    // Checks the state of the dropdown option box for the wordset to pass through to the database query
    $('#startGame').on('click', function(){
        var wordSet = $("#wordSetDropBox").val();
        if (wordSet !== "Default"){
            socket.emit('newgame', wordSet);
            socket.emit('clear');
        } else {
            messageCreation("Select a wordset before starting the game!", 'server');
        }
    });

    // Converts the word to guess into underscores "_" for the guessers to see how long the word is
    function wordToUnderscore(currentWordLength){
        var underscore = "";
        for (var i = 0; i < currentWordLength; i ++){
            underscore += "_ ";
        }
        return underscore;
    }

/*              ROOM
     ___      ___
    /   \____/   \
   /    / __ \    \
  /    |  ..  |    \
  \___/|      |\___/\
     | |_|  |_|      \
     | |/|__|\|       \
     |   |__|         |\
     |   |__|   |_/  /  \
     | @ |  | @ || @ |   '
     |   |~~|   ||   |
     'ooo'  'ooo''ooo'

*/    
});