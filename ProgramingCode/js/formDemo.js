/********************************************************************
 *
 *	Project Name: Form
 *	Version: 1.0 (31-July-2013)
 *	Author: Thomas Hendrickx
 *
 *	Contains the necessary functions for filling in the form.
 *
 ********************************************************************/

// The data from the user will be stored in this variable.
var user;

/**
 * Initialise the form so that the user can fill in his/her data.
 */
function initialise_form(){
    $(function() {
        $( "#slider" ).slider({
            value: 0
        });
    });

    formatForm();
}

/**
 * Give the needed format adjustments to the form.
 */
function formatForm(){
    var height = window.innerHeight * 0.88;
    var width = window.innerHeight * 0.88;

    var slider = $('#slider_wrapper');
    slider.css('width',width);
    slider.css('display',"none");

    var form_div = $('#form_div');
    form_div.css('width',width);
    form_div.css('height',width);
    form_div.css('vertical-align', "middle");

    var nav_width = (window.innerWidth-width)/2 - 12;

    var menu = $('#menu_div');
    menu.css('width',nav_width);
    menu.css('height',25);

    var nav = $('#main_nav');
    nav.css('width',nav_width);
    nav.css('height',height*0.95);

    var form = $('#form');
    form.css('width',width *.5);
    form.css('display',"block");

    var canvas = $('#canvas_div');
    canvas.css('display',"none");

    var numItems = $("#menu_div").children('ul').length;
    var width = menu.width() /numItems;
    $("menu_list").width = width;

    var txt_id = $("#f_id");
    var txt_age = $("#f_age");
    var btn_submit = $("submit");

    txt_id.keyup(function(event){
        if(event.keyCode == 13){
            submit_function();
        }
    });
    txt_age.keyup(function(event){
        if(event.keyCode == 13){
            submit_function();
        }
    });
}

/**
 * Bypassing the form and going straight to the test. This will ser the user as "demo" which will later
 * be interpreted by the software as non viable data. This data will then not be send.
 */
function bypassform(){
    formatForm();
    user = ["demo"];
    setNewContent();
}

/**
 * When the data for the user is filled in the submit function will be called that will get all the data and move
 * on from there.
 * @returns {boolean}
 */
function submit_function(){
    var id = document.getElementById("f_id").value;
    var age = document.getElementById("f_age").value;
    var gender = document.getElementById("f_gender").value;
    var gen;
    if(gender === "Male") gen = "m";
    if(gender === "Female") gen = "f";
    if(validate_data(id,age)){
        var tosend = [id,age,gen];
        user = tosend;
        setNewContent();
        return false;
    }else{
        return false;
    }
}

/**
 * Check to see if the data gotten from the user is correct data. An age should be a number between 0 and 150. And
 * the id will be checked to see if it is a viable one.
 * @param id
 * @param age
 * @returns {boolean}
 */
function validate_data(id,age){
    if(!isValidID(id)){
        document.getElementById("f_id").value = "invalid";
        return false;
    }
    if(age > 0 && age < 150){
        return true;
    }
    document.getElementById("f_age").value = "invalid";
    return false;
}

/**
 * Check if the given id is a viable id. The implementation is completely depended on how the person doing the experiment
 * gives IDs to it's participants. For ease of testing this is set to be always true.
 * @param id The id of the user.
 * @returns {boolean}
 */
function isValidID(id){
    //TODO needs to be implemented!!!
    return true;
}

/**
 * Send the received data of the test to the server.
 * @param data The data of the test.
 * @param test The name of the test (needed to orden it in folders).
 */
function sendData(data,test){
    if(user[0] == "demo") return;
    $.ajax({
        type: "GET",
        url:  "https://perswww.kuleuven.be/~u0064325/GestaltDemos/Workspace/php/sendData.php?id="+user[0]+"&age="+user[1]+"&gender="+user[2]+"&data="+data+"&test="+test,
        //url: "http://127.0.0.1:8080/GestaltDemos/Workspace/php/sendData.php?id="+user[0]+"&age="+user[1]+"&gender="+user[2]+"&data="+data+"&test="+test,
        //url: "http://127.0.0.1:8080/LEP/php/sendData.php?id="+user[0]+"&age="+user[1]+"&gender="+user[2]+"&data="+data+"&test="+test,
        dataType: "json",
        statusCode: {
            200: function(result){
            }
        }
    });
}

/**
 * When the form is filled in the css of the document needs to undergo some changes to make space for the canvas
 * that will be used to do the test.
 */
function setNewContent(){
    var form_div = $('#form_div');
    form_div.css('height',"0px");
    form_div.css('border',"1px solid #FFFFFF");

    var canvas = $('#canvas_div');
    canvas.css('display',"inline");

    var slider = $('#slider_wrapper');
    slider.css('display',"inline");

    init();
}

/**
 * A more broad function to use a php file on the server. The parameter dat contains both the php file as the needed
 * formatting to pass on the data.
 * @param dat The path on the server to the php file plus the data to pass on.
 */
function sendToPHPFile(dat){
    if(user[0] == "demo") return;
    $.ajax({
        type: "GET",
        url:  "https://perswww.kuleuven.be/~u0064325/GestaltDemos/Workspace/php/"+dat,
        //url: "http://127.0.0.1:8080/GestaltDemos/Workspace/php/"+dat,
        //url: "http://127.0.0.1:8080/LEP/php/"+dat,
        dataType: "json",
        statusCode: {
            200: function(mot_ellipse_result){
                // console.log(mot_ellipse_result.value);
            }
        }
    });
}