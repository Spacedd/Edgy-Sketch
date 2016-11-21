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

// States what the pen will draw
    ctx.fillStyle = "solid";
    ctx.lineCap = "round";


// Adds the listeners for the canvas for when the mouse goes up, down or just moves
    c.addEventListener("mousedown", doMouseDown, false);
    c.addEventListener("mouseup", doMouseUp, false);
    c.addEventListener("mousemove", doMouseMove, false);
    
    
// When erase is selected the pen is set to white, the thickness is corrected and the sliders are disabled    
    $("#erases").on('click', function() {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = refreshSize();
        $("#sliderR, #sliderG, #sliderB").slider({
            disabled : true
        });
    });
   
    
// When the pen is selected the colour is refreshed, the thickness is corrected and the sliders are enabled    
    $("#penmode").on('click', function() {
        ctx.strokeStyle = refreshColour();
        ctx.lineWidth = refreshSize();
        $('#sliderR, #sliderG, #sliderB').slider({
            disabled: false
        });
    });

    
// The slider class for the thickness slider    
    $("#sliderPen").slider({
        orientation: "horizontal",
        range: "min",
        max: 30,
        value: 5,
        slide: refreshSize,
        change: refreshSize
    });

    
// Returns the value of the thickness slider into the pen sizes    
    function refreshSize(){
        return ctx.lineWidth = $("#sliderPen").slider("value");
    };

    
// Returns the colour of the hex value generated from the rgb sliders
    function refreshColour() {
        var red = $("#sliderR").slider("value"),
            green = $("#sliderG").slider("value"),
            blue = $("#sliderB").slider("value"),
            hex = hexFromRGB(red, green, blue);
        if($("#erases").checked) {
            return ctx.strokeStyle ="#ffffff";
        }else{
            return ctx.strokeStyle = "#" + hex;
        };
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
        value: 0,
        slide: refreshColour,
        change: refreshColour
    });


// Variable which later decides whether to draw or not
    var ismousedown = false;

// Grabs the x and y coordinates of the mousedown position
    function doMouseDown(event) {
        ismousedown = true;
        startX = event.pageX - ctx.canvas.offsetLeft;
        startY = event.pageY - ctx.canvas.offsetTop;
    }

// Grabs the x and y coordinates of the mouseup position and then sends an emit to the function draw
    function doMouseUp(event) {
        ismousedown = false;
        endX = event.pageX - ctx.canvas.offsetLeft;
        endY = event.pageY - ctx.canvas.offsetTop;
        socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY, colour: ctx.strokeStyle, thickness: ctx.lineWidth});
    }

// Allows the pen to draw freely, not in straight lines, by setting the position it has just been as the
// beginning of the "line"
    function doMouseMove(event) {
        if (ismousedown) {
            endX = event.pageX - ctx.canvas.offsetLeft;
            endY = event.pageY - ctx.canvas.offsetTop;
            socket.emit('draw', {endX: endX, endY: endY, startX: startX, startY: startY, colour: ctx.strokeStyle, thickness: ctx.lineWidth});
            startX = endX;
            startY = endY;
        }
    }

// Actually draws the line with the function 'stroke', moves to the start coordinates and draws a line to the end ones
// and sets the old variable to the current x and y coordinates, so that it can run again
    socket.on("draw", function (msg) {
        ctx.beginPath();
        ctx.moveTo(msg.startX, msg.startY);
        ctx.lineTo(msg.endX, msg.endY);
        ctx.strokeStyle = msg.colour;
        ctx.lineWidth = msg.thickness;
        ctx.stroke();
        old = msg;
        refreshColour();
        refreshSize()
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
            socket.emit('chat message', username + ": " + $('#m').val());
            $('#m').val('');
        }
        return false;
    });

    
// When the user selects their nickname it emits that the user has changed their name, and their new nickname.
// Also validates if the nickname box is empty
    $('#setnick').submit(function () {
        if ($('#nick').val() !== "") {
            var newusername = $("#nick").val();
            socket.emit('chat message', username + " changed their nickname to: " + newusername);
            socket.emit('nickname', newusername);
            username = newusername;
            $('#nick').val('');
        }
        return false;
    });


// Outputs the latest message
    socket.on('chat message', function (msg) {
        var message = document.createElement('div');
        message.setAttribute('class', 'chat-message');
        message.innerHTML = msg;
        var messageArea = $('.chat-messages');
        messageArea.append(message);
        message.scrollIntoView(false);
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



});
