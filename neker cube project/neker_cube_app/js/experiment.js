var phase = 0;            // phase 0

var edge_time = 600;      // milliseconds per line when drawing the cube  // 600

var A = [1,2,3,4,5,6,7,8,9,10,11,12];  // the set of lines where "view from above" face is drawn first
var B = [5,6,7,8,1,2,3,4,9,12,11,10];  // the set of lines where "view from below" face is drawn first
var order;                // A or B will be randomly assigned to it
var condition;            // "A" or "B"

var images = [];          // put R1 etc images here
var image_index;          // shuffles the image display order 0=R1, 1=R2, 2=R3, 3=R4
var x = [];               // coordinate system for drawing the neker cube
var y = [];
var choice1_x, choice_y, choice_w, choice_w, col1_x, col2_x, row1_y, row2_y;
var ratio;                // aspect ratio of the user's screen
var font_height;          // height of header at top fo screen containing text
var nextTime = 0;         // for metronome timing of line presentation
var currentEdge = -1;      // this value gets incremented by one in drawIncrementally()
var edge1, edge2, edge3, edge4, edge5, edge6, edge7, edge8, edge9, edge10, edge11, edge12;
var field_width, field_height, field_x, field_y;
var resize_events = 0;    // total number of window resize events during the course of the experiment
// the cube does not change size when the orientation is flipped, only when the screen proportions are resized
var next, yes, no;
var Q1;                   // answer to the 3D question, "yes" or "no"
var Q2 = "NA";            // answer to which cube did it look like: 1,2,3 or 4.
var Q2ab = "NA";          // R1 & R3 = "A", R2 & R4 = "B", or "NA" if people answer Q1 = "No"
var choice_display;       // "grid" or "row"

function preload() { // this function is called once
	images[0] = loadImage("assets/R1.png");
	images[1] = loadImage("assets/R2.png");
	images[2] = loadImage("assets/R3.png");
	images[3] = loadImage("assets/R4.png");
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setup() {  // this function is called exactly once
	createCanvas(windowWidth,windowHeight);
	textFont("Helvetica"); noStroke(); fill(0); textAlign(CENTER);  // default text specs
	imageMode(CENTER,CENTER);

	// randomize where images are displayed on the screen
	image_index = shuffle([0,1,2,3]) // 0,1,2,3 = R1, R2, R3, R4

	// randomly choose an order
	rand = floor(random(1,3))  // randomly choose 1 or 2
	if ( rand === 1 ) { order = A; condition = "A" }
	if ( rand === 2 ) { order = B; condition = "B" }

	// counterbalance which button is on top, yes or no - do that later for the real app

	// this is the div where the cube will be drawn
  	div = createDiv('');
	div.style('background-color', 'grey');
	div.center();
	div.hide();
  
	next = createButton("I'm ready to watch!");
	next.style('font-size: 30px');
	next.mousePressed(navigate);
	next.hide();

	yes = createButton("yes");
	yes.position(width/2,height*.9);
	yes.center("horizontal");
	yes.style('font-size: 30px');
	yes.mousePressed(yes_pressed);
	yes.hide();

	no = createButton("no");
	no.position(width/2,height*.8);
	no.center("horizontal");
	no.style('font-size: 30px');
	no.mousePressed(no_pressed);
	no.hide();

	yn_width = yes.width;  // use the dimensions of the larger button
	yn_height = yes.height;

	onWindowResized();

	device = navigator.userAgent  // get all the specs of the user's device

	timestamp = millis();  // for development only - so you can start at any phase
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function draw() {
	background(255);

	if ( phase === 0 ) {
		next.center();
		next.show();
		text("We are going to draw an image one line at a time.  Please watch!",width*.1,height*.2,width*.8)
		timestamp = millis();
	}

	if ( phase === 1 ) {
		next.hide();

		drawIncrementally(order,interval=edge_time,currentEdge) // order[0] is the first edge drawn
		drawEdges("black",5) // draws whatever edges are set to true
		
		if (millis() > edge_time*13 + timestamp) {
			phase = "3DQ"
			cursor();

			// make the yes and no button have the same size
			yes.size(yn_width*2,yn_height*2);
			no.size(yn_width*2,yn_height*2);
			yes.show();
			no.show();
		}
	}

	if ( phase === "3DQ" ) {
		text("Does this drawing look like a 3D object to you?",width*.1,height*.1,width*.8)
		drawEdges("black",5)
	}

	if ( phase === "choose" ) {
		displayChoices()
		if ( Q2 == 0 | Q2 == 2 ) { Q2ab = "A"; phase = "send data"; }
		if ( Q2 == 1 | Q2 == 3 ) { Q2ab = "B"; phase = "send data"; }
		//if ( Q2 == 0 | Q2 == 1 | Q2 == 2 | Q2 == 3 ) { phase = "send data"; }
	}

	if ( phase === "send data" ) {  // send data
		sendData();
		//if ( callback === true ) { phase = "end"; }  // do not do this! made sendData() execute 16 times.
		phase = "end";
	}

	if ( phase === "end" ) {
		text("Thank you for participating!",width*.1,height/2,width*.8)
	}
  
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function sendData() {
	send_me = "condition="+condition+"&order="+order+"&Q1="+Q1+"&Q2ab="+Q2ab+"&Q2="+Q2+"&image_index="+image_index+"&choice_display="+choice_display+"&resize_events="+resize_events+"&cube_div_size="+cube_div_size+"&device="+device;
	console.log(send_me)

	$(document).ready(function(){
		$.post({
			url: "finishExperiment", // goes to server.py's handler "finishExperiment" via this relative url: /finishExperiment
			data: send_me,
			success: function(data) {
				response = data;
			}
		});
	});
}

function displayChoices() {
	rectMode(CORNER)
	imageMode(CORNER)

	text("Which image looks most like the 3D object you saw?",width*.1,height*.1,width*.8)
	text_header_height = (height*.1)+(font_height*2)
	// I tried this text on all devices and this text string never does more than 2 lines in both orientations.

    // get the available area to display the 4 choices
    push(); stroke(0); strokeWeight(5); noFill();
    //area = rect(0,text_header_height,width-1,height-1)
    area_x = 0
    area_y = text_header_height
    area_w = width
    area_h = height-text_header_height
    pop();

    ratio = area_w/area_h
    //text(area_w/area_h,200,100)

    choice_w = width/4

    if (ratio > 2) {  // if the aspect ratio is above 2.5, display them in a row
    	choice_display = "row"
    	
    	choice1_x = 0
    	choice2_x = choice_w
    	choice3_x = choice_w*2
    	choice4_x = choice_w*3

    	// center the row of images in the availale area
    	choice_y = area_y + (area_h/2) - (choice_w/2)  // assumes each choice image is square

    	image(images[image_index[0]],choice1_x,choice_y,choice_w,choice_w)//zzz
    	image(images[image_index[1]],choice2_x,choice_y,choice_w,choice_w)
    	image(images[image_index[2]],choice3_x,choice_y,choice_w,choice_w)
    	image(images[image_index[3]],choice4_x,choice_y,choice_w,choice_w)  

    } else {  // if it's below, display them in a 2x2 grid
    	choice_display = "grid"
  
    	col1_x = width/3 - choice_w/2
    	col2_x = (width/3)*2 - choice_w/2

    	row1_y = area_y + (area_h/4) - (choice_w/2)
    	row2_y = area_y + (area_h/4)*3 - (choice_w/2)

    	image(images[image_index[0]],col1_x,row1_y,choice_w,choice_w)
    	image(images[image_index[1]],col2_x,row1_y,choice_w,choice_w)
    	image(images[image_index[2]],col1_x,row2_y,choice_w,choice_w)
    	image(images[image_index[3]],col2_x,row2_y,choice_w,choice_w)
    }
}

function navigate() {
	if (phase === 0) { 
		phase = 1; 
		noCursor(); // hides the cursor for when the cube is drawn 
	}
}

function no_pressed() {
	Q1 = "no";
	phase = "send data";
	no.hide();
	yes.hide();
}

function yes_pressed() {
	Q1 = "yes";
	phase = "choose";
	no.hide();
	yes.hide();
}

function windowResized() { // this function runs several times as the window is dragged to new size
	resizeCanvas(windowWidth, windowHeight);
	onWindowResized() // I put all my commands here so I can run them during setup as well
	resize_events++
}

function onWindowResized() {	
	// do stuff based on the smaller size of the screen (whether in portrait or landscape orientation)
	if (height > width) { 
		font_height = width*.05; // make text size proportional to the smaller side of the screen
		cube_div_size = width/2  // make div the size of the smaller side of the screen
	} else { 
		font_height = height*.05;
		cube_div_size = height/2
	}
	textSize(font_height)

	// see if I can display the cube in this 
	// (mainly I'm doing this to pull the coords off of what .center() ends up doing)
	div.size(cube_div_size, cube_div_size);
	div.center();

	// dimensions of div where the cube will be displayed
	field_width = width; 
	field_height = height;
	field_x = 0;  // field origin: top left corner x
	field_y = 0;  // field origin: top left corner y

	makeCoords(div.x,div.y,cube_div_size,cube_div_size);

	next.center();

}

function makeCoords(x_origin,y_origin,w,h) { // w = width of field where coords are placed, h = height - can be whole screen
	var padding = .2  // 20% of current screen size

	if (w > h) { // base grid_width on the longest of the two screen dimensions
		var grid_width = w-(w*2*padding)  // grid width is determined by screen width, not height
	} else {
		var grid_width = h-(h*2*padding)  // grid width is determined by screen height
	}
	
	var cell_width = grid_width/4
	var y_begin = (h-grid_width)/2

	for (var i = 0; i < 5; i++) {
		x[i] = (h*padding+(cell_width*i))+x_origin
		y[i] = (y_begin+(cell_width*i))+y_origin
	}
}

function drawCoords(x,y) {
	push(); stroke(0); strokeWeight(5);
	for (var i = 0; i < x.length; i++) {
		for (var j = 0; j < y.length; j++) {
			line(x[i],y[j],x[i],y[j])
		}
	}
	pop();
}

function drawIncrementally(order_array,interval,i) {
	// this is a metronome, requiring global variable i that this function increments via return()
  	var timeNow = millis();
  	if (timeNow > nextTime) {
    	i = i+1
    	nextTime = timeNow + interval;
  	}
	
	edge = order_array[i]
	if( edge == 1 ) { edge1 = "true" };  // but indexing starts on 0
	if( edge == 2 ) { edge2 = "true" };
	if( edge == 3 ) { edge3 = "true" };
	if( edge == 4 ) { edge4 = "true" };
	if( edge == 5 ) { edge5 = "true" };
	if( edge == 6 ) { edge6 = "true" };
	if( edge == 7 ) { edge7 = "true" };
	if( edge == 8 ) { edge8 = "true" };
	if( edge == 9 ) { edge9 = "true" };
	if( edge == 10 ) { edge10 = "true" };
	if( edge == 11 ) { edge11 = "true" };
	if( edge == 12 ) { edge12 = "true" };

	return(currentEdge=i)
}

function drawEdges(color,weight) {
	// draws a line when the line's boolean = true
	push();
	stroke(color);
	strokeWeight(weight);
	if( edge1 == "true" ) { line(x[0],y[1],x[0],y[4]) };
	if( edge2 == "true" ) { line(x[0],y[1],x[3],y[1]) };
	if( edge3 == "true" ) { line(x[3],y[1],x[3],y[4]) };
	if( edge4 == "true" ) { line(x[0],y[4],x[3],y[4]) };
	if( edge5 == "true" ) { line(x[1],y[0],x[1],y[3]) };
	if( edge6 == "true" ) { line(x[1],y[0],x[4],y[0]) };
	if( edge7 == "true" ) { line(x[4],y[0],x[4],y[3]) };
	if( edge8 == "true" ) { line(x[1],y[3],x[4],y[3]) };
	if( edge9 == "true" ) { line(x[0],y[1],x[1],y[0]) };
	if( edge10 == "true" ) { line(x[3],y[1],x[4],y[0]) };
	if( edge11 == "true" ) { line(x[3],y[4],x[4],y[3]) };
	if( edge12 == "true" ) { line(x[0],y[4],x[1],y[3]) };
	pop();
}

function overButton(x, y, w, h) { // measures from upper left corner
  if (mouseX >= x && mouseX <= x+w && mouseY >= y && mouseY <= y+h) { return true; } 
  else { return false; }
}

function touchStarted() {
	if (phase === "choose") {
		if (ratio > 2) {
			if (overButton(choice1_x,choice_y,choice_w,choice_w) == true) { Q2 = image_index[0] } 
			if (overButton(choice2_x,choice_y,choice_w,choice_w) == true) { Q2 = image_index[1] }
			if (overButton(choice3_x,choice_y,choice_w,choice_w) == true) { Q2 = image_index[2] }
			if (overButton(choice4_x,choice_y,choice_w,choice_w) == true) { Q2 = image_index[3] }
		} else {
			if (overButton(col1_x,row1_y,choice_w,choice_w) == true) { Q2 = image_index[0] }
			if (overButton(col2_x,row1_y,choice_w,choice_w) == true) { Q2 = image_index[1] }
			if (overButton(col1_x,row2_y,choice_w,choice_w) == true) { Q2 = image_index[2] }
			if (overButton(col2_x,row2_y,choice_w,choice_w) == true) { Q2 = image_index[3] }
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
// END
//////////////////////////////////////////////////////////////////////////////////////////////////////