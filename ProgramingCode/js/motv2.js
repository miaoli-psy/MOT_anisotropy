/********************************************************************
 *
 *	Project Name: MOT
 *	Version: 2.0 (9-August-2013)
 *	Author: Thomas Hendrickx
 *
 *	This software contains the necessary functions to manage a canvas
 *	and run the MOT ellipses test in it.
 *
 ********************************************************************/

/***********************
 *	CONSTANTS
 ***********************/
var MOT_BACKGROUND_COLOR = "#DDDDDD";
var BACKGROUND_COLOUR_EL = 221;
var DRAW_INTERVAL = 10;//ms
var DOT_COLOR = "#000000";
var NUMBER_OF_DOTS = 10;
var TRAVEL_TIME = 5; //s -> the number of seconds it would take to go from one side of the screen to the other.
var MAX_DEGREE = 2;
var IMPORTANT_FACTOR = 0.5;
var DOT_SIZE = 0.02;
var TEST_TIME = 10000; //ms
var DOT_VIEW_TIME = 3000; //ms
var BLINK_PERC = 0.8;
var ELLIPSE_WIDTH = 1;
var ELLIPSE_HEIGHT = 1;
var TARGET_RADIUS = 1;
var MIN_DIST_CENTER_PERC = 0.05;
var MIN_DIST_CENTER = 0;
var MAX_SIZE = 0.25; //--> the size, bigger.
var MIN_SIZE = MAX_SIZE;// They stay the same size.
var NUMBER_OF_TRIALS = 40;
var SPAWN_IN_CENTER = 0.7;
var NUMBER_OF_TRIALS_VERTICAL = 0.5;

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
var trialNumber = 1;
var trials = [];
var trial_paths = [];
var test_paths = [];
var go_to_next_trial = false;
var ellipse_width;
var ellipse_height;
var confirm_clicked = false;
var maximumDotsSelected = false;

var bla = true;
var circles = [];
var vectors = [];


//TEMP TODO
var interceptionPoint;

//relative value
var circle_radius = 5;
var speed = 1;
var middleP;
var max_radius;

var user = [];


/***********************
 *	GETTERS AND SETTERS
 ***********************/
/**
 * This function isn called by the form to give the data from the user to the test.
 * @param data The data of the user.
 */
function setUser(data){
    user = data;
}

/***********************
 *	INIT FUNCTION
 ***********************/
/**
 * This function is called when the user has given his data. First function that is called!
 */
function init(){
    setCanvasAndContext();
    window.addEventListener("keydown",doKeyDown,false);
    window.addEventListener("mousedown", doMouseMove, false);

    getFPSScreen();
    background = new ColouredRectangle(0, 0, ctx.canvas.width, ctx.canvas.height, MOT_BACKGROUND_COLOR);

    createTrials();
    setupTrial();

    determineSpeed(draw_interval);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRectangle(background.rect, background.colour);

    drawText("Calibrating...",ctx.canvas.width/2,ctx.canvas.height/2,'center',40,'black','black');
}

/***********************
 *	OBJECTS
 ***********************/
/**
 * A point on the canvas.
 * @param x The x coordinate of the point.
 * @param y The y coordinate of the point.
 */
function Point(x, y) {
    this.x = x;
    this.y = y;
}

/**
 * A vector according the polar coordinates.
 * @param r Radius of the vector.
 * @param O Angle of the vector.
 */
function Vector_Polar(r,O){
    this.r = r;
    this.O = O;
}

/**
 * A Circle
 * @param x The x coordinate of the center of the circle.
 * @param y The y coordinate of the center of the circle.
 * @param r The radius of the circle.
 */
function Circle(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
}

/**
 * An Ellipse
 * @param x The x coordinate of the center of the ellipse.
 * @param y The y coordinate of the center of the ellise.
 * @param w The width of the ellipse.
 * @param h The height of the ellipse.
 * @param angle The angle of orientation of the ellipse.
 */
function Ellipse(x,y,w,h,angle){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.turn = false;
    this.angle = angle;
    this.collided = false;

    /**
     * Draw the ellipse.
     * @param colour The colour that the ellipse should have.
     * @param ctx The context in which the ellipse should be drawn.
     */
    this.draw = function(colour, ctx) {
        var size_modifier = ((MAX_SIZE - MIN_SIZE)*(distanceBetweenPoints(middleP,new Point(this.x,this.y))/max_radius)+MIN_SIZE);
        this.h = ellipse_height*size_modifier;
        this.w = ellipse_width*size_modifier;
        var elgna = Math.atan((this.y - (ctx.canvas.height/2))/(this.x-(ctx.canvas.width/2)));
        var degrees = elgna*360 / (2*Math.PI);
        if(degrees < 0){
            if(this.x - (ctx.canvas.width/2) < 0){
                //180 verkeerd
                this.angle = degrees + 180;
            }else{
                this.angle = degrees + 360;
            }
        }else{
            if(this.x - (ctx.canvas.width/2) < 0){
                this.angle = degrees + 180;
            }else{
                this.angle = degrees;
            }
        }
        var cornerX = this.x;/* - this.w / 2.0  */
        var cornerY = this.y;/* - this.h / 2.0 */
        var r = Math.sqrt(Math.pow(cornerX,2)+Math.pow(cornerY,2));
        var phi = Math.asin(cornerY/r);
        var delta_angle = phi - elgna;
        var xCenter = r*Math.cos(delta_angle);
        var yCenter = r*Math.sin(delta_angle);
        var width = this.w;
        var height = this.h;
        if(this.turn){
            width = this.h;
            height = this.w;
        }
        drawEllipse(ctx, xCenter, yCenter, width, height, elgna,colour,true);
    };

    /**
     * Draw the outlining of the ellipse.
     * @param colour The colour of the ellipse.
     * @param ctx The context in which the ellipse should be drawn.
     */
    this.drawEmpty = function(colour,ctx) {
        var size_modifier = ((MAX_SIZE - MIN_SIZE)*(distanceBetweenPoints(middleP,new Point(this.x,this.y))/max_radius)+MIN_SIZE);
        this.h = ellipse_height*size_modifier*4;
        this.w = ellipse_width*size_modifier*4;
        this.angle = Math.atan((this.x - (ctx.canvas.width/2))/((ctx.canvas.height/2)-this.y));
        var cornerX = this.x;/* - this.w / 2.0  */
        var cornerY = this.y;/* - this.h / 2.0 */
        var r = Math.sqrt(Math.pow(cornerX,2)+Math.pow(cornerY,2));
        var phi = Math.asin(cornerY/r);
        var delta_angle = phi - this.angle;
        var xCenter = r*Math.cos(delta_angle);
        var yCenter = r*Math.sin(delta_angle);
        var width = this.w;
        var height = this.h;
        if(!this.turn){
            width = this.h;
            height = this.w;
        }
        drawEllipse(ctx, xCenter, yCenter, width, height, this.angle,colour,false);
    };

    /**
     * The raw drawing of the ellipse.
     * @param ctx The context in which the ellipse should be drawn.
     * @param x The x coordinate of the center of the ellipse.
     * @param y The y coordinate of the center of the ellipse.
     * @param w The width of the ellipse.
     * @param h The height of the ellipse.
     * @param angle The orientation angle of the ellipse.
     * @param colour The colour of the ellipse.
     * @param fill Boolean that the ellipse should be filled or not.
     */
    function drawEllipse(ctx, x, y, w, h,angle,colour,fill) {
        var kappa = .5522848,
            ox = (w / 2) * kappa, // control point offset horizontal
            oy = (h / 2) * kappa, // control point offset vertical
            xb = x - w/ 2,
            yb = y - h/2,
            xe = x + w/2,           // x-end
            ye = y + h/2,           // y-end
            xm = x/* + w / 2*/,       // x-middle
            ym = y/* + h / 2*/;       // y-middle

        ctx.save();
        ctx.beginPath();
        ctx.rotate(angle);
        ctx.moveTo(xb, ym);
        ctx.bezierCurveTo(xb, ym - oy, xm - ox, yb, xm, yb);
        ctx.bezierCurveTo(xm + ox, yb, xe, ym - oy, xe, ym);
        ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        ctx.bezierCurveTo(xm - ox, ye, xb, ym + oy, xb, ym);
        ctx.fillStyle = colour;
        if(fill) ctx.fill();
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }


}

/**
 * A rectangle
 * @param x The x coordinate of the upper left corner of the rectangle.
 * @param y The y coordinate of the upper left corner of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 */
function Rectangle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

/**
 * A Coloured rectangle.
 * @param x The x coordinate of the upper left corner of the rectangle.
 * @param y The y coordinate of the upper left corner of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @param colour The colour of the rectangle.
 */
function ColouredRectangle(x, y, width, height, colour) {
    this.rect = new Rectangle(x, y, width, height);
    this.colour = colour;
}

/**
 * A dot.
 * @param ellipse The ellipse shape of the dot.
 * @param vector The vector at which the ellipse moves (polar vector).
 * @param deviation The deviation that the dot has in it's movements (<0.5 dot will move more to the left, more negative is more to left. >0.5 more to the right and the higher, the more).
 * @param important The dot is an important one -> should be clicked at the end of the test.
 */
function Dot(ellipse, vector, deviation,important){
    this.ellipse = ellipse;
    this.vector = vector;
    this.deviation = deviation;
    this.oldLocations = new Array(10);
    this.important = important;
    this.clicked = false;
    this.deviationbuffer = 0;
    this.allowedToChangeAngle = true;
    this.draw = this.ellipse.draw;

    /**
     * Returns the object in string form. Usefull for when printing out the properties of the object.
     * @returns {string}
     */
    this.toString = function(){
        var vec = "vector{r:"+this.vector.r+" O:"+this.vector.O+"}";
        var ell = "ellipse{x:"+this.ellipse.x+" y:"+this.ellipse.y+" w:"+this.ellipse.w+" h:"+this.ellipse.h+"}";
        var all =   ell+"\r\n"+
            vec+"\r\n"+
            "div:"+this.deviation+"\r\n"+
            "oLo:"+this.oldLocations.length+"\r\n"+
            "imp:"+this.important+"\r\n";
        return all;
    }
}

function Trial(numDots,correctDots,orient,testTime){
    this.numDots = numDots;
    this.correctDots = correctDots;
    this.orient = orient;
    this.testTime = testTime;
}

/***********************
 *	DRAW FUNCTIONS
 ***********************/
/**
 * Draw the given text on the screen at the given position with the wanted font size.
 * @param text The text string.
 * @param x The x position which will be left, middle or right of the text detpending on the alignment.
 * @param y The y position of the text which will be the bottom of the text.
 * @param align The alignment of the text relative to the given x,y position.
 * @param fontSize The size of the text font.
 * @param colour The colour of the text.
 */
function drawText(text,x,y,align,fontSize,colour,strokeColour){
    ctx.fillStyle = colour;
    ctx.strokeStyle = strokeColour
    ctx.font = 'italic '+fontSize+'pt Calibri';
    ctx.textAlign = align;
    ctx.fillText(text,x,y);
}

/**
 * Draw the given dot with the given colour.
 * @param d The dot.
 * @param colour The colour the dot should have.
 */
function drawDot(d, colour){
    d.ellipse.draw(colour,ctx);
    bla = false;
    //drawPolarVector(d.vector, new Point(d.ellipse.x, d.ellipse.y), d.ellipse.w*3,'black');
    //var ell = new Ellipse(d.ellipse.x,d.ellipse.y,d.ellipse.w*4,d.ellipse.h*4, d.ellipse.angle);
    //ell.drawEmpty(colour,ctx);
}

/*The colour has to be in the format of #RRGGBBAA in hex*/
/**
 * The outlining of the dot will be drawn.
 * @param d The dot.
 * @param colour_out The colour of the ring of the dot. (format has to be "#RRGGBBAA")
 * @param colour_in  The colour of the inner part of the dot. (format has to be "#RRGGBBAA")
 */
function drawDotOutline(d,colour_out,colour_in){
    d.ellipse.draw(colour_out,ctx);
    var ell = new Ellipse(d.ellipse.x,d.ellipse.y,d.ellipse.w,d.ellipse.h, d.ellipse.angle);
    ell.draw(colour_in,ctx);
}

/**
 * Draw the given vector v from the point p and with a length of l. This is done in the given colour.
 * @param v The polar vector.
 * @param p The point at which the vector should start.
 * @param l The length of the vector.
 * @param colour The colour of the vector.
 */
function drawPolarVector(v,p,l,colour){
    ctx.moveTo(p.x, p.y);
    ctx.strokeStyle = colour;
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

/**
 * Draw the given circle in the given colour.
 * @param c The circle.
 * @param colour The colour.
 */
function drawCircle(c, colour) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, true);
    ctx.fillStyle = colour;
    ctx.fill();
}

/**
 * Draw the given rectangle in the given colour.
 * @param r The rectangle.
 * @param colour The colour.
 */
function drawRectangle(r, colour) {
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.width, r.height);
    ctx.fillStyle = colour;
    ctx.fill();
}

/**
 * Draw the array of dots in the given colour.
 * @param all_dots The array of dots.
 * @param colour The colour.
 */
function drawDots(all_dots, colour){
    for( var i = 0 ; i < all_dots.length ; i++ ){
        var color = colour;
        if(time > TEST_TIME && all_dots[i].clicked && !confirm_clicked){
            color = 'yellow';
        }
        drawDot(all_dots[i],color);
    }
}

/**
 * Draw the dots in there final form when the user has to see which dots he clicked where right and wrong.
 * @param all_dots The array of dots.
 * @param colour The standard colour for when they are not yet clicked.
 */
function drawResultDots(all_dots, colour){
    var color = colour;
    for( var i = 0 ; i < all_dots.length ; i++ ){
        colour = color;
        if(all_dots[i].clicked){
            if(all_dots[i].important){
                colour = '#C5B358';
                drawPositiveFeeback(all_dots[i].ellipse.x,all_dots[i].ellipse.y);
            }else{
                colour = 'red';
            }
            drawDotOutline(all_dots[i],color,colour)
        }else{
            drawDot(all_dots[i],color);
        }
    }
}

function drawPositiveFeeback(x,y){
    var relative_position = (endViewTime/1000)*ctx.canvas.width*0.05;
    if(endViewTime/1000 <= 1){
        drawText("10",x,y-relative_position,'center',20,'#C5B358','black');
    }
}

/**
 * Draw the whole canvas. This function is called in a loop. This is the main function of the whole javascript file and will contain everytbing needed.
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRectangle(background.rect, background.colour);
    if(time > 3000 && time < (TEST_TIME+3000)){
        drawDots(dots,DOT_COLOR);
        doPhysics();
        storePaths();
        drawCenter();
    }else if( time < 3000){
        blinkIfNeeded();
        drawCenter();
    }else{
        if(endView){
            drawResultDots(dots,DOT_COLOR);
        }else{
            drawDots(dots,DOT_COLOR);
        }
        endOfTest();
    }
    time += draw_interval;
}

/**
 * Draw a cross in the center of the screen.
 */
function drawCenter(){
    var width = 20;
    var height = 20;
    var horizontal = new Rectangle(ctx.canvas.width/2-width/2, ctx.canvas.height/2-1,width,2);
    var vertical = new Rectangle(ctx.canvas.width/2-1, ctx.canvas.height/2 - height/2, 2, height);

    drawRectangle(horizontal,'red');
    drawRectangle(vertical,'red');
}

/**
 * Draw the needed view at the end of the test.
 */
function endOfTest(){
    $('#myCanvas').css('cursor',"auto");
    var importantDots = 0;
    var clickedDots = 0;
    if(!endView){
        importantDots = 0;
        for ( var iDot = 0 ; iDot < dots.length ; iDot++ ) {
            if(dots[iDot].important){
                importantDots++;
            }
            if(dots[iDot].clicked){
                clickedDots++;
            }
        }
        if( clickedDots >= importantDots ){
            maximumDotsSelected = true;
        }else{
            maximumDotsSelected = false;
        }
        showNClicks(clickedDots);
    }
    if(clickedDots >= importantDots && confirm_clicked){
        document.getElementById('pop_up_info').innerHTML = "";
        $("#pop_up_info").css('font-size',ctx.canvas.height * 0.025);
        endView = true;
    }else if(clickedDots < importantDots && confirm_clicked){
        document.getElementById('pop_up_info').innerHTML = "Please select "+importantDots+" dots first";
        $("#pop_up_info").css('font-size',ctx.canvas.height * 0.025);
        confirm_clicked = false;
    }
    if(endView){
        endViewTime += draw_interval;
        var wrong = 0;
        for ( var idot = 0 ; idot < dots.length ; idot++ ) {
            if(!dots[idot].important && dots[idot].clicked) wrong++;
        }
        endTest(wrong);
        showResultAtInfo();
        if(endViewTime >= DOT_VIEW_TIME){
            startNextTrial();
        }
    }
}

function showNClicks(click){

    document.getElementById('n_cl').innerHTML = "Number of clicks:";
    $("#n_cl").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_click').innerHTML = click;
    $("#n_click").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_cl_info').innerHTML = "Press 'D' to see result";
    $("#n_cl_info").css('font-size',ctx.canvas.height * 0.025);

}

function resetRightSideInfo(){

    document.getElementById('n_cl').innerHTML = "";
    $("#n_cl").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_click').innerHTML = "";
    $("#n_click").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_cl_info').innerHTML = "";
    $("#n_cl_info").css('font-size',ctx.canvas.height * 0.025);

}

function showResultAtInfo(){

    document.getElementById('n_cl').innerHTML = "Result";
    $("#n_cl").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_click').innerHTML = result;
    $("#n_click").css('font-size',ctx.canvas.height * 0.025);
    document.getElementById('n_cl_info').innerHTML = "";
    $("#n_cl_info").css('font-size',ctx.canvas.height * 0.025);

}

/**
 * Let the important dots blink in the beginning. The other ones will not.
 */
function blinkIfNeeded(){
    var colour = "#000000";
    for( var i = 0 ; i < dots.length ; i++ ){
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

/***********************
 *	INPUT FUNCTIONS
 ***********************/
/**
 * Is called when the mouse was pressed down.
 * @param e The mouse event.
 */
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
        var nearestDot;
        var smallesDist = ctx.canvas.width*2;
        var mouseP = new Point(mouseX,mouseY);
        for ( var iDot = 0 ; iDot < dots.length ; iDot++ ){
            var p = new Point(dots[iDot].ellipse.x,dots[iDot].ellipse.y);
            if(distanceBetweenPoints(p,mouseP) < smallesDist){
                smallesDist = distanceBetweenPoints(p,mouseP);
                nearestDot = dots[iDot];
            }
        }
        if( nearestDot.clicked ){
            nearestDot.clicked = !nearestDot.clicked;
        }else if( !nearestDot.clicked && !maximumDotsSelected){
            nearestDot.clicked = !nearestDot.clicked;
        }
    }
}

/**
 * Is called when a key is pressed down.
 * @param e The key event.
 */
function doKeyDown(e){
    if(!done){
        confirm_clicked = true;
    }
    if(done){
        go_to_next_trial = true;
    }
}

/***********************
 *  PHYSICS FUNCTIONS
 **********************/
/**
 * Detects if there is collision between the two given ellipses. If so it returns where ellipse 2 has hit ellipse 1 in string "up","left","down","right". If there was no collision "none" will be returned.
 * @param ellipse1 The 'not moving' ellipse.
 * @param ellipse2 The 'moved' ellipse.
 * @returns {string} "up","left","down","right" or "none".
 */
function detectCollision(ellipse1, ellipse2){
    if(ellipse1 === null || ellipse2 === null) return;
    var distance = distanceBetweenPoints(new Point(ellipse1.x,ellipse1.y),new Point(ellipse2.x,ellipse2.y));
    var minimum_distance = getMinDistTwoEll(ellipse1,ellipse2);
    if(distance < (minimum_distance*4)){
        var angle = Math.atan(Math.abs(ellipse2.y - ellipse1.y)/Math.abs(ellipse1.x - ellipse2.x));
        if(ellipse1.x - ellipse2.x < 0) angle *= -1;
        angle = radianToDegrees(angle);
        if(angle >= 45 && angle <= 135) return "up";
        if(angle >= 135 && angle <= 225) return "left";
        if(angle >= 225 && angle <= 315) return "down";
        if((angle >= 315 && angle <= 360) || (angle >= 0 && angle <= 45)) return "right";
    }
    else return "none";
}

/**
 * Do all physics related stuff that is needed.
 */
function doPhysics(){
    for( var ii = 0 ; ii < dots.length ; ii++ ){
        dots[ii] = moveDot(dots[ii]);

        //Change the angle to make the path of the dot random
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

        //Change the deviation of the dot.
        if((Math.round(time)%1000 < 10 || Math.round(time)%1000 > 990) && Math.random() < 0.3){
            dots[ii].deviation = (Math.random()/2)+0.25;
        }

    }
}

/**
 * Checks if the given ellipse is within the bounds of the canvas.
 * @param ellipse The ellipse.
 * @returns {string} "none" if withing "up","down","left","right" for where it collided.
 */
function inbounds(ellipse){
    var angle = (ellipse.angle + 90)%360;
    var xModifier = getEllipseRadiusByAngle(angle,ellipse);
    var yModifier = getEllipseRadiusByAngle(angle,ellipse);
    if(ellipse.x + (xModifier) > ctx.canvas.width) return "right";
    if(ellipse.x - (xModifier) < 0) return "left";
    if(ellipse.y - (yModifier) < 0) return "up";
    if(ellipse.y + (yModifier) > ctx.canvas.height) return "down";
    return "none";
}

/**
 * Get the radius of the given ellipse at the given internal angle.
 * @param angle_degrees The internal angle of the ellipse.
 * @param ellipse The ellipse.
 * @returns {number} radius in pixels.
 */
function getEllipseRadiusByAngle(angle_degrees,ellipse){
    var angle = angle_degrees * Math.PI * 2 / 360;
    var a = ellipse.w/2;
    var b = ellipse.h/2;
    var numerator = a*b;
    var denominator = Math.sqrt( Math.pow( b*Math.cos(angle) , 2 ) + Math.pow( a*Math.sin(angle), 2 ) );
    return numerator/denominator;
}

/**
 * Gives the distance between point p and q.
 * @param p
 * @param q
 * @returns {number} the distance in pixels.
 */
function distanceBetweenPoints(p,q){
    return Math.sqrt(Math.pow(p.x- q.x,2)+Math.pow(p.y- q.y,2));
}

/**
 * Move the given dot. All possible collision and move requirements will be checked here.
 * @param dot The dot to move.
 * @returns The moved dot.
 */
function moveDot(dot){
    var movedDot = new Dot( new Ellipse(
        dot.ellipse.x + dot.vector.r * Math.cos((dot.vector.O/360)*Math.PI*2),
        dot.ellipse.y + dot.vector.r * Math.sin((dot.vector.O/360)*Math.PI*2),
        dot.ellipse.w,
        dot.ellipse.h,
        dot.ellipse.angle
    ),
        dot.vector,
        dot.deviation,
        dot.important);
    var canMove = true;
    var direction;

    //DETECT IF INBOUNDS THIS HAS PRIORITY N°1!                                                                                                                                                  closest
    if((direction = inbounds(movedDot.ellipse)) != "none"){
        canMove = false;
        dot.vector.O = getBounceAngle(dot.vector.O,direction);
    } else
    //DETECT IF NOT IN THE MIDDLE CIRCLE. THIS HAS PRIORITY N°2!
    if(inMiddle(movedDot.ellipse)) {
        canMove = false;
        dot.vector.O += 180;
    }
    //DETECT COLLISION WITH NEAREST DOT. ONLY THE NEAREST TO KEEP THE DOT FROM FREAKING OUT. THIS HAS PRIORITY N°3!
    else {
        //First we need to find the nearest dot.
        var nearestDistance = 2*dot.ellipse.w * ctx.canvas.width*2; //We start with a number to make sure it has a value. This number because it is more than the maximum distance an other dot can ever be.
        var nearestDot = null;
        for( var iDot = 0 ; iDot < NUMBER_OF_DOTS ; iDot++ ) {
            //First we need to be sure that iDot is not the dot that we are determining the collision for.
            if( !checkEqualityDots(dots[iDot],dot) ){
                var relative_distance = getRelativeDistanceBetweenPoints(dots[iDot].ellipse,dot.ellipse);
                if(relative_distance < nearestDistance){
                    nearestDistance = relative_distance;
                    nearestDot = dots[iDot];
                }
            }
        }
        if(nearestDot == null && NUMBER_OF_DOTS > 1) {
            console.log("ERROR! There is an error in the code. The nearestDot variable should be defined, but is not");
        }else{
            //If the angle between the dots is more than 90° than they can never collide and we prevent the system for doing unneeded calculations.
            if(Math.abs(nearestDot.ellipse.angle - dot.ellipse.angle) < 90 || Math.abs(nearestDot.ellipse.angle - dot.ellipse.angle)>270){
                var angle;
                //Check for collision between the dot and the nearestDot.
                if( detectCollision( nearestDot.ellipse, movedDot.ellipse ) != "none" ) {
                    canMove = false;
                    dot.vector.O = ( dot.vector.O + 180 ) % 360;
                }
            }
        }
    }
    if(canMove){
        return movedDot;
    }
    dot.collided = true;
    return dot;
}

/**
 * Get the relative distance between the given ellipses. This is because an ellipse has an unequality between radiuses at different internal angles. So to compare
 * distances between different ellipses a relative distance is used which gives a more accurate representation of the distance. The returned distance has no
 * real value. The number is only usefull in comparing relative distances.
 * @param ell1 ellispe 1.
 * @param ell2 ellipse 2.
 * @returns {number} The relative distance.
 */
function getRelativeDistanceBetweenPoints(ell1,ell2){
    var dist_modifier = getMinDistTwoEll(ell1,ell2);
    var distance = distanceBetweenPoints(new Point(ell1.x,ell1.y),new Point(ell2.x,ell2.y));
    return distance*2/dist_modifier;
}

/**
 * Check if the two given dots are equal to eachother. This only checks if the coordinates are the same internaly.
 * @param dot1
 * @param dot2
 * @returns {boolean}
 */
function checkEqualityDots(dot1,dot2){
    if( dot1.ellipse.x != dot2.ellipse.x ) return false;
    if( dot1.ellipse.y != dot2.ellipse.y ) return false;
    return true;
}

/**
 * Checks to see if the ellipse is in the middle area of the canvas. This area is restricted due to technical difficulties for checking collision because of the turning
 * of the ellipses by there position on the screen. It was also restricted because the nature of the test did not allow dots to move through the visual fixation point.
 * @param ellipse
 * @returns {boolean}
 */
function inMiddle(ellipse){
    var delta_x = Math.abs( ctx.canvas.width /2 - ellipse.x );
    var delta_y = Math.abs( ctx.canvas.height/2 - ellipse.y );
    var distance_sq = delta_x*delta_x + delta_y*delta_y;
    return MIN_DIST_CENTER*MIN_DIST_CENTER >= distance_sq;
}

/**
 * Get side c of the triangle ABC with sides abc and angle gamma opposite of side c.
 * @param a side a of the triangle.
 * @param b side b of the triangle.
 * @param gamma the angle gamma which is opposite of the side c (DEGREES).
 * @returns (Number) side c.
 */
function LawOfCosines_getside(a,b,gamma){
    return Math.sqrt(LawOfCosines_getside_sq(a,b,gamma));
}

/**
 * Get side c squared of the triangle ABC with sides abc and angle gamma opposite of side c.
 * @param a side a of the triangle.
 * @param b side b of the triangle.
 * @param gamma the angle gamma which is opposite of the side c (DEGREES).
 * @returns (Number) square of side c.
 */
function LawOfCosines_getside_sq(a,b,gamma){
    return Math.pow( a ,2) + Math.pow( b ,2) - 2*a*b*Math.cos(gamme*Math.PI*2/360);
}

function LawOfCosines_getalpha(a,b,c){
    return LawOfCosines_getangle(b,c,a);
}

function LawOfCosines_getbeta(a,b,c){
    return LawOfCosines_getangle(c,a,b);
}

function LawOfCosines_getgamma(a,b,c){
    return LawOfCosines_getangle(a,b,c);
}

/**
 * Get angle gamma of the trangle ABC with sides abc. Gamma is the angle opposite of the side c.
 * @param a side a of the triangle.
 * @param b side b of the triangle.
 * @param c side c of the triangle.
 * @returns {number} angle gamma in DEGREES.
 */
function LawOfCosines_getangle(a,b,c){
    var ang_radian = Math.acos(    (  Math.pow(a,2)  +  Math.pow(b,2)  -  Math.pow(c,2)  )   /   (2*a*b)     ); //      acos( (a²+b²-c²)/(2ab) ) = gamma
    return ang_radian * 360 / ( 2 * Math.PI );    //From radians to degrees.
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

function getMinDistTwoEll(ell1,ell2){
    var angles = getTwoAngles(ell1,ell2);
    vectors = [];
    vectors.push({vec: new Vector_Polar(1,(angles.O1+ell1.angle+180)%360), pnt: new Point(ell1.x,ell1.y), col: 'orange'});
    vectors.push({vec: new Vector_Polar(1,(angles.O2+ell1.angle+180)%360), pnt: new Point(ell2.x,ell2.y), col: 'grey'  });
    var min_dist_ell_1 = getEllipseRadiusByAngle(angles.O1,ell1);
    var min_dist_ell_2 = getEllipseRadiusByAngle(angles.O2,ell2);
    circles = [];
    circles.push(new Circle(ell1.x,ell1.y,min_dist_ell_1*4));
    circles.push(new Circle(ell2.x,ell2.y,min_dist_ell_2*4));
    return min_dist_ell_1+min_dist_ell_2;
}

function getTwoAngles(ellipse1, ellipse2){

    var switched = false;
    var angle1 = ellipse1.angle;//
    var angle2 = ellipse2.angle;//                                                                                    |
    //console.log("before"+angle1+","+angle2);//                                                                III   |   IV
    // We do this for when one of the ellipses is in quadrant I and the other one in Quadrant IV.            _________|_________
    // We then need to be sure that the ellipse in Quadrant I becomes ellipse 2.                                      |
    // The rest of the calculation rest upon this assumption!                                                   II    |   I
    //if(angle1 < 90) angle1 += 360;//                                                                                  |
    //if(angle2 < 90) angle2 += 360;
    //console.log("after "+angle1+","+angle2);
    //We make sure that ellipse 2 has a greater angle than ellipse 1.                                       //      ellipse2 -> angle beta
    if(angle2 < angle1){                                                                                    //         |\
        var ell = ellipse1;                                                                                 //         |  \
        ellipse1 = ellipse2;                                                                                //         |    \ a
        ellipse2 = ell;                                                                                     //         |      \
        switched = true;                                                                                    //       c |        \
    }                                                                                                       //         |        / center_screen -> angle gamma
    //         |      /
    var a = distanceBetweenPoints(new Point(ellipse2.x,ellipse2.y),middleP);                                //         |    / b
    var b = distanceBetweenPoints(new Point(ellipse1.x,ellipse1.y),middleP);                                //         |  /
    var c = distanceBetweenPoints(new Point(ellipse1.x,ellipse1.y),new Point(ellipse2.x,ellipse2.y));       //         |/
    //      ellipse1 -> angle alpha
    var alpha = LawOfCosines_getalpha(a,b,c);
    var beta  = LawOfCosines_getbeta(a,b,c);
    var gamma = LawOfCosines_getgamma(a,b,c); //  Not needed

    var angle_ellipse1;
    var angle_ellipse2;
    if(switched){
        angle_ellipse2 = 360 - alpha;
        angle_ellipse1 = 360 - beta;
    }else{
        angle_ellipse1 = 360 - alpha;
        angle_ellipse2 = 360 - beta;
    }
    return {O1: angle_ellipse1, O2: angle_ellipse2};
}

/***********************
 *	OTHER FUNCTIONS
 ***********************/
function setCanvasAndContext() {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    ctx.canvas.height = window.innerHeight * 0.95;
    ctx.canvas.width = window.innerHeight * 0.95;

    var menu_dv = document.getElementById("menu_div");
    var menW = menu_dv.style.width;
    var mnW = menW.substring(0,3);
    var offs = -1*(window.innerWidth - mnW - ctx.canvas.width)/2+12.13;

    var slider = $('#slider');
    slider.css('width', ctx.canvas.width);
    slider.css('left', "35px");

    var canvas_dv = $("#canvas_div");
    canvas_dv.css('left',offs);

    var n_click_div = $('#num_clicks');
    var w = window.innerWidth - ctx.canvas.width - mnW - 40;
    n_click_div.css('width',w);
    n_click_div.css('height',ctx.canvas.height/2);
}

function createTrials(){
    var verticalTrialsLeft = (NUMBER_OF_TRIALS_VERTICAL*NUMBER_OF_TRIALS);
    var horizontalTrialsLeft = NUMBER_OF_TRIALS - verticalTrialsLeft;
    if(horizontalTrialsLeft < 0) horizontalTrialsLeft = 0;
    for ( var iTrial = 0 ; iTrial < NUMBER_OF_TRIALS ; iTrial++ ){
        var horiz_total_ratio = horizontalTrialsLeft/(horizontalTrialsLeft+verticalTrialsLeft);
        var ori;
        if(Math.random() < horiz_total_ratio){
            ori = true;
            horizontalTrialsLeft--;
        }else{
            ori = false;
            verticalTrialsLeft--;
        }
        var trial = new Trial(NUMBER_OF_DOTS,Math.floor(IMPORTANT_FACTOR*NUMBER_OF_DOTS),ori,TEST_TIME);
        trials.push(trial);
    }
}

function setupTrial(){
    determineRelatives(trials[trialNumber].orient);
    createDots(trials[trialNumber].numDots,trials[trialNumber].correctDots);
    trialNumber++;
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
    setInterval(draw, draw_interval);
    $('#myCanvas').css('cursor',"none");
}

function determineSpeed(interval){
    var travel_distance = ctx.canvas.width;
    var hz = (1/interval)*1000;
    speed = travel_distance/(TRAVEL_TIME*hz);
}

function determineRelatives(orient){
    circle_radius = ctx.canvas.width * DOT_SIZE;
    max_radius = Math.sqrt(Math.pow(ctx.canvas.width/2,2)+Math.pow(ctx.canvas.height/2,2));
    MIN_DIST_CENTER = 10;// MIN_DIST_CENTER_PERC * ctx.canvas.width/2;
    if(orient){
        ellipse_width = /*(ctx.canvas.height*0.05)*/max_radius * ELLIPSE_HEIGHT/4 * 0.8;
        ellipse_height = /*(ctx.canvas.height*0.05)*/max_radius * ELLIPSE_WIDTH/4 * 0.8;
    } else {
        ellipse_width = /*(ctx.canvas.height*0.05)*/max_radius * ELLIPSE_WIDTH/4 * 0.8;
        ellipse_height = /*(ctx.canvas.height*0.05)*/max_radius * ELLIPSE_HEIGHT/4 * 0.8;
    }
    TARGET_RADIUS = Math.min(ellipse_height,ellipse_width)*MIN_DIST_CENTER_PERC*2;/*Math.max((ctx.canvas.height*0.05)*ELLIPSE_WIDTH,(ctx.canvas.height*0.05)*ELLIPSE_HEIGHT);*/
    middleP = new Point(ctx.canvas.width/2,ctx.canvas.height/2);
}

function createDots(numD,impD){
    for (var i = 0 ; i < numD ; i++ ) {
        var location;
        var goodLocation = false;
        while(!goodLocation){
            location = getRandomLocation();
            if(i < numD*SPAWN_IN_CENTER){
                if(distanceBetweenPoints(middleP,location) < ctx.canvas.height/4){
                    goodLocation = true;
                }else{
                    goodLocation = false;
                }
            }else{
                if(distanceBetweenPoints(middleP,location) < ctx.canvas.height/4){
                    goodLocation = false;
                }else{
                    goodLocation = true;
                }
            }
        }
        var angle = Math.random()*360;
        var imp = false;
        if( Math.random() < (impD-numImpDots)/(numD-dots.length) || (impD-numImpDots)/(numD-dots.length) >= 1){
            numImpDots++;
            imp = true;
        }
        var distanceToCenter = distanceBetweenPoints(location,middleP);
        var relativeDistance = distanceToCenter/max_radius;
        var size_modifier = (MAX_SIZE - MIN_SIZE) * relativeDistance + MIN_SIZE;
        dots.push(new Dot(new Ellipse(location.x, location.y,ellipse_width*size_modifier,ellipse_height*size_modifier,0),new Vector_Polar(1,angle),(Math.random()/2)+0.25,imp));
    }
}

function getRandomLocation(){
    var gotLocation = false;
    var location;
    var whiles = 0;
    while (!gotLocation && whiles++ < 400){
        location = new Point(Math.random()*ctx.canvas.width,Math.random()*ctx.canvas.height);
        gotLocation = true;
        if( distanceBetweenPoints(location,middleP) > MIN_DIST_CENTER+ellipse_width+2){
            var distanceToCenter = distanceBetweenPoints(location,middleP);
            var relativeDistance = distanceToCenter/max_radius;
            var size_modifier = (MAX_SIZE - MIN_SIZE) * relativeDistance + MIN_SIZE;

            for( var i = 0 ; i < dots.length ; i++ ) {
                if((detectCollision(dots[i].ellipse, new Ellipse(location.x,location.y,ellipse_width*size_modifier,ellipse_height*size_modifier,0))) != "none"){
                    gotLocation = false;
                    break;
                }
            }

            var ell =  new Ellipse(location.x,location.y,ellipse_width*size_modifier,ellipse_height*size_modifier,0);

            if(!circleInBounds(new Circle(location.x,location.y,Math.max(ell.h,ell.w)+5))){
                gotLocation = false;
            }
            /*if((inbounds(new Ellipse(location.x,location.y,ellipse_width*size_modifier+10,ellipse_height*size_modifier+10,0)))!="none"){ //The 10 extra for the radius is as a buffer
             gotLocation = false;
             }   */
        }else{
            gotLocation = false;
        }
    }
    return location;
}

function circleInBounds(circle){
    if(circle.x - circle.r <= 0) return false;
    if(circle.x + circle.r >= ctx.canvas.width) return false;
    if(circle.y - circle.r <= 0) return false;
    return circle.y + circle.r < ctx.canvas.height;
}

function radianToDegrees(ang){
    if(ang < 0) ang += (Math.PI * 2);
    return (ang * 360) / (Math.PI * 2);
}

function endTest(result){
    this.result = result;
}

function startNextTrial(){
    test_paths.push(trial_paths);
    sendTrialPathToServer(trial_paths);
    if(trialNumber > NUMBER_OF_TRIALS){
        //END FULL TEST!!     //TODO
    }else{
        confirm_clicked = false;
        endViewTime = 0;
        endView = false;
        dots = [];
        result = 0;
        done = false;
        time = 0;
        numImpDots = 0;
        go_to_next_trial = false;

        setupTrial();
        resetRightSideInfo();
        $('#myCanvas').css('cursor',"none");
        trial_paths = [];
    }
}

function storePaths(){
    var currentSpots = [];
    for( var iDot = 0 ; iDot < trials[trialNumber].numDots ; iDot++ ) {
        var pnt = new Point( Math.round(dots[iDot].ellipse.x) , Math.round(dots[iDot].ellipse.y) );
        currentSpots.push(pnt);
    }
    trial_paths.push(currentSpots);
}

function sendTrialPathToServer(trial_p) {

    var id = user[0];
    var trialnr = trialNumber - 1;
    var ndots = trials[trialnr].numDots;
    for( var iTrial = 0 ; iTrial < trial_p.length ; iTrial++ ) {
        var data = "";
        var moment = trial_p[iTrial];
        for( var iMoment = 0 ; iMoment < moment.length ; iMoment++ ) {
            var str1 = moment[iMoment].x;
            var str2 = moment[iMoment].y;
            data = data.concat(str1,",",str2,",");
        }
        sendTrialRaw(id,"mote001",trialnr,ndots,"MOT_E",data);
    }

    //sendData(user,DATA,"MOT_E")//TODO
}

function sendTrialRaw(userid,testid,trialnr,numdots,test,data){
    $.ajax({
        type: "GET",
        //url:  "https://perswww.kuleuven.be/~u0064325/GestaltDemos/Workspace/php/sendPath.php?userId="+userid+"&testId="+testid+"&trial="+trialnr+"&numDots="+numdots+"&test="+test+"&data="+data,
        //url: "http://127.0.0.1:8080/GestaltDemos/Workspace/php/sendPath.php?userId="+userid+"&testId="+testid+"&trial="+trialnr+"&numDots="+numdots+"&test="+test+"&data="+data,
        url: "http://127.0.0.1:8080/LEP/php/sendPath.php?userId="+userid+"&testId="+testid+"&trial="+trialnr+"&numDots="+numdots+"&test="+test+"&data="+data,
        dataType: "json",
        statusCode: {
            200: function(result){
                // console.log(result.value);
            }
        }
    });
}