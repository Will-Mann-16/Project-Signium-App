// Initialize app

var socket;

var isAndroid = Framework7.prototype.device.android === true;
var isIos = Framework7.prototype.device.ios === true;


Template7.global = {
    android: isAndroid,
    ios: isIos
};

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

if (isAndroid) {
    // Change class
    $$('.view.navbar-through').removeClass('navbar-through').addClass('navbar-fixed');
    // And move Navbar into Page
    $$('.view .navbar').prependTo('.view-main .page');
}

var myApp = new Framework7({
    // Enable Material theme for Android device only
    material: isAndroid ? true : false,
    // Enable Template7 pages
    template7Pages: true
});

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we want to use dynamic navbar, we need to enable it for this view:
    dynamicNavbar: true,
    main: true
});

$$(".select-locations").click(function() {
    myApp.openPanel("right");
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    socket = io.connect("http://10.11.0.23:8081");
    if (window.localStorage.getItem("student_logged_in") === "loggedin") {
        runInitial();
        cordova.plugins.backgroundMode.enable();
    } else {
        myApp.loginScreen();
        $$('.login-submit').on('click', function() {
            var formData = myApp.formToJSON('#login-form');
            var username = formData.username;
            var password = formData.password;
            socket.emit("socket_service_login", JSON.stringify({
                username: username.toLowerCase()
            }));
            socket.on("service_socket_verification", function(data) {
                data = JSON.parse(data);
                if (data.id == -1) {
                    $$('.incorrect-password').css("display", "block");
                } else {
                    var result = TwinBcrypt.compareSync(password, data.password);
                    if (result == true) {
                        window.localStorage.setItem("student_house", data.house);
                        window.localStorage.setItem("student_id", data.id);
                        window.localStorage.setItem("student_logged_in", "loggedin");
                        myApp.closeModal();
                        runInitial();
                    } else {
                        $$('.incorrect-password').css("display", "block");
                    }
                }
            });
        });
    }
});

function runInitial() {
    var student_id = window.localStorage.getItem("student_id");
    var student_house = window.localStorage.getItem("student_house");
    loadLocations(student_id, student_house);
    loadStudentData(student_id, student_house);
}

var locationArray;

function loadLocations(mainID, house) {
    socket.emit("socket_service_request_locations", house);
    socket.on("service_socket_request_locations", function(packet) {
        var json = JSON.parse(packet);
        locationArray = Array();
        var noGroupList = Array();
        var inCollegeList = Array();
        var outOfCollegeList = Array();
        for (var i = 0; i < json.length; i++) {
            var object = json[i];
            var name = object.Location;
            var colour = object.Colour;
            var heading = object.Heading;
            var id = object.ID;
            locationArray.push({
                id: id,
                name: name,
                colour: colour
            });
            switch (heading) {
                case "No Group":
                    noGroupList.push({
                        id: id,
                        name: name,
                        colour: colour
                    });
                    break;
                case "In College":
                    inCollegeList.push({
                        id: id,
                        name: name,
                        colour: colour
                    });
                    break;
                case "Out of College":
                    outOfCollegeList.push({
                        id: id,
                        name: name,
                        colour: colour
                    });
                    break;
            }
        }
        var html = '<ul>';
        noGroupList.forEach(function(location) {
            html += '<li class="item-content"><div id="location' + location.id + '" class="item-inner location-button" style="background-color: ' + location.colour + ';"><a id="location' + location.id + '" style="color: #FFFFFF;" class="item-title">' + location.name + '</a></div></li>';
        });
        html += '</ul><p class="content-block-title">In College</p><ul>';
        inCollegeList.forEach(function(location) {
            html += '<li class="item-content"><div id="location' + location.id + '" class="item-inner location-button" style="background-color: ' + location.colour + ';"><a id="location' + location.id + '" style="color: #FFFFFF;" class="item-title">' + location.name + '</a></div></li>';
        });
        html += '</ul><p class="content-block-title">Out of College</p><ul>';
        outOfCollegeList.forEach(function(location) {
            html += '<li class="item-content"><div id="location' + location.id + '" class="item-inner location-button" style="background-color: ' + location.colour + ';"><a style="color: #FFFFFF;" class="item-title">' + location.name + '</a></div></li>';
        });
        html += '</ul>';
        $$("#location-space").html(html);
        $$.each(json, function(key, val) {
            $$("#location" + val.ID).click(function() {
                updateLocation(val.Location, mainID, house);
            });
        });
    });
}

function loadStudentData(mainID, house) {
    var json_1 = JSON.stringify({
        id: mainID,
        house: house
    });
    socket.emit("socket_service_request_student_info", json_1);
    socket.on("service_socket_student_info", function(data) {
        data = JSON.parse(data);
        var name = data.Firstname + " " + data.Surname;
        var nickname = data.Nickname;
        var yeargroup = data.Yeargroup;
        switch (yeargroup) {
            case "3rd":
                yeargroup = "Third Form";
                break;
            case "4th":
                yeargroup = "Fourth Form";
                break;
            case "5th":
                yeargroup = "Fifth Form";
                break;
            case "LVIth":
                yeargroup = "Lower Sixth";
                break;
            case "UVIth":
                yeargroup = "Upper Sixth";
                break;
        }
        var location = data.Location;
        var time = data.Time;
        var date = data.Date;
        var showHouse = house.toLowerCase().replace(/\b[a-z]/g, function(letter) {
            return letter.toUpperCase();
        });
        $$(".name").text(name);
        $$(".nickname").text(nickname);
        $$(".yeargroup").text(yeargroup);
        $$(".location").text(location);
        $$(".date").text(date);
        $$(".time").text(time);
        $$(".house").text(showHouse);
        var index;
        locationArray.forEach(function(flocation) {
            if (flocation.name == location) {
                index = flocation;
            }
        });
        $$(".student-card").css("border-color", index.colour)
    });
    socket.on("update_student_location", function(packet) {
        packet = JSON.parse(packet);
        if (packet.house == house) {
            if (packet.id == mainID) {
                $$(".location").text(packet.location);
                $$(".date").text(packet.date);
                $$(".time").text(packet.time);
                $$(".student-card").css("border-color", packet.colour);
            }
        }
    });
}

function showNotification(id, house) {
    socket.on("service_socket_send_notification", function(json) {
        json = JSON.parse(json);
    })
}

function updateLocation(location, id, house) {
    var json = JSON.stringify({
        location: location,
        id: id,
        house: house
    });
    socket.emit("update_student_location_server", json);
    myApp.closePanel();
}

function logout() {
    myApp.closePanel();
    window.localStorage.setItem("student_logged_in", "false");
    window.localStorage.setItem("student_house", "");
    window.localStorage.setItem("student_id", "");
    myApp.loginScreen();
}
