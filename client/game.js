$(function () {
    var socket = io();   

    // Creates the canvas and gives it the element draw
    var c = document.getElementById("draw");
    var ctx = c.getContext("2d");

    // Variables for the canvas and pen
    var startX;
    var startY;
    var endX;
    var endY;
    var old = {x: 0, y: 0};

    var thickness = 5;
    var colour = "#000000";


    // States what the pen will draw
    ctx.fillStyle = "solid";
    ctx.lineCap = "round";


    // Adds the listeners for the canvas for when the mouse goes up, down or just moves
    c.addEventListener("mousedown", doMouseDown, false);
    c.addEventListener("mouseup", doMouseUp, false);
    c.addEventListener("mousemove", doMouseMove, false);
    c.addEventListener("mouseout", onMouseOut, false);
    c.addEventListener("getrect", getRect, false);


    // Variable which later decides whether to draw or not
    var ismousedown = false;

    
    // Sets coordinates based on the relative size of the canvas
    function getRect(event){
      var rect = c.getBoundingClientRect();
      var width = (rect.right - rect.left);
      var height = (rect.bottom - rect.top);
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      return {w: width, h: height, x: x, y: y};
    }


    // Grabs the x and y coordinates of the mousedown position
    function doMouseDown(event){
        var rect = getRect(event);
        startX = rect.x * (c.width/rect.w);
        startY = rect.y * (c.height/rect.h);
        ismousedown = true;
    }


    // Grabs the x and y coordinates of the mouseup position and then sends an emit to the function draw
    function doMouseUp(event){
        ismousedown = false;
        var rect = getRect(event);
        endX = rect.x * (c.width/rect.w);
        endY = rect.y * (c.height/rect.h);
        socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY, colour: colour, thickness: thickness, mouse: "up"});
    }


    // Allows the pen to draw freely, not in straight lines, by setting the position it has just been as the
    // beginning of the "line"
    function doMouseMove(event){
        if (ismousedown){
            var rect = getRect(event);
            endX = rect.x * (c.width/rect.w);
            endY = rect.y * (c.height/rect.h);
            socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY, colour: colour, thickness: thickness, mouse: "down"});
            startX = endX;
            startY = endY;
        }
    }

    function onMouseOut(){
        ismousedown = false;
    }


    // When erase is selected the pen is set to white, the thickness is corrected and the sliders are disabled
    $("#erases").on('click', function() {
        colour = "#ffffff";
        thickness = refreshSize();
        $("#sliderR, #sliderG, #sliderB").slider({
            disabled : true
        });
    });


    // When the pen is selected the colour is refreshed, the thickness is corrected and the sliders are enabled
    $("#penmode").on('click', function() {
        colour = refreshColour();
        thickness = refreshSize();
        $('#sliderR, #sliderG, #sliderB').slider({
            disabled: false
        });
    });


    // The slider class for the thickness slider
    $("#sliderPen").slider({
        orientation: "horizontal",
        range: "min",
        max: 30,
        value: thickness,
        slide: refreshSize,
        change: refreshSize
    });


    // Returns the value of the thickness slider into the pen sizes
    function refreshSize(){
       thickness = $("#sliderPen").slider("value");
    }


    // Returns the colour of the hex value generated from the rgb sliders, also displays the colour in the display box
    function refreshColour() {
        var red = $("#sliderR").slider("value"),
            green = $("#sliderG").slider("value"),
            blue = $("#sliderB").slider("value"),
            hex = hexFromRGB(red, green, blue);
            colour = "#" + hex;
        $("#colourDisplay").css("background-color", colour);
        return colour
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


    // Sets the rgb sliders to a min and max
    $("#sliderR, #sliderG, #sliderB").slider({
        orientation: "horizontal",
        range: "min",
        max: 255,
        value: 1,
        slide: refreshColour,
        change: refreshColour
    });


    socket.on("connect", function(){
        socket.emit("Newuser", username)
    });

    socket.on("disconnect", function(){
        socket.emit("disconnect", username)
    });


    socket.on("users", function(users){
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


    // Draws the line with the function 'stroke', moves to the start coordinates and draws a line to the end ones
    // and sets the old variable to the current x and y coordinates, so that it can run again
    socket.on("draw", function (msg) {
        ctx.beginPath();
        ctx.moveTo(msg.startX, msg.startY);
        ctx.lineTo(msg.endX, msg.endY);
        ctx.strokeStyle = msg.colour;
        ctx.lineWidth = msg.thickness;
        ctx.stroke();
        old = msg;
    });
    
    socket.on('keepAlive', function(){
        socket.emit('keepAlive');
    });


    //  Replaces the canvas with a white rectangle, aka clearing it
    ctx.clear = function () {
        ctx.clearRect(0, 0, c.width, c.height);
    };

    // When the button "clear" is pressed, it calls the socket 'clear'
    $('#clearbutton').on('click', function () {
        socket.emit('clear');
    });

    // Calls the clear function when it receives the call from the server
    socket.on('clear', function () {
        ctx.clear();
    });


    // Validates the message, then sets the contents to blank after it has been sent
    $('#sendmessage').submit(function () {
        if ($('#m').val() !== "") {
            socket.emit('chat message', username + " :" +  $('#m').val());
            $('#m').val('');
        }
        return false;
    });


    // When the user selects their nickname it emits that the user has changed their name, and their new nickname.
    // Also validates if the nickname box is empty
    $('#setnick').submit(function () {
        if ($('#nick').val() !== "" && $('#nick').val().length < 20) {                //if the nickname is greater than 20 or empty
            var newusername = $("#nick").val();
            socket.emit('chat message', username + " changed their nickname to: " + newusername);
            socket.emit('nickname', newusername);
            username = newusername;
            $('#nick').val('');
        } else {

        }
        return false;
    });


    // Outputs the latest message
    socket.on('chat message', function (msg) {
        messageCreation(msg)
    });


    // Makes sure only one box can be ticked at a time from array of checkboxes
    $('input:checkbox').on('click', function () {
        var $box = $(this);
        if ($box.is(":checked")) {
            var group = "input:checkbox[name='" + $box.attr("name") + "']";
            $(group).prop("checked", false);
            $box.prop("checked", true);
        } else {
            $box.prop("checked", false);
        }
    });
    

    $('#startGame').on('click', function(){
        var wordSet = $("#wordSetDropBox").val();
        if (wordSet !== "Default"){
            socket.emit('newgame', wordSet);
            socket.emit('clear');
        } else {
            alert("Select a wordset before starting the game!");
        }
    });


    socket.on('hidebox', function(){
        document.getElementById("startGame").disabled = true;
    });

    socket.on('resetElements', function(){
        document.getElementById('startGame').disabled = false;
        document.getElementById('displayTime').innerHTML = "";
        document.getElementById('wordDisplay').innerHTML = "";
    });


   socket.on('current word', function(wordToGuess){
        document.getElementById('wordDisplay').innerHTML = ("Draw the word: " + wordToGuess);
    });

    socket.on('game start', function(round, currentWordLength){
        if (round === 1) {
            messageCreation("The game is afoot");
        }else{
            messageCreation("Round : " + round);
        }
        socket.emit('clear');
        document.getElementById('wordDisplay').innerHTML = "Word : " + wordToUnderscore(currentWordLength);
    });


    function wordToUnderscore(currentWordLength){
        var underscore = "";
        for (var i = 0; i < currentWordLength; i ++){
            underscore += "_ ";
        }
        return underscore;
    }


    function messageCreation(text){
        var message = document.createElement('div');
        message.setAttribute('class', 'chat-message');
        message.innerHTML = text;
        var messageArea = $('.chat-messages');
        messageArea.append(message);
        message.scrollIntoView(false);
    }

    socket.on('displayTime', function(msg){
        document.getElementById('displayTime').innerHTML = msg;
    });


    socket.on('globalWordToShow', function(msg){
        document.getElementById('wordDisplay').innerHTML = "The word was '" + msg + "'";
    });


    function ROOM(){
    /*   ___      ___
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
    };
});
