/********************************************************************
 *
 *	Project Name: Demo
 *	Version: 1.0 (9-August-2013)
 *	Author: Thomas Hendrickx
 *
 *	This file is meant to be a demo of how a simple test looks like
 *  in JavaScript.
 *
 ********************************************************************/

/***********************
 *  TIPS
 **********************/
// Before you read the code please read this first:
// To make the debugging easier, Chrome has a build in debug tool that you can access via Ctrl+Shift+I.
// For Firefox users I strongly recommend Firebug.
// For those using Internet Explorer: Just download Chrome or Firefox and make the internet a better place. If you
// do not believe me:Once you have a website that works perfectly on Chrome, Firefox, Opera, Safari and then you test
// it in Internet explorer you will understand.

/***********************
 *	CONSTANTS
 ***********************/
//This section is used to gather all constants that are used within the JavaScript code.
//Constants are easy to use as they will make the code more readable and make it easier
//to adjust all these constants throughout the document. No more need to go and find all
//of the places where this was used. Just change it here, and the everywhere in the document
//that value will be changed as wel.

var U_KEY = 85;
var I_KEY = 73;
var J_KEY = 74;
var K_KEY = 75;

var TEST_NAME = "DEMO_TEST";
var DRAW_INTERVAL = 10; //ms
var BACKGROUND_COLOR = "#DDDDDD";
var TEST_PAUZE = 500;//ms
var NUMBER_OF_TRIALS = 5;
var LINE_TRIALS_PERCENTAGES = 0.5; // 0.5 means that half of the trials will be just lines and the other half will be with 'holders'.
var NUMBER_OF_PRACTICE = 2;


/***********************
 *	VARIABLES
 ***********************/
//JavaScript will globalise all variables that don not have a var to start with. However
//by gathring all global variables here, we get a good overview of what is already been made
//and what not. This will make it easier to the declaration of multiple variables that will
//do the same thing.

var canvas;
var ctx;
var speed;
var background;
var draw_interval = DRAW_INTERVAL;
var user = [];
var done = false;
var result = [];

var time = 0;
var trialNumber = 0;
var trials;

//when initialising a variable with [] it means that this will be an array.
var objects = [];

//These variables are needed to make everything relative to the screen size. This will be explained
//further down where we give these a value.
var XOFFSET;
var YOFFSET;
var middleCross;
var crossColour = 'black';

/***********************
 *	INIT FUNCTION
 ***********************/
/**
 * This function will be called when the user has submitted its information on the form.
 * From here on everything will need to be executed by this function alone!
 */
function init() {
    // Set all html elements to have the propper position and dimensions.
    setCanvasAndContext();

    // We add an event listener which will listen if a certain event has happend. In this
    // demo we will only need key input but there is another included for the mouse.
    // structure of the used function:
    // window.addEventListener( event , callback function, useCaptureBoolean );
    // WATCH OUT: this event will also be called when it had not happend when the focus was on the canvas.
    // example: clicking outside the canvas will also generate a mousedown event!
    // some frequently used events:
    // "keydown": Is called when a key is pressed.
    // "keyup": Is called when a key is released.
    // "mousedown": Is called when the mousebutton is pressed.
    // "mousemove": Is called when the mouse has moved position.
    window.addEventListener("keydown",doKeyDown, false);
    window.addEventListener("mousedown", doMouseMove, false);
    //window.addEventListener("mouseup", doMouseMove, false);
    //window.addEventListener("mousemove", doMouseMove, false);

    // This will determine all internal parameters that will need to be relative to the width
    // and the height. More information at the function declaration.
    determineRelativeParameters(ctx.canvas.width, ctx.canvas.height);

    // Will try and get the fps of the screen. This is not used in this demo but is explained
    // how you can use this if you want to change your refreshrate to the fps of the screen.
    getFPSScreen();

    // Our canvas will have no standard background at the start. Once the canvas is cleared, it will get
    // a #FFFFFF colour. But by determining a rectangle that will cover the whole canvas and give a wanted colour.
    background = new ColouredRectangle(0, 0, ctx.canvas.width, ctx.canvas.height, BACKGROUND_COLOR);
    middleCross = new Cross(canvas.width/2,canvas.height/2,canvas.width/15,canvas.height/15,canvas.width/100);
    // info at declaration.
    calculateSpeed();

    // Now we create all the trials.
    trials = createTrials(trials);
    objects = setObjects();

    //
    setInterval(draw, draw_interval);
}

/***********************
 *	OBJECTS
 ***********************/
/**
 * Point is an object that consists of a x and y value and will represent a point in a 2D surface.
 * @param x The x value of the point.
 * @param y The y value of the point.
 * @constructor
 */
function Point(x,y){
    this.x = x;
    this.y = y;
    this.draw = function(ctx,colour,radius){
        var circ = new Circle(this.x,this.y,radius);
        circ.draw(ctx, colour);
    }
}

/**
 * A Line is an object that starts from a point and ends at a point.
 * @param begin The starting point of the line
 * @param end The ending point of the line.
 * @constructor
 */
function Line(begin,end){
    this.begin = begin;
    this.end = end;
    this.draw = function(ctx,colour){
        ctx.beginPath();
        ctx.moveTo(this.begin.x,this.begin.y);
        ctx.lineTo(this.end.x,this.end.y);
        ctx.lineWidth = ctx.canvas.width*0.01;
        ctx.strokeStyle = colour;
        ctx.stroke();
    }
}

/**
 * A circle is an object represented by its center point and the radius.
 * @param x The x value of the center.
 * @param y The y value of the center.
 * @param r The radius of the circle.
 * @constructor
 */
function Circle(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.draw = function(ctx,colour){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true);
        ctx.strokeStyle = colour;
        ctx.fillStyle = colour;
        ctx.fill();
    }
}

/**
 * A Rectangle is an object represented by it's upper left corner and it's with and height.
 * @param x The x value of the upper left corner.
 * @param y The y value of the upper left corner.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @constructor
 */
function Rectangle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.draw = function(ctx,colour){
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = colour;
        ctx.fill();
    }
}

/**
 * A Rectangle but with a set colour.
 * @param x The x value of the upper left corner.
 * @param y The y value of the upper left corner.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @param colour The colour if the rectangle.
 * @constructor
 */
function ColouredRectangle(x, y, width, height, colour) {
    this.rect = new Rectangle(x, y, width, height);
    this.colour = colour;
    this.draw = function(ctx){
        this.rect.draw(ctx,this.colour);
    }
}

/**
 * A cross is a object that is represented by its center point and by the it's width, height and line thickness.
 * @param x The x value of the center of the cross.
 * @param y The y value of the center of the cross.
 * @param w The width of the cross.
 * @param h The heigth of the cross.
 * @param t The thickness of the cross.
 * @constructor
 */
function Cross(x,y,w,h,t){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.t = t;
    this.draw = function(ctx,colour){
        var rectHori = new Rectangle(x-w/2,y-t/2,w,t);
        var rectVert = new Rectangle(x-t/2,y-h/2,t,h);
        rectHori.draw(ctx,colour);
        rectVert.draw(ctx,colour);
    }
}

/**
 * A trial is a single test element which can be repeated a number of times. Each trial has it's set properties which
 * may vary between trials.
 * @param practice Boolean, which if set true, means that the trial is a practice one.
 * @param version A string which will say which version of the trial it is.
 * @param objects The objects of the trial.
 * @constructor
 */
function Trial(practice, version, objects){
    this.practice = practice;
    this.version = version;
    this.objects = objects;
}

/***********************
 *	DRAW FUNCTIONS
 ***********************/
/**
 * Draw the given string on the canvas.
 * @param text The text to be drawn on the canvas.
 * @param x The x position of the text.
 * @param y The y position of the text.
 * @param align The alignment of the text according to the given position.
 * @param fontSize The size of the font in px.
 * @param colour The colour of the text.
 * @param strokeColour The colour of the strokes of the text.
 */
function drawText(text,x,y,align,fontSize,colour,strokeColour){
    ctx.fillStyle = colour;
    ctx.strokeStyle = strokeColour;
    ctx.font = 'italic '+fontSize+'pt Calibri';
    ctx.textAlign = align;
    ctx.fillText(text,x,y);
}

/**
 * This function will draw out the canvas as needed at the moment it is called.
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    background.draw(ctx);
    middleCross.draw(ctx,crossColour);
    var trialNumberToShow = 0;
    if(trialNumber >= NUMBER_OF_PRACTICE) trialNumberToShow = (trialNumber-NUMBER_OF_PRACTICE+1);
    var textToDraw = "Trial "+(trialNumberToShow)+"/"+NUMBER_OF_TRIALS;
    drawText(textToDraw,canvas.width,canvas.height,'end',15,'black','black');
    if(time > TEST_PAUZE){
        if(!done){
            crossColour = 'black';
            drawWindows();
        }else{
            crossColour = BACKGROUND_COLOR;
            drawResult();
        }
    }
    time+=draw_interval;
}

/**
 * Draw out the needed objects within the different windows on the canvas.
 */
function drawWindows(){
    for( var iWindow = 0 ; iWindow < objects.length ; iWindow++ ) {
        var x;
        var y;
        if( Math.floor(iWindow%2) == 0 ) x = 0;
        else x = ctx.canvas.width/2;

        if( Math.floor(iWindow/2) == 0 ) y = 0;
        else y = ctx.canvas.height/2;

        var startingPoint = new Point(x+XOFFSET, y+ (ctx.canvas.height/2) - YOFFSET);
        var endPoint = new Point(x + (ctx.canvas.width/2) - XOFFSET, y+YOFFSET);
        var line = new Line(startingPoint,endPoint);
        if(objects[iWindow])    drawOddLine(line);
        else                        drawNormalLine(line);
        if(trials[trialNumber].version == "triangle"){
            var lineVert = new Line(startingPoint,new Point(endPoint.x,startingPoint.y));
            var lineHori = new Line(new Point(endPoint.x,startingPoint.y),endPoint);
            lineHori.draw(ctx,'black');
            lineVert.draw(ctx,'black');
        }
    }
}

/**
 * Draw the line as an odd line. Which means it will be drawn from left to right instead of right to left
 * or the other way around.
 * @param line The line to be drawn.
 */
function drawOddLine(line){
    var lineToDraw = new Line(new Point(line.end.x,line.begin.y),new Point(line.begin.x,line.end.y));
    lineToDraw.draw(ctx,'black');
}

/**
 * Draw out the given line.
 * @param line The line to be drawn.
 */
function drawNormalLine(line){
    line.draw(ctx,'black');
}

/**
 * Draw out the result at the end of all trails.
 */
function drawResult(){
    ctx.fillStyle = 'black';
    ctx.font = 'italic 20pt Calibri';
    ctx.textAlign = 'center';
    ctx.fillText("Congratulations!",ctx.canvas.width/2,ctx.canvas.height/2-40);
    ctx.fillText("You have succesfully ",ctx.canvas.width/2,ctx.canvas.height/2);
    ctx.fillText("finished the test!",ctx.canvas.width/2,ctx.canvas.height/2+40);
}

/***********************
 *	INPUT FUNCTIONS
 ***********************/
/**
 * This function is called when a mouseMove event is created.
 * @param e The mouseMove event.
 */
function doMouseMove(e) {
    //do something with the event.
    //Here it is set to null to prevent a warning from popping up. SHOULD NOT BE DONE IN FINAL CODE!!
    e = null;
}

/**
 * This function is called when a keyDown event is created.
 * @param e The keyDown event.
 */
function doKeyDown(e){
    if(!done){
        if(e.keyCode == U_KEY){
            answer(objects[0],trials[trialNumber].practice,trials[trialNumber].version);
        }else if(e.keyCode == I_KEY){
            answer(objects[1], trials[trialNumber].practice, trials[trialNumber].version);
        }else if(e.keyCode == J_KEY){
            answer(objects[2],trials[trialNumber].practice,trials[trialNumber].version);
        }else if(e.keyCode == K_KEY){
            answer(objects[3],trials[trialNumber].practice,trials[trialNumber].version);
        }
    }
}

/***********************
 *	OTHER FUNCTIONS
 ***********************/
/**
 * Determine the values for all variables that should have values relative to the dimensions of the canvas.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 */
function determineRelativeParameters(width, height) {
    XOFFSET = width/8;
    YOFFSET = height/8;
}

/**
 * Will format the canvas to the needed properties for this test.
 * Will also store the context so it can be used throughout the javascript without needing to get the canvas element
 * again from the document.
 */
function setCanvasAndContext() {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    ctx.canvas.height = window.innerHeight * 0.88;
    ctx.canvas.width = window.innerHeight * 0.88;

    var slider = $('#slider');
    slider.css('width', ctx.canvas.width);

    var menu_dv = document.getElementById("menu_div");
    var menW = menu_dv.style.width;
    var mnW = menW.substring(0,3);
    var offs = -1*(window.innerWidth - mnW - ctx.canvas.width)/2+12.13;

    var canvas_dv = $("#canvas_div");
    canvas_dv.css('left',offs);
}

/**
 * Get the frames per second of the screen.
 */
function getFPSScreen() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;

    //noinspection JSUnresolvedVariable
    var start = performance.now();
    var nr_of_samples = 0;
    var samples = [];

    function step(timestamp) {
        var interval = timestamp - start;
        start = timestamp;
        if (nr_of_samples > 30) {
            calculateFPS(samples);
            return;
        } else if (nr_of_samples > 10) {
            samples.push(interval);
        }
        nr_of_samples++;
        requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

/**
 * Calculate the frames per second by the gotten samples.
 * @param samples The samples received from the testing.
 */
function calculateFPS(samples) {
    var average_interval = 0;
    for (var i = 0; i < samples.length; i++) {
        average_interval += samples[i];
    }
    average_interval = average_interval / samples.length;
    draw_interval = average_interval;
    calculateSpeed();
}

/**
 * Calculate the values of the variables that should be relative to the refreshrate of the screen.
 */
function calculateSpeed() {
    //set values.
}

/**
 * Create the trials.
 * @param trials The array in which the trails should come.
 * @returns {Array} The array with trials.
 */
function createTrials(trials){
    trials = [];
    var numberToMakeLeft = NUMBER_OF_PRACTICE+NUMBER_OF_TRIALS;
    var numberOfPracticeLeft = NUMBER_OF_PRACTICE;
    var numberOfNormalLinesLeft = numberToMakeLeft*LINE_TRIALS_PERCENTAGES;
    for( var iTrial = 0 ; iTrial < (NUMBER_OF_PRACTICE+NUMBER_OF_TRIALS) ; iTrial++ ){
        if( Math.random() < numberOfNormalLinesLeft/numberToMakeLeft){
            if(numberOfPracticeLeft-- > 0) trials.push(new Trial(true,"line",getObjects()));
            else trials.push(new Trial(false,"line",getObjects()));
        }else{
            if(numberOfPracticeLeft-- > 0) trials.push(new Trial(true,"triangle",getObjects()));
            else trials.push(new Trial(false,"triangle",getObjects()));
        }
    }
    return trials;
}

/**
 * Get a random objects array.
 * @returns {Array} The array with obejcts in.
 */
function getObjects(){
    var objects = [];
    var odd = Math.floor(Math.random()*4);
    for( var iOdd = 0 ; iOdd < 4 ; iOdd++ ){
        if(iOdd != odd )    objects.push(false);
        else                objects.push(true);
    }
    return objects;
}

/**
 * Set the needed objects and return them.
 * @returns {*} The new object array.
 */
function setObjects(){
    return trials[trialNumber].objects;
}

/**
 * Set the received answer.
 * @param ans The answer was correct or not.
 * @param practice The trial was a practice one or not.
 * @param version The version of the trial (traingle or line).
 */
function answer(ans, practice,version){

    if(ans) crossColour = "green";
    else crossColour = "red";
    result.push({ans: ans, pra: practice, version: version});
    time = 0;
    trialNumber++;
    if(trialNumber >= NUMBER_OF_TRIALS+NUMBER_OF_PRACTICE){
        done = true;
        trialNumber--;
        sendResult(result);
    }
    objects = setObjects();
}

/**
 * Send the result to the needed server location.
 * @param result
 */
function sendResult(result){
    var toSend = [];
    for( var iResult = 0 ; iResult < result.length ; iResult++ ){
        if(result[iResult].ans) toSend.push("correct  ");
        else toSend.push("incorrect  ");

        if(result[iResult].pra) toSend.push("practice  ");

        toSend.push(result[iResult].version);

        toSend.push(" \r\n ");
    }
    sendData(toSend,TEST_NAME);
}