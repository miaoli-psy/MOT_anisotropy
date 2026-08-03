/********************************************************************
 *
 *	Project Name: MOT
 *	Version: 1.0 (6-August-2013)
 *	Author: Thomas Hendrucjx
 *
 *	This software contains the necessary functions to manage a canvas
 *	and run the MOT test in it.
 *
 ********************************************************************/

/***********************
 *	CONSTANTS
 ***********************/
var BACKGROUND_COLOR = "#DDDDDD";
var BACKGROUND_COLOUR_EL = 221;
var DRAW_INTERVAL = 10;//ms
var DOT_COLOR = "#000000";
var NUMBER_OF_DOTS = 10;
var TRAVEL_TIME = 5; //s -> the number of seconds it would take to go from one side of the screen to the other.
var MAX_DEGREE = 2;
var IMPORTANT_FACTOR = 0.3;
var DOT_SIZE = 0.02;
var TEST_TIME = 10000; //ms
var END_VIEW_TIME = 1500; //ms
var BLINK_PERC = 0.8;

/***********************
 *	VARIABLES
 ***********************/
var background;
var draw_interval = DRAW_INTERVAL;
var dots = [];
var done = false;
var result;
var canvas;
var ctx;
var time = 0;
var endView = false;
var endViewTime = 0;
var numImpDots = 0;


//TEMP TODO
var movementAllowed = false;
var interceptionPoint;

//relative value
var circle_radius = 5;
var speed = 1;

var user = [];


/***********************
 *	GETTERS AND SETTERS
 ***********************/
function setUser(data){
    user = data;
}

/***********************
 *	INIT FUNCTION
 ***********************/
function init(){
    setCanvasAndContext();
    window.addEventListener("keydown",doKeyDown,false);
    window.addEventListener("mousedown", doMouseMove, false);
    window.addEventListener("mouseup", doMouseMove, false);
   // window.addEventListener("mousemove", doMouseMove, false);

    getFPSScreen();
    background = new ColouredRectangle(0, 0, ctx.canvas.width, ctx.canvas.height, BACKGROUND_COLOR);

    determineRelatives();
    createDots();

    determineSpeed(draw_interval);
    setInterval(draw, draw_interval);
}

/***********************
 *	OBJECTS
 ***********************/
function Point(x, y) {
    this.x = x;
    this.y = y;
}

function Vector_Polar(r,O){
    this.r = r;
    this.O = O;
}

function Circle(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
}

function Rectangle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

function ColouredRectangle(x, y, width, height, colour) {
    this.rect = new Rectangle(x, y, width, height);
    this.colour = colour;
}

function Dot(circle, vector, deviation,important){
    this.circle = circle;
    this.vector = vector;
    this.deviation = deviation;
    this.oldLocations = new Array(10);
    this.important = important;
    this.clicked = false;
    this.deviationbuffer = 0;
    this.allowedToChangeAngle = true;
}

/***********************
 *	DRAW FUNCTIONS
 ***********************/
function drawDot(d, colour){
    drawCircle(d.circle,colour);
    //drawCircleNF(new Circle(d.circle.x, d.circle.y, d.circle.r * 4),colour);
    //drawVector(d.vector, new Point(d.circle.x, d.circle.y), d.circle.r*15);
}

/*The colour has to be in the format of #RRGGBBAA in hex*/
function drawDotOutline(d,colour_out,colour_in){
    drawCircle(d.circle,colour_out);
    drawCircle(new Circle(d.circle.x, d.circle.y, d.circle.r*0.80),colour_in);
}

function drawVector(v,p,l){
    ctx.moveTo(p.x, p.y);
    var oke = false;
    var x;
    var y;
    while(!oke){
        x = p.x + Math.cos(Math.PI*2*v.O/360)*l;
        y = p.y + Math.sin(Math.PI*2*v.O/360)*l;
        if(x >= 0 && x < ctx.canvas.width && y >= 0 && y < ctx.canvas.height){
            oke = true;
        }else{
            l--;
        }
    }
    ctx.lineTo(x,y);
    ctx.stroke();
}

function drawCircle(c, colour) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
    ctx.fillStyle = colour;
    ctx.fill();
}

function drawCircleNF(c, colour){
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
}

function drawRectangle(r, colour) {
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.width, r.height);
    ctx.fillStyle = colour;
    ctx.fill();
}

function drawDots(all_dots, colour){
    var color = colour;
    for( var i = 0 ; i < all_dots.length ; i++ ){
        /*colour = color;
        if(i == 0) colour = 'yellow';
        if(i == 1) colour = 'green';
        if(i == 2) colour = 'pink';
        if(i == 3) colour = 'blue';
        if(i == 4) colour = 'black';
        if(i == 5) colour = 'brown';
        if(i == 6) colour = 'orange'; */
        if(time > TEST_TIME && all_dots[i].clicked){
            if(all_dots[i].important){
                colour = '#C5B358';
            }else{
                colour = 'red';
            }
        }
        drawDot(all_dots[i],colour);
    }
}

function drawResultDots(all_dots, colour){
    var color = colour;
    for( var i = 0 ; i < all_dots.length ; i++ ){
        colour = color
        if(all_dots[i].clicked){
            if(all_dots[i].important){
                colour = '#C5B358';
            }else{
                colour = 'red';
            }
            drawDotOutline(all_dots[i],color,colour)
        }else{
            drawDot(all_dots[i],color);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRectangle(background.rect, background.colour);
    //drawGrid();
    if(!done){
        if(time > 3000 && time < TEST_TIME){
            drawDots(dots,DOT_COLOR);
            //if(interceptionPoint != null) drawPoint(interceptionPoint,'blue',2);
            //if(movementAllowed){
                doPhysics();

                movementAllowed = false;
            //}
        }else if( time < 3000){
            blinkIfNeeded();
        }else{
            drawResultDots(dots,DOT_COLOR);
            endOfTest();
        }
    }else{
        drawResult();
    }
    time += Math.round(draw_interval);
}

function endOfTest(){
    var importantDots = 100;
    var clickedImportantDots = 1;
    if(!endView){
        importantDots = 0;
        clickedImportantDots = 0;
        var allClicked = true;
        for ( var iDot = 0 ; iDot < dots.length ; iDot++ ) {
            if(dots[iDot].important){
                importantDots++;
                if(dots[iDot].clicked){
                    clickedImportantDots++;
                }
            }
        }
    }
    if(clickedImportantDots >= importantDots){
        endView = true;
    }
    if(endView){
        endViewTime += draw_interval;
        if(endViewTime >= END_VIEW_TIME){
            done = true;
            var wrong = 0;
            for ( var idot = 0 ; idot < dots.length ; idot++ ) {
                if(!dots[idot].important && dots[idot].clicked) wrong++;
            }
            endTest(wrong);
        }
    }
}

function blinkIfNeeded(){
    var colour = "#000000";
    for( var i = 0 ; i < dots.length ; i++ ){
        /*if(i == 0) colour = 'yellow';
        if(i == 1) colour = 'green';
        if(i == 2) colour = 'red';
        if(i == 3) colour = 'blue';
        if(i == 4) colour = 'black';
        if(i == 5) colour = 'brown';
        if(i == 6) colour = 'orange';*/
        if(!dots[i].important || (time%1000)<500){
            drawDot(dots[i],colour);
        }else{
            var red = colour.substring(1,2);
            var cl = parseInt(red,16);
            var col = Math.round((BACKGROUND_COLOUR_EL-cl)*BLINK_PERC + cl);
            var color = "rgb("+col+","+col+","+col+")";
            drawDotOutline(dots[i],colour,color);
        }
    }
}

function drawResult(){
    ctx.fillStyle = 'black';
    ctx.font = 'italic 40pt Calibri';
    ctx.textAlign = 'center';
    ctx.fillText("Result",ctx.canvas.width/2,ctx.canvas.height/3);
    ctx.fillText(result,ctx.canvas.width/2,2*ctx.canvas.height/3);
}

function drawGrid(){
    for(var x = 100 ; x < ctx.canvas.width ; x += 100 ) {
        ctx.moveTo(x,0);
        ctx.lineTo(x,ctx.canvas.height);
        ctx.stroke();
    }
    for( var y = 100 ; y < ctx.canvas.height ; y += 100) {
        ctx.moveTo(0,y);
        ctx.lineTo(ctx.canvas.width,y);
        ctx.stroke();
    }
}

function drawPoint(p,colour,radius){
    drawCircle(new Circle(p.x, p.y, radius),colour);
}

/***********************
 *	INPUT FUNCTIONS
 ***********************/
function doMouseMove(e) {
    if(!done && time > TEST_TIME && !endView){
        var mouseX, mouseY;
        if(e.offsetX){
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        }else if(e.layerX){
            mouseX = e.layerX;
            mouseY = e.layerY;
        }

        for ( var iDot = 0 ; iDot < dots.length ; iDot++ ) {
            if(inCircle(dots[iDot].circle,mouseX,mouseY)){
                dots[iDot].clicked = true;
            }
        }
    }
}

function inCircle(circle,x,y){
    var distance = Math.sqrt(Math.pow((circle.x - x),2) + Math.pow((circle.y - y),2));
    if(distance < circle.r) return true;
    else return false;
}

function doKeyDown(e){
    if(!done){
        e = null;
        movementAllowed = true;
       /* if(e.keyCode == KEY_ARROW_DOWN){
            newInput("DOWN");
        }else if(e.keyCode == KEY_ARROW_LEFT){
            newInput("LEFT");
        }else if(e.keyCode == KEY_ARROW_RIGHT){
            newInput("RIGHT");
        }else if(e.keyCode == KEY_ARROW_UP){
            newInput("UP");
        }   */
    }
}

/***********************
 *  PHYSICS FUNCTIONS
 **********************/
function detectCollision(circle1, circle2){
    if(circle1 === null || circle2 === null) return;
    var distance = Math.sqrt(Math.pow(Math.abs(circle1.x - circle2.x),2) + Math.pow(Math.abs(circle1.y - circle2.y),2));
    var minimum_distance = (circle1.r + circle2.r);
    if(distance < (minimum_distance *4)){
        var angle = Math.atan(Math.abs(circle2.y - circle1.y)/Math.abs(circle1.x - circle2.x));
        if(circle1.x - circle2.x < 0) angle *= -1;
        angle = radianToDegrees(angle);
        if(angle >= 45 && angle <= 135) return "up";
        if(angle >= 135 && angle <= 225) return "left";
        if(angle >= 225 && angle <= 315) return "down";
        if((angle >= 315 && angle <= 360) || (angle >= 0 && angle <= 45)) return "right";
    }
    else return "none";
}

function doPhysics(){
    for( var ii = 0 ; ii < dots.length ; ii++ ){
        dots[ii] = moveDot(dots[ii]);
        if(dots[ii].allowedToChangeAngle){
            var delta_angle;
            if(Math.random() > dots[ii].deviation ){
                delta_angle = Math.random() * MAX_DEGREE;
            }else{
                delta_angle = (Math.random() * MAX_DEGREE)*-1;
            }
            dots[ii].vector.O = (dots[ii].vector.O + delta_angle)%360;
            if(dots[ii].vector.O < 0) dots[ii].vector.O = 360 + dots[ii].vector.O;
        }else{
            dots[ii].allowedToChangeAngle = true;
        }
        if((time%1000 < 10 || time%1000 > 990) && Math.random() < 0.3){
            dots[ii].deviation = (Math.random()/2)+0.25;
        }

    }
    //TO prevent that they get stuck
    for( var i = 0 ; i < dots.length ; i++ ){
        var pnt = new Point(Math.round(dots[i].circle.x),Math.round(dots[i].circle.y));
        if(dots[i].oldLocations.length > 20){
            var pnt_old = dots[i].oldLocations.pop();
            if(pnt_old.x == pnt.x && pnt_old.y == pnt.y){
                var new_angle = (dots[i].vector.O + 180)%360;
                dots[i].vector = new Vector_Polar(dots[i].vector.r,new_angle);
                dots[i].vector.r *= -1;
                //setNewLocation(dots[i]);
            }
        }
        dots[i].oldLocations.push(pnt);
    }
}

function setNewLocation(dot){
    var y = Math.round(Math.random()*15);
    var x = Math.round(Math.random()*15);
    var y_sign = Math.random();
    var x_sign = Math.random();
    if(y_sign > 0.5) y *= -1;
    if(x_sign > 0.5) x *= -1;
    dot.circle.x += x;
    dot.circle.y += y;
    if(dot.circle.x - dot.circle.r < 0) dot.circle.x = dot.circle.r + 1;
    if(dot.circle.x + dot.circle.r > ctx.canvas.width) dot.circle.x = ctx.canvas.width - dot.circle.r - 1;
    if(dot.circle.y - dot.circle.r < 0) dot.circle.y = dot.circle.r + 1;
    if(dot.circle.y + dot.circle.r > ctx.canvas.height) dot.circle.y = ctx.canvas.height - dot.circle.r -1;
}

function inbounds(circle){
    if(circle.x + circle.r > ctx.canvas.width) return "right";
    if(circle.x - circle.r < 0) return "left";
    if(circle.y - circle.r < 0) return "up";
    if(circle.y + circle.r > ctx.canvas.height) return "down";
    return "none";
}

function moveDot(dot){
    var movedDot = new Dot(new Circle(dot.circle.x + dot.vector.r * Math.cos((dot.vector.O/360)*Math.PI*2),dot.circle.y + dot.vector.r * Math.sin((dot.vector.O/360)*Math.PI*2),dot.circle.r),dot.vector,dot.deviation,dot.important);
    var canMove = true;
    var direction;
    for( var i = 0 ; i < dots.length ; i++) {
        var angle = 0;
        if(dots[i].circle.x === dot.circle.x && dots[i].circle.y === dot.circle.y){

        }else if(detectCollision(dots[i].circle,movedDot.circle) != "none"){
            canMove = false;
            //dot.vector.O = getBounceAngle(dot.vector.O,detectCollision(dots[i].circle,movedDot.circle));
            dot.vector.O = getCollisionBounceAngle(dots[i].circle,movedDot.circle);
        }else if( (angle = advancedPathing(dots[i],movedDot)) >= 0){
            movedDot.vector.O = angle;
            if(movedDot.deviationbuffer == 0){
                movedDot.deviation = 1-movedDot.deviation;
                movedDot.deviationbuffer = 5;
            }else{
                movedDot.deviationbuffer--;
            }
            movedDot.allowedToChangeAngle = false;
        }
    }
    if(!((direction = inbounds(movedDot.circle)) == "none")){
        canMove = false;
        dot.vector.O = getBounceAngle(dot.vector.O,direction);
    }
    if(canMove){
        return movedDot;
    }
    return dot;
}

function advancedPathing(dot_stil,moving_dot){
    var vector_point = new Point(moving_dot.circle.x + Math.cos(Math.PI*2*moving_dot.vector.O/360)*moving_dot.circle.r*15, moving_dot.circle.y + Math.sin(moving_dot.vector.O*Math.PI*2/360)*moving_dot.circle.r*10);
    var dist = distToSegment(new Point(dot_stil.circle.x, dot_stil.circle.y),new Point(moving_dot.circle.x, moving_dot.circle.y),vector_point);
    if(dist < dot_stil.circle.r * 4){
        var rico_dots = (dot_stil.circle.y - moving_dot.circle.y)/(dot_stil.circle.x - moving_dot.circle.x);
        var rico_vector = (vector_point.y - moving_dot.circle.y)/(vector_point.x - moving_dot.circle.x);
        if( moving_dot.circle.x >= dot_stil.circle.x && moving_dot.circle.y >= dot_stil.circle.y){
            //quadrant ++
            if(Math.abs(rico_vector) > Math.abs(rico_dots)){
                //make angle greater;
                return moving_dot.vector.O + 4*MAX_DEGREE;
            }else{
                //make angle smaller;
                return moving_dot.vector.O - 4*MAX_DEGREE;
            }
        }else if(moving_dot.circle.x < dot_stil.circle.x && moving_dot.circle.y >= dot_stil.circle.y){
            //quadrant -+
            if(Math.abs(rico_vector) > Math.abs(rico_dots)){
                //make angle smaller;
                return moving_dot.vector.O - 4*MAX_DEGREE;
            }else{
                //make angle greater;
                return moving_dot.vector.O + 4*MAX_DEGREE;
            }
        }else if(moving_dot.circle.x < dot_stil.circle.x && moving_dot.circle.y < dot_stil.circle.y){
            //quadrant --
            if(Math.abs(rico_vector) > Math.abs(rico_dots)){
                //make angle greater;
                return moving_dot.vector.O + 4*MAX_DEGREE;
            }else{
                //make angle smaller;
                return moving_dot.vector.O - 4*MAX_DEGREE;
            }
        }else{
            //quadrant +-
            if(Math.abs(rico_vector) > Math.abs(rico_dots)){
                //make angle smaller;
                return moving_dot.vector.O - 4*MAX_DEGREE;
            }else{
                //make angle greater;
                return moving_dot.vector.O + 4*MAX_DEGREE;
            }
        }
    }else{
        return -1000;
    }
}

function sqr(x) {
    return x * x
}

function dist2(v, w) {
    return sqr(v.x - w.x) + sqr(v.y - w.y);
}

function distToSegmentSquared(p, v, w) {
    var l2 = dist2(v, w);
    if (l2 == 0) return dist2(p, v);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    if (t < 0) return dist2(p, v);
    if (t > 1) return dist2(p, w);
    interceptionPoint = new Point(v.x + t * (w.x - v.x),v.y + t * (w.y - v.y));
    return dist2(p, {   x: v.x + t * (w.x - v.x),
                        y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
}

function getCollisionBounceAngle(circle_still, circle_moving){
    var angle = Math.atan(Math.abs(circle_moving.y - circle_still.y)/Math.abs(circle_still.x - circle_moving.x));
    if(circle_still.x - circle_moving.x < 0) angle *= -1;
    angle = radianToDegrees(angle);
    return (angle+180)%360;
}

function getBounceAngle(angle,direction){
    var bounceAngle = 180;
    if( direction === "up"){
        bounceAngle = 360 - angle;
    }else if( direction === "down"){
        bounceAngle = 360 - angle;
    }else if( direction === "left"){
        if( angle >= 0 && angle <= 180 ){
            bounceAngle = 180 - angle;
        }else{
            var Temp = angle - 180;
            var Temp2 = 180 - Temp;
            bounceAngle = 180 + Temp2;
        }
    }else if( direction === "right"){
        if( angle >= 0 && angle <= 180 ){
            bounceAngle = 180 - angle;
        }else{
            var temp = angle - 180;
            var temp2 = 180 - temp;
            bounceAngle = 180 + temp2;
        }
    }else{
        console.log("ERROR");
    }
    return bounceAngle%360;
}

/***********************
 *	OTHER FUNCTIONS
 ***********************/
function setCanvasAndContext() {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    ctx.canvas.height = window.innerHeight * 0.88;
    ctx.canvas.width = window.innerHeight * 0.88;

    var slider = $('#slider');
    slider.css('width', ctx.canvas.width);

    var menu_dv = document.getElementById("menu_div");
    var menW = menu_dv.style.width;
    console.log(menW);
    var mnW = menW.substring(0,3);
    console.log(mnW);
    var offs = -1*(window.innerWidth - mnW - ctx.canvas.width)/2+12.13;
    console.log("offs"+offs);

    var canvas_dv = $("#canvas_div");
    canvas_dv.css('left',offs);
    console.log(window.innerWidth);
    console.log(ctx.canvas.width);
    console.log((window.innerWidth - ctx.canvas.width)/2);
    console.log(canvas_dv.offsetLeft);

    /*var menu = $('#menu_div');
     menu.css('width',ctx.canvas.width);
     menu.css('height',25);*/
}

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

function calculateFPS(samples) {
    var average_interval = 0;
    for (var i = 0; i < samples.length; i++) {
        average_interval += samples[i];
    }
    average_interval = average_interval / samples.length;
    determineSpeed(average_interval);
    draw_interval = average_interval;
}

function determineSpeed(interval){
    var travel_distance = ctx.canvas.width;
    var hz = (1/interval)*1000;
    speed = travel_distance/(TRAVEL_TIME*hz);
}

function determineRelatives(){
    circle_radius = ctx.canvas.width * DOT_SIZE;
}

function createDots(){
    for (var i = 0 ; i < NUMBER_OF_DOTS ; i++ ) {
        var location = getRandomLocation();
        var angle = Math.random()*360;
        var imp = false;
        if( numImpDots++ < (IMPORTANT_FACTOR*NUMBER_OF_DOTS)){
            imp = true;
        }
        dots.push(new Dot(new Circle(location.x,location.y,circle_radius),new Vector_Polar(1,angle),(Math.random()/2)+0.25,imp));
    }
}

function getRandomLocation(){
    var gotLocation = false;
    var location;
    while (!gotLocation){
        location = new Point(Math.random()*ctx.canvas.width,Math.random()*ctx.canvas.height);
        gotLocation = true;
        for( var i = 0 ; i < dots.length ; i++ ) {
            if((detectCollision(dots[i].circle, new Circle(location.x,location.y,circle_radius))) != "none"){
                gotLocation = false;
                break;
            }
        }

        if((inbounds(new Circle(location.x,location.y,circle_radius+100)))!="none"){ //The 10 extra for the radius is as a buffer
            gotLocation = false;
        }
    }
    return location;
}

function radianToDegrees(ang){
    if(ang < 0) ang += (Math.PI * 2);
    return (ang * 360) / (Math.PI * 2);
}

function newInput(dir){

}

function endTest(result){
    this.result = result;
}

