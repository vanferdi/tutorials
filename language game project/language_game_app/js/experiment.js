// development notes:
// dev_appserver.py app.yaml
// http://localhost:8080/createSlots
// http://localhost:8000/datastore

var support_on = false; // true = shows F and I values of the images on screen during the communication game

var phase = "start"; // phase = "start" to run experiment for reals
// start
// consent
// demographic_questions
// training_instructions
// training
// game_instructions
// director_trial
// matcher_trial
// trials_finished
// routing
// exit_questions
// debrief

// these get read in from the google Datastore
var condition;            // gets set in joinExperiment(), 0 = no memory between rounds, 1 = there is memory between rounds
var entityID;             // ID of the Slot entity (use to set status to "DONE")

var current_round = 1;    // there are two rounds in this experiment
var train_trial = 1;      // the train trial counter, will range from 1 to 32
var trial = 1;            // the test trial counter, will range from 1 to 64, odd = human directs, even = human matches
var screen = 1;           // for different screens within one trial

var max_train_trial = 32;  // 32
var max_trial = 64;        // 64 (human has 32 director and 32 matcher trials) (must be divisible by 4 without a remainder)

var train_image_time = 700;  // 700  // object presented first alone
var train_word_time = 2000;  // 2000 // word presented with the image
var train_blank_time = 500;  // 500  // blank screen between train trials

var feedback_time = 3000;     // 3000 // the CORRECT or WRONG screen
var botchoice_time1 = 5000;   // 5000 // set to longer for the first test trial only (so they can read the screen)
var botchoice_time2 = 1000;   // 1000 // for everything after the first test trial
var transmit_speed = 1000;    // 1000  // how long it takes each letter to appear, in milliseconds // Kanwal was 1200ms

var images = [];        // always [image1,image2] - the variables below refer to this as a master index
var images_map = ["image1.jpg","image2.jpg"];  // keep this hard coded with the image names from the assets folder
var meaning_map = [];   // which meanings go to which images, in this order: [image1,image2]
var longword_map = [];  // which long word goes to which images, in this order: [image1,image2]

var meaning;            // "F" or "I" - will map this to a particular image randomly per participant
var signal;             // "zop", "zopudon", or "zopekil"
var guess;              // gets assigned in copycat_matcher() and when human is the matcher

var train_meanings = [];  // array of "F" and "I" elements, 32 long
var train_words = [];     // array of "S" and "L" elements, 32 long

var experiment_ID;      // make this the google datastore entity ID.

var callback;           // set to true when joinExperiment() GET request is successful

var meaning_history = [];  // these are the memory objects that grow as the trials grow
var signal_history = [];

// create per round
var meanings = [];      // trial order of meanings
var signals = [];       // trial order of signals sent
var guesses = [];       // trial order of meanings guessed
var botguessed = [];    // 1 = the bot randomly guessed, 0 = the bot didn't need to guess (i.e. was in memory or was longword)
var accuracy = [];      // 1 = the bot/human got the trial correct, 0 = the bot/human got the trial wrong
var short_sides = [];   // the short_side for each trial
var F_sides = [];       // the F_side for each trial
var trials = [];        // array of the trial number
var human_roles = [];   // "director" or "matcher"

// then at the end of each round, save the above into the corresponding variables below:
var meanings_round1, signals_round1, guesses_round1; // INCOMPLETE
var meanings_round2, signals_round2, guesses_round2;

// initialize all remaining variables that get sent to the datastore, so sendData() won't fail if they aren't saved for some reason
// TODO make sure that defining everything here didn't screw anything up
var score_round1 = [];
var total_transmit_seconds_round1 = [];
var score_round2 = [];
var total_transmit_seconds_round2 = [];
var train_meanings_round1 = [];
var train_words_round1 = [];
var train_meanings_round2 = [];
var train_words_round2 = [];
var botguessed_round1 = [];
var accuracy_round1 = [];
var short_sides_round1 = [];
var F_sides_round1 = [];
var human_roles_round1 = [];
var botguessed_round2 = [];
var accuracy_round2 = [];
var short_sides_round2 = [];
var F_sides_round2 = [];
var human_roles_round2 = [];
var time_started = [];

var short_word = "zop";
var word_chosen;  // this is the word chosen (by human) on the current test trial, written out as a string

// stimulus image locations - use imageMode(CENTER,CENTER)
var image_x = 400, image_y = 250;                     // ONE image on screen
var image2_xL = 200, image2_xR = 600, image2_y = 300; // TWO images on screen 

// test button locations - director
var test_y = 450, testL_x = 200, testR_x = 600, test_width = 160, test_height = 50;
var testL = false, testR = false;

// test button locations - matcher
var test2_y = image2_y, test2_xL = image2_xL, test2_xR = image2_xR, test2_width = 230, test2_height = 280;
var test2L = false, test2R = false;

// transmission box location
var transbox_y = test_y, transbox_x = 400, transbox_width = 160, transbox_height = 50;
// transmission button location
var transbutton_y = test_y+60, transbutton_x = 400, diam = 52; // diam = diameter of the largest grey circle in the button

// the top of the area with the score, timer, and progress bar
var dashboard_y = 500;  

var dashboard; // boolean for whether to display the dashboard or not (score, timer, and progress bar)

var female = false, male = false, nonbinary = false;

// demographic questions
var age, age_check = false;
var gender, gender_check = false;
var langs, langs_check = false;
var years, years_check = false;
var Q1, Q1_check = false;
var Q2, Q2_check = false;

// exit questions
var skewed = false, equal = false;
var image1_more = false, image2_more = false; // which plant did they see more often? click on image
var yesQ1 = false, noQ1 = false;       // Q: did the robot in Game 2 have memory of Game 1?
var sameQ2 = false, changeQ2 = false;  // Q: did you keep or change your naming behavior in Game 2?

// store the answers to the 5 exit questions here, Q4 and Q5 are NA if participant answered "equal" to Q3
var Q3_round1 = "NA";  // "skewed" or "equal"
var Q4_round1 = "NA";  // "Y" or "N" did the participant choose the true F image, or not?
var Q5_round1 = "NA";  // the percentage on the slider of the true F image
var Q3_round2 = "NA";
var Q4_round2 = "NA";
var Q5_round2 = "NA";
var strategies = "NA"

var nextTime = 0;           // for metronome timing of letter by letter transmission of word_chosen
var currentLetter = 0;      // this value gets incremented by one

var score = 0;
var current_transmit_seconds = 0;   // current number of seconds in the transmission
var total_transmit_seconds = 0;     // total number of seconds the use spent transmitting messages
var current_time_string = "00:00";  // convert the variables above to a string for display on screen // delete
var total_time_string = "00:00";  // delete
var timer_type = "total";           // init display with total time, set to "current" only while transmit button down

var participant_ID; 
var bot_ID = "bot";

// for createMeanings2() - the testing only version of the experiment
var director_meanings = [];
var matcher_meanings = [];

// initialize and set all html button variables
var check1, check2, check3;  // for consent form
//var female, male, nonbinary;

var about_round = 1;  // do exit questions about round 1 first (then about round 2 after)

var c_code = "init";

function preload() { // this function is called once
  notebook_pic = loadImage("assets/notebook.jpg");
  image1 = loadImage("assets/image1.jpg"); image2 = loadImage("assets/image2.jpg"); 
  images[0] = loadImage("assets/image1.jpg"); images[1] = loadImage("assets/image2.jpg");
  robot1 = loadImage("assets/robot1.jpg");
  robot2 = loadImage("assets/robot2.jpg");
  ex1 = loadImage("assets/example1.jpg");
  ex2 = loadImage("assets/example2.jpg");
  ex3 = loadImage("assets/example3.jpg");
  ex4 = loadImage("assets/example4.jpg");
  arrow1 = loadImage("assets/arrow1.png");
  arrow2 = loadImage("assets/arrow2.png");
  arrow3 = loadImage("assets/arrow3.png");
  arrow4 = loadImage("assets/arrow4.png");
  arrow5 = loadImage("assets/arrow5.png");
}

// guesses.push(5)   this appends to an array
// guesses[i] = 5    this overwrites an element in the array

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setup() {  // this function is called once
  // TODO center canvas in browser with css: https://github.com/processing/p5.js/wiki/Positioning-your-canvas
  createCanvas(800, 600); // do not change screen size - everything below is coded absolute to this
  textFont("Helvetica"); textSize(20); noStroke(); fill(0); textAlign(CENTER,CENTER);  // default text specs
  imageMode(CENTER,CENTER); rectMode(CENTER,CENTER); ellipseMode(CENTER,CENTER);

  // TODO - you can't assign .mousePressed(function() ...} in the draw loop!!! Need to do it here and write better function
  // TODO so remove all the crap done with this button - it throws the non-passive event listener junk
  // create all html buttons - do all phase routing here with separate buttons
  next = createButton('Next');  // generic Next button - 
  next.position(660,525);       // you can assign onclick function below, when you make button appear!
  next.style('font-size: 30px');// ...didn't know I could do that when I made all the innumerated next buttons below.
  next.hide();  // initialize javascript with these buttons hidden

  navnext = createButton('Next');
  navnext.position(660,525);
  navnext.style('font-size: 30px');
  navnext.mousePressed(function() {screenNavigator("forward");} ); // navigate through screens only
  navnext.hide();

  navback = createButton('Back');
  navback.position(60,525);
  navback.style('font-size: 30px');
  navback.mousePressed(function() {screenNavigator("backward");} ); // navigate through screens only
  navback.hide();

  navexit = createButton('Next');
  navexit.position(660,525);
  navexit.style('font-size: 30px');
  navexit.mousePressed(function() {exitNavigator();} );
  navexit.hide();

  begin = createButton('Begin');
  begin.position(660,525);
  begin.style('font-size: 30px');
  begin.mousePressed(function() {beginNavigator();} ); // navigate through screens only
  begin.hide();

  next1 = createButton('Begin the experiment');  // leave consent
  next1.position(250,525);
  next1.style('font-size: 30px');
  next1.mousePressed(function() {toPhase("demographic_questions");} );
  next1.hide(); // initialize with it hidden

  next2 = createButton('Next');  // leave demographic questions
  next2.position(660,525);
  next2.style('font-size: 30px');
  next2.mousePressed(function() {toPhase("training_instructions");} );
  next2.hide();

  next3 = createButton('Next');  // leave training instructions
  next3.position(360,525);
  next3.style('font-size: 30px');
  next3.mousePressed(function() {toPhase("training");} );
  next3.hide();

  next4 = createButton('Next');  // leave training trials
  next4.position(660,525);
  next4.style('font-size: 30px');
  next4.mousePressed(function() {toPhase("director_trial");} );
  next4.hide();

  next5 = createButton('Next');  // leave training trials
  next5.position(360,525);
  next5.style('font-size: 30px');
  next5.mousePressed(function() {toPhase("routing");} );
  next5.hide();

  agebox = createInput();
  agebox.position(80, 115);
  agebox.size(50);
  agebox.style('font-size: 20px');
  agebox.style('text-align:left');
  agebox.hide()

  langsbox = createInput();
  langsbox.position(30, 320);
  langsbox.size(730);
  langsbox.style('font-size: 20px');
  langsbox.style('text-align:left');
  langsbox.hide()

  yearsbox = createInput();
  yearsbox.position(670, 404);
  yearsbox.size(50);
  yearsbox.style('font-size: 20px');
  yearsbox.style('text-align:left');
  yearsbox.hide()

  slider_width = 300
  slider = createSlider(0, 100, 50); // (min, max, start)
  slider.class('slider');
  //slider.position(width/2-slider_width/2, height/4*3+50);
  slider.position(width/2-slider_width/2, height/4*2+50);
  slider.size(slider_width,40)  // (width, height)
  slider.hide()

  strategiesbox = createElement("textarea");
  strategiesbox.position(30, 100)
  strategiesbox.size(600,300)
  strategiesbox.hide()

  consent_link = createA("../consent.pdf", "Consent Form")
  consent_link.style('font-size: 22px');
  consent_link.hide()

  pls_link = createA("../PLS.pdf", "Plain Language Statement")
  pls_link.style('font-size: 22px');
  pls_link.hide()

  debrief_link = createA("../debrief.pdf", "Debriefing Page")
  debrief_link.style('font-size: 30px');
  debrief_link.hide()

  completion_code = createElement('h1',c_code); // turn "c_code" into an html element, so users can copy and paste it
  completion_code.position(width/2-100,350)
  completion_code.hide();

  boo = false // REMOVE

  callback = false; // set to true when joinExperiment() GET request is successful
  joinExperiment()

  // inprog
  createMeanings2()

  ////////////////////////////////////////////
  // randomize per participant:

  // create frequency mappings to [image1,image2] for round 1 - these get reversed for round 2 !!!
  // round 2 flip example: if image1 was "F" (the frequent one), image1 will become "I" (the rare one) in round 2
  meaning_map_round1 = shuffle(["F","I"])
  meaning_map_round2 = meaning_map_round1.slice().reverse() // this way reverse() won't change the original
  meaning_map = meaning_map_round1  // kick off the experiment with the round 1 meaning_map

  // create longword mappings to [image1,image2] - this stays like this all experiment
  longword_map = shuffle(["zopudon","zopekil"])  // we don't flip these in round 2, keep same word mappings to plants

  // create train trial order (must come after meaning_map and longword_map coz it uses them)
  createTrainSet() // this function sets these two variables: train_words & train_meanings
  //console.log("the order of the training trial words are: "+train_words)
  //console.log("the order of the training trial meanings are:  = "+train_meanings)

  // for each participant, put testing meanings into a randomized test trial order
  meanings_round1 = createMeanings() // these are created independently of meaning_map and longword_map
  meanings_round2 = createMeanings()
  meanings = meanings_round1  // kick off the experiment with the round 1 meanings

  // create list of short_side per trial (only need values for the Human Director trials - i.e. odd numbered trials)
  short_sides = createShortSides()
  //console.log(short_sides)

  // create list of F_side per trial (only need values for the Human Matcher trials - i.e. even numbered trials)
  F_sides = createFSides()
  //console.log(F_sides)
  ////////////////////////////////////////////

  // initialize botguessed with all zeros (code below overwrites trials where the bot had to guess with value 1)
  botguessed = initBotguessed()
  //console.log(botguessed)
  
  // array of trials gets filled on each trial, as sanity check. Initialize here with 1.
  trials[trial-1] = trial

  // same as above, but for what the human role was on each trial (director or matcher)
  human_roles[trial-1] = "director" // human always starts first as director

  //console.log("here's how things map to [red plant, yellow plant]:")
  //console.log(meaning_map)
  //console.log(longword_map)

  // randomly generate participant_ID
  participant_ID = "H"+nf(int(random(99999999,10000000))); // unique code for this session
  //console.log(participant_ID);

  //bot_ID = "BOT"+nf(int(random(999999,100000))); // unique code for this session
  //console.log(bot_ID);

  // randomly assign the robot1 or robot2 to be Robot A
  // in the one-robot condition, the particpant plays robot A
  robotA_ID = floor(random(1,3))  // randomly choose 1 or 2, 1 = robot1.jpg, 2 = robot2_smal.jpg
  if (robotA_ID === 1) {
    robotA = robot1
    robotB = robot2
  } else {
    robotA = robot2
    robotB = robot1
  }
  //console.log("Robot A is image number "+robotA_ID)

  //console.log("here's the order of the trials, given in terms of F (frequent plant) and I (infrequent plant):")
  //console.log(meanings);

  //console.log("trial = "+trial+" (human directs)")

  

  
}

//////////////////////////////////        ///////    ////////       ///   ///         ///        ///////////////////////////////////////////////////////////
//////////////////////////////////        ///   ///  ///   ///     /////   ///       ///         ///////////////////////////////////////////////////////////
//////////////////////////////////        ///   ///  /////////    //  ///   /// /// ///          ///////////////////////////////////////////////////////////
//////////////////////////////////        ///   ///  /// ///     /////////   /////////           ///////////////////////////////////////////////////////////
//////////////////////////////////        ///////    ///  ////  ///    ///    //  ///            ///////////////////////////////////////////////////////////

function draw() {
  background(255);

  //text(trial,30,30)
  //text("signal "+signal,100,60)
  //text("guess "+guess,100,90)

  screenBorder()
  if (dashboard === true) {
    progressBar(trial)
    displayScore()
    displayTimer(timer_type)
  }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PHASES
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  if ( phase === "start" ) {
    phase = "consent";
  }

  if ( phase === "consent" ) {
    displayConsent();  // sets internally: next1Active = true
  }

  if ( phase === "demographic_questions" ) {
    next1.hide()
    consent_link.hide()
    pls_link.hide()
    displayDemographics(); // sets next2.show() when all 4 questions are answered
  }

  if ( phase === "training_instructions" ) {
  	next2.hide()
  	agebox.hide()
  	langsbox.hide()
  	yearsbox.hide()
  	next3.show()
  	displayTrainInstructions()
  }

  if ( phase === "training" ) {
  	next3.hide()
    word = train_words[train_trial-1]
    meaning = train_meanings[train_trial-1] 
    displayTrainTrial(meaning,word);
  }

  if ( phase === "game_instructions" ) {
  	next4.show() // might need to change to internal screens
  	displayGameInstructions()
  }

  if ( phase === "director_trial" ) {  // Director trial
  	next4.hide()
    meaning = meanings[trial-1]
    short_side = short_sides[trial-1]  // grab this trial's short_side
    displayDirectorTrial(meaning,short_side)

  }
  
  if ( phase === "matcher_trial" ) { // Matcher trial
    meaning = meanings[trial-1]
    F_side = F_sides[trial-1]    // grab this trial's F_side
    displayMatcherTrial(F_side)  // TODO  meaning should be input?
  }

  if ( phase === "trials_finished" ) { // finished all trials
  	next5.show()
    displayTrialsFinished()
  }

  if ( phase === "routing" ) {
  	next5.hide()
  	if (current_round===1) {
		//console.log("round 1 finished")
		finishRound1()
		phase = "training_instructions"  // successfully goes back to training_instructions and button 3
    
    } else { // when round = 2
		  //console.log("round 2 finished")
		  finishRound2()

		  // create the completion code - do this late into the experiment to prevent hacking
	  	c_code = abs(nf(int(random(9999999999,1000000000))));
	  	completion_code = createElement('h1',c_code); // turn "c_code" into an html element, so users can copy and paste it
	  	completion_code.position(width/2-100,350)
	  	completion_code.hide();
	  	//console.log(c_code)

    	phase = "exit_questions"
    }
  }

  if ( phase === "exit_questions") {
    dashboard = false;
    displayExitQuestions()
  }

  if ( phase === "send_data") {
  	sendData()
  	screen=1
  	phase = "debrief"
  }

  if ( phase === "debrief") {
    next.hide()
    strategiesbox.hide()
    displayDebrief()
  }

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mousePressed() {
  //console.log("mouse was pressed") // happens once, whenever mouse is pressed

  if ( phase === "consent" ) {  // Consent
    if ( overButton(76,430,20,20) === true ) { check1 = true; }
    if ( overButton(76,460,20,20) === true ) { check2 = true; }
    if ( overButton(76,490,20,20) === true ) { check3 = true; }
  }

  if ( phase === "director_trial" ) {  // Director trial
    if (screen == 1) {
      if ( overButton(testL_x,test_y,test_width,test_height) === true && testR === false ) { testL = true; } // when goes to true, means user chose that final answer
      if ( overButton(testR_x,test_y,test_width,test_height) === true && testL === false ) { testR = true; }
    }
  }

  if ( phase === "matcher_trial" ) {  // Matcher trial 
  	if (screen == 2) {
  		if ( overButton(test2_xL,test2_y,test2_width,test2_height) === true && test2R === false ) { test2L = true; }
  		if ( overButton(test2_xR,test2_y,test2_width,test2_height) === true && test2L === false ) { test2R = true; }
  	}
  }

  if ( phase === "demographic_questions" ) {
  	if ( overButton(150,208,20,20) === true ) { female = true; male = false; nonbinary = false; }
  	if ( overButton(300,208,20,20) === true ) { female = false; male = true; nonbinary = false; }
  	if ( overButton(430,208,20,20) === true ) { female = false; male = false; nonbinary = true; }
  }

  if ( phase === "exit_questions" ) {
    if (screen === 2) {
      if ( overButton(290,410,20,20) === true ) { yesQ1 = true; noQ1 = false; }  // then they clicked "Yes"
      if ( overButton(490,410,20,20) === true ) { yesQ1 = false; noQ1 = true; }  // then they clicked "No"
    }
    if (screen === 3) {
      if ( overButton(40,100,20,20) === true ) { sameQ2 = true; changeQ2 = false; }
      if ( overButton(40,150,20,20) === true ) { sameQ2 = false; changeQ2 = true; }
    }


    if ( overButton(50,168,20,20) === true ) { skewed = true; equal = false; }
    if ( overButton(50,218,20,20) === true ) { skewed = false; equal = true; }

    if (skewed === true) {
      if (overButton(130,450,200,200) === true ) { image2_more = true; image1_more = false; }
      if (overButton(370,450,200,200) === true ) { image1_more = true; image2_more = false; }
    }


  }
 
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function screenNavigator(direction) {
  //console.log("the current screen is "+str(screen))
  if (direction === "forward") {
    screen++
  }
  if (direction === "backward") {
    screen--
  }
}
  
function exitNavigator() { // for use during phase = "exit_questions" only //xxx

  // screens are listed in reverse (6 to 1) because this block executes every line in order of appearance here
  // and if you set screen to 6 and then below say, if screen === 6, then that block will be triggered

  if (screen === 6) {  
    phase = "send_data"
    navexit.hide()
  } // end screen 6

  if (screen === 5) {
    if (about_round === 2) {  // then we're done with these questions, go to strategies question
      toScreen(6);
    }
    if (about_round === 1) {
      //console.log("TRIGGER")
      // reset display variables
      skewed = false
      equal = false
      image1_more = false
      image2_more = false
      // advance about_round
      about_round = 2;
      // hide the slider and reset its default value
      slider.hide()
      slider.value(50)
      // go back for the next question about Game 2
      toScreen(4); // this won't trigger code in screen === 4 below because both skewed and equal === false right now

    }
  } // end screen 5

  if (screen === 4) {
    if (skewed === true) { toScreen(5); }  // if they answer skew, always just go to the slider on screen 5
    
    if (equal == true) {                   // but if they answer equal, do some routing
      if (about_round === 2) {
        toScreen(6); // go to the strategies question
      }
      if (about_round === 1) { // then they haven't left this page yet, gone to slider, etc.
        // reset display variables
        skewed = false
        equal = false
        image1_more = false
        image2_more = false
        // advance about_round
        about_round = 2;
        // stay on same page
        toScreen(4); 
      }
    }
  } // end screen 4

  if (screen === 1 || screen === 2 || screen === 3) {
    screen++
  }

} // end exitNavigator()



function beginNavigator() {
  if (phase === "training_instructions") { //zzz
    
    if (current_round === 1) {
      // list screens in reverse direction to prevent one from triggering the next - this function executes once, line by line
      if (screen === 9) {
        phase="training"
        screen=1
        begin.hide()
        navback.hide()
        current_transmit_seconds = 0;   // reset these values from the practice button
		    total_transmit_seconds = 0;
      }
    }
    
    if (current_round === 2) {
      phase="training"
      screen=1
      begin.hide()
      current_transmit_seconds = 0;  // reset times and score so Game 2 starts from scratch
      total_transmit_seconds = 0;
      score = 0;
    }

  }
}

// when this function is called, it takes you to a specified phase - used with setTimeout
function toPhase(destination) {
  //console.log(phase)
  return(phase=destination)
}

function nextScreen() {
  return(screen=screen+1)
}

function toScreen(screenNumber) {
  return(screen=screenNumber)
}

function overButton(x, y, w, h) {  // coordinates are the center of a rectangle
  if (mouseX >= x-(w/2) && mouseX <= x+(w/2) && mouseY >= y-(h/2) && mouseY <= y+(h/2)) { return true; } 
  else { return false; }
}

function overCircle(x, y, diameter) {  
  d = dist(mouseX,mouseY, x, y)  // distance of the mouse from the x,y center of the circle, requires ellipseMode(CENTER,CENTER)
  if (d <= diam/2) { return true; }  // if mouse distance is within the radius of the circle (diameter/2), return true
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////













function displayDebrief() {
	push(); textAlign(LEFT); textSize(40);
  	
  	if (screen === 1) {
  		navnext.show()

  		text("Proof of Participation",30,50)

  		textSize(25); text("Please download this debriefing page to find out what this \nexperiment was about!",30,150)
  		
  		debrief_link.position(30,190)
  		debrief_link.show()

  		text("Please copy and keep the code below as proof that you have \ncompleted this experiment.",30,300)
  		completion_code.show();
  	}

  	if (screen === 2) {
  		navnext.hide()
  		debrief_link.hide()
  		completion_code.hide()
  		textAlign(CENTER)
  		textSize(30); text("Thank you so much for your time \nand contribution to our study!",width/2,200)
  		textSize(20); text("Please close your browser to end the experiment.",width/2,400)
  	}
  	pop();
}

function displayConsent() {
  image(notebook_pic,width/2,height/2);
  
  push(); textAlign(LEFT); textStyle(ITALIC); textSize(30);
  text("Informed Consent Form for Experimental Participants",42,100); pop();

  push(); textAlign(LEFT);
  text("Experimentors:  Vanessa Ferdinand, Jacob Kuek",42,150); 
  text("Affiliations:         University of Melbourne",42,175);
  text("Contact info:      vanessa.ferdinand@unimelb.edu.au",42,200);
  
  text("Your participation in this experiment is voluntary and you have the right to \nwithdraw at any time. To withdraw, just close this browser.",42,260);
  text("Before you participate, please download and read these two information sheets:",42,320);
  //text("Consent Form",66,345)
  //text("Plain Language Statement",66,370)
  consent_link.position(66,334)
  consent_link.show()
  pls_link.position(66,364)
  pls_link.show()
  
  text("I have read and understood the Consent Form",100,432);
  text("I am at least 18 years old",100,462);
  text("I agree to participate in this study",100,492);
  pop();

  //checkBox(76,482,20,20,check1);
  //checkBox(76,512,20,20,check2);
  //checkBox(76,542,20,20,check3);

  checkBox(76,430,20,20,check1);
  checkBox(76,460,20,20,check2);
  checkBox(76,490,20,20,check3);
  
  if (check1 && check2 && check3 && callback === true) {  // callback = true means condition was succesfully loaded from datastore
    next1.show();
  }
}

function checkBox(x, y, w, h, check_boolean) {
  push(); fill(255); stroke(0); strokeWeight(1); rectMode(CENTER);
  rect(x,y,w,h);
  if ( overButton(x,y,w,h) === true ) {
    fill(0);
    rect(x,y,w,h);
  }
  if ( check_boolean === true ) {
    fill(0);
    rect(x, y, w, h);
  }
  pop();
}

function basicButton(x,y,w,h,txt) {
  // relies on rectMode(CENTER,CENTER) and textAlign(CENTER,CENTER)
  push(); textSize(30);
  text(txt, x, y);
  pop();

  if ( overButton(x,y,w,h) === true ) { 
    push(); noFill(); stroke(150); strokeWeight(3); // push() makes these 3 style functions apply until pop() is called
    rect(x,y,w,h);
    pop();
    if ( mousePressed === true ) {
      push(); strokeWeight(7);
      rect(x,y,w,h);
      pop();
    }
  }
}

function testButton(x, y, box_width, box_height, test_boolean, inner_text) {

  push(); textSize(30); text(inner_text, x, y); pop();
  push(); stroke(0); noFill(); strokeWeight(1); rect(x, y, box_width, box_height); pop();

  if ( overButton(x,y,box_width,box_height) === true ) { // make box thicker on hover over
    push(); stroke(0); noFill(); strokeWeight(7); rect(x, y, box_width, box_height); pop();
  }
}

// take two randomized meaning lists and zip them together, alternatingly
function arrayZipper(array1,array2) {
  var result = []
  for (var i = 0; i < array1.length; i++) {  // requires array1.length = array2.length
    result.push(array1[i]) // add the current element from meanings1 first (director meanings)
    result.push(array2[i])
  }
  return(result)
}

function createShortSides() {
  // create a short_side value for each trial that the human is a director on
  N_human_director_trials = max_trial/2
  temp = "L".repeat(N_human_director_trials/2)+"R".repeat(N_human_director_trials/2)  // left on half the trials, right on the other half
  temp = temp.split("")
  temp = shuffle(temp)
  empties = "x".repeat(max_trial-N_human_director_trials)  // create x=NA values for the remainder of the trials (where human matches)
  short_sides = arrayZipper(temp,empties)  // temp goes first coz director trial is first
  return(short_sides)
}

function createFSides() {
  // create a F_side value for each trial that the human is a matcher on
  N_human_matcher_trials = max_trial/2
  temp = "L".repeat(N_human_matcher_trials/2)+"R".repeat(N_human_matcher_trials/2)  // left on half the trials, right on the other half
  temp = temp.split("")
  temp = shuffle(temp)
  empties = "x".repeat(max_trial-N_human_matcher_trials)  // create x=NA values for the remainder of the trials (where human directs)
  F_sides = arrayZipper(empties,temp)  // empties goes first coz matcher trial is second
  return(F_sides)
}

function initBotguessed() {
  temp = "0".repeat(max_trial).split("").map(parseFloat)  // turn into numbers with .map(parseFloat)
  return(temp)
}

function createTrainSet() {
  //console.log("createTrainSet() was triggered")

  // create the train order of the meanings
  meanings0 = "F".repeat(24)+"I".repeat(8)
  meanings0 = meanings0.split("")
  meanings0 = shuffle(meanings0) // now randomize
  //console.log("meanings are: "+meanings0)

  // create the randomized set of words for the F objects only
  F_words = "S".repeat(12)+"L".repeat(12)
  F_words = F_words.split("")
  F_words = shuffle(F_words)

  // create the randomized set of words for the I objects only
  I_words = "S".repeat(4)+"L".repeat(4)
  I_words = I_words.split("")
  I_words = shuffle(I_words)

  //console.log("F_words are: "+F_words)
  //console.log("I_words are: "+I_words)

  // now combine the F_words and I_words based on the meaning order
  words0 = [];
  for (var i = 0; i < 32; i++) {
    if (meanings0[i] === "F") {
      words0[i] = F_words.shift(); // grab the first element from F_words and also delete that element
    }
    if (meanings0[i] === "I") {
      words0[i] = I_words.shift(); // grab the first element from I_words and also delete that element
    }
  }
  //console.log("words are: "+words0)

  return(train_words = words0,train_meanings=meanings0)
}

function createMeanings() {

  // create director meanings with this ratio: F:I 24:8 (this is a 75% 25% ratio)
  meanings1 = "F".repeat(24)+"I".repeat(8)
  meanings1 = meanings1.split("")
  meanings1 = shuffle(meanings1) // now randomize

  // create matcher meanings, same ratio
  meanings2 = "F".repeat(24)+"I".repeat(8)
  meanings2 = meanings2.split("")
  meanings2 = shuffle(meanings2) // now randomize

  // zip the two meanings together so the 75/25 ratio holds in the director subset AND the matcher subset of trials
  return(arrayZipper(meanings1,meanings2))
}

// this is for the testing only version of the experiment
// locally make each set of 4 stims be in the 75/25 distribution
// ROUND 1 - 64 trials in 75/25
// ROUND 2 - 64 trials in 25/75
// experimental manipulation: wipe the bot's memory versus not
// ROUND 3 - 64 trials in 25/75
function createMeanings2() {

  quadset = ("F".repeat(3)+"I".repeat(1)).split("")
  N = 16 // the total number of quads per round (8 quads in 32 trials)

  // ROUND 1
  for (var i = 0; i < N; i++) {
    director_meanings = director_meanings.concat(shuffle(quadset))
    matcher_meanings = matcher_meanings.concat(shuffle(quadset))
  }

  // ROUND 2
  quadset = ("I".repeat(3)+"F".repeat(1)).split("")
  for (var i = 0; i < N; i++) {
    director_meanings = director_meanings.concat(shuffle(quadset))
    matcher_meanings = matcher_meanings.concat(shuffle(quadset))
  }

  // ROUND 3
  //for (var i = 0; i < N; i++) {
    //director_meanings = director_meanings.concat(shuffle(quadset))
    //matcher_meanings = matcher_meanings.concat(shuffle(quadset))
  //}

}

// progress bar is empty on the first director trial
// update progress bar on start of every director trial
function progressBar(trial) {
  units = width/max_trial    // divide progress bar width by the number of director trials
  progress = units*(trial-1)    // the current trial number, minus 1 so that when trial 1 begins it shows an empty bar
  thickness = 20

  push(); 
  rectMode(CORNER); fill("grey"); noStroke(); rect(0,height-thickness,progress,20);   // progress bar filling
  noFill(); stroke(0); rect(0,height-thickness,width,thickness);                      // progress bar outline
  pop();
}

function screenBorder() {
  push(); rectMode(CORNER); noFill(); stroke(0); rect(0,0,width-1,height-1); pop();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function displayTrainTrial(meaning,word) { 
  // TIMEOUTS USED BELOW
  background(255);
  noLoop();

  // need to run these again after you called noLoop(); to keep displaying them
  screenBorder();

  // lookup what image goes with the current meaning
  target_image = images[meaning_map.indexOf(meaning)]

  // look up which word to display
  if (word === "S") { w = short_word }
  if (word === "L") { 
    // lookup what long word goes with the current meaning
    long_word = longword_map[meaning_map.indexOf(meaning)]
    w = long_word 
  }

  if (screen === 1) { // object on own
    image(target_image,image_x,image_y)

    setTimeout(function() { toScreen(2); loop(); }, train_image_time);
  }

  if (screen === 2) { // object and word
    image(target_image,image_x,image_y) // keep this first so it's white background doesn't cover anything
    push(); textSize(30);
    text(w,width/2,test_y)  // make it same height as the word test buttons
    pop();

    setTimeout(function() { toScreen(3); loop(); }, train_word_time);
  }

  if (screen === 3) { // blank
    if (train_trial < max_train_trial) {
      setTimeout(function() { toScreen(1); train_trial++; loop(); }, train_blank_time);

    } else {
      setTimeout(function() { toPhase("game_instructions"); loop(); }, train_blank_time);
      screen = 1; // reset screen to 1 for next time it gets used
    }
  }
}

function displayDirectorTrial(meaning,short_side) {

  // display these for entire director trial - but need to type again below whenever noLoop() is called
  screenBorder()
  progressBar(trial)
  displayScore()
  displayTimer(timer_type)

  //text("DIRECTOR",width/2,500)
  if (support_on === true) { text(meanings[trial-1],width/2,410); }  // show current meaning REMOVE LATER

  // lookup what long word goes with the current meaning
  long_word = longword_map[meaning_map.indexOf(meaning)]

  // lookup what image goes with the current meaning
  target_image = images[meaning_map.indexOf(meaning)]
  
  if (screen === 1) {  // Human Director chooses signal

  	//text(word_chosen,30,100)

    text("Choose a name to describe this object to your partner.", width/2, 50)
    image(target_image,image_x,image_y)

    if (short_side === "L") {  // what side of the screen is the "zop" test button on
      testButton(testL_x,test_y,test_width,test_height,testL,short_word)
      testButton(testR_x,test_y,test_width,test_height,testR,long_word)
      if (testL === true) { word_chosen = short_word }  // save which word they chose
      if (testR === true) { word_chosen = long_word }
    }
    if (short_side === "R") {
      testButton(testL_x,test_y,test_width,test_height,testL,long_word)
      testButton(testR_x,test_y,test_width,test_height,testR,short_word)
      if (testR === true) { word_chosen = short_word }  // save which word they chose
      if (testL === true) { word_chosen = long_word }
    }
    
    if (testL === true || testR === true) {
      screen = 2;
      signal = word_chosen;        // save word_chosen as the signal
      signals[trial-1] = signal;   // save the signal the director sent
    }
  }

  if (screen === 2) {  // Human Director transmits signal

    image(target_image,image_x,image_y) // keep this first so it's white background doesn't cover anything

    text("Press the red button to transmit the name to your partner.", width/2, 50)
    text("Keep holding the button until the entire name goes through!", width/2, 80)

    push(); stroke(0); noFill(); strokeWeight(1); rect(transbox_x, transbox_y, transbox_width, transbox_height); pop();
    
    // show word in light grey (must be before transmission_button() coz the black word gets drawn there)
    push(); textAlign(LEFT); fill(200); textSize(30); text(word_chosen,transbox_x-(transbox_width/2)+10, transbox_y); pop();

    transmission_button(transbutton_x, transbutton_y, word_chosen, transmit_speed, transbox_x-(transbox_width/2)+10, transbox_y, 3)  // delay is in milliseconds
  } 

  if (screen === 3) {  // Bot Matcher makes guess

  	updateMemoryObjects()  // updates the variables signal_history and meaning_history

  	// COPYCAT MATCHER
    guess = copycat_matcher()

    // save the guess the bot matcher made
    guesses[trial-1] = guess

    screen = 4
    //console.log("   correct meaning: "+meaning)
    //console.log("   signal sent: "+signal)
    //console.log("   and the guess was: "+guess)
  }

  
  if (screen === 4) {  // Director waiting for partner's response
    // TIMEOUT AT END
    background(255);
    noLoop(); // whenever you use setTimeout on a screen, do noLoop() so setTimeout will only execute once (and only run its timeout function once)

    // need to run these again after you called noLoop(); to keep displaying them
    screenBorder()
    progressBar(trial)
    displayScore()
    displayTimer(timer_type)

    //text(guess,30,30)

    image(target_image,image_x,image_y) // keep this first so it's white background doesn't cover anything

    text("Good work, this name has been sent to your partner.", width/2, 50)
    text("Please wait while they make their choice...", width/2, 80)
    // TODO set some delay before you hit screen 3

    // now show the word fully in black
    push(); stroke(0); noFill(); strokeWeight(1); rect(transbox_x, transbox_y, transbox_width, transbox_height); pop();
    push(); textAlign(LEFT); fill(0); textSize(30); text(word_chosen,transbox_x-(transbox_width/2)+10, transbox_y); pop();

    // give them a little time to see this screen before it automatically goes to the next one
    if( trial === 1) {
      // turn the loop back along with the other functions setTimeout() calls
      setTimeout(function() { toScreen(5); loop(); }, botchoice_time1); // 5000 // make the space long enough to read on the first trial only
      
    } else { 
      setTimeout(function() { toScreen(5); loop(); }, botchoice_time2); // 1000 // wait time for all trials > 1
    }

    
  }

  if (screen === 5) {  // Director Feedback
    background(255); noLoop();

    // if the guess was right
    if (guess === meaning) {
      push(); fill("green"); textSize(60); text("CORRECT",width/2,height/2-100); pop();
      text("Your partner guessed the same plant!", width/2, height/2);
      if (support_on === true) { text("GUESS = "+guess,width/2, height/2+100); }
      outcome = 1;
      score ++;

    // if the guess was wrong
    } else {
      push(); fill("red"); textSize(60); text("WRONG",width/2,height/2-100); pop();
      text("Your partner guessed the other plant!", width/2, height/2);
      if (support_on === true) { text("GUESS = "+guess,width/2, height/2+100); }
      outcome = 0;
    }

    // need to run these again after you called noLoop(); to keep displaying them
    // and put this chunk below score++ above so it will display the new point on the feedback screen
    progressBar(trial)
    screenBorder()
    displayScore()
    displayTimer(timer_type)
    
    setTimeout(function() { toScreen(6); loop() }, feedback_time);  // this line gets executed tons of times if draw is looping
  }

  if (screen === 6) { // End director trial and move to next phase
    // save what you want to from the director trial
    accuracy[trial-1] = outcome

    // reset the guesses and signals
    //console.log("Director trial ended - signal and guess were reset to NA")
    signal = "NA"
    guess = "NA"
    outcome = "NA"

    trial++;
    trials[trial-1] = trial;
    human_roles[trial-1] = "matcher"; // for the upcoming trial type
    phase = "matcher_trial";
    screen = 1; // set screen back to one for the upcoming matcher trial

    //console.log("trial = "+trial+" (human matches)")
  }

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function incremental_text_appearance(word,delay,i,word_x,word_y,go_to_screen) { // x,y = location of the black text
  
  // this is gonna be an implicit for loop, based on a metronome, requiring global variable i that this function increments via return()
  var timeNow = millis();
  if (timeNow > nextTime) {
    i = i+1
    nextTime = timeNow + delay;

    // save number of i units elapsed as the current_transmit_seconds
    current_transmit_seconds = i  // make delay = 1000 so one unit i = one second
    timer_type = "current"
  }

  // make each letter appear incrementally in black
  // x,y location of the word is calcuated from transbox_x and transbox_y
  push(); textAlign(LEFT); fill(0); textSize(30); text(word.substring(0,i),word_x,word_y); pop();

  // if i = length of the word, trigger the message successfully sent event
  if ( word.length === i ) {
    screen = go_to_screen  // 7 for practice, 3 for real deal
    // add current_transmit_seconds to total_transmit_seconds
    total_transmit_seconds = total_transmit_seconds+current_transmit_seconds
    //console.log("adding to timer - hope this only happens once!")
    timer_type = "total"  // reset timer_type to dislay the total number of transmission seconds
  }
  
  return(currentLetter=i)  // awesome, that works!!!!!
}

function displayTimer(timer_type) {

  if (timer_type == "current") { time_in_seconds = total_transmit_seconds+current_transmit_seconds }
  if (timer_type == "total")   { time_in_seconds = total_transmit_seconds }

  minutes = floor(time_in_seconds/60)
  seconds = time_in_seconds-(minutes*60)

  if (seconds < 10) { seconds_string = "0"+seconds } else { seconds_string = seconds }
  if (minutes < 10) { minutes_string = "0"+minutes } else { minutes_string = minutes }
  
  var time_string = minutes_string+":"+seconds_string

  push();
  fill(0); noStroke(); textSize(20); text("transmit time",width-70,height-80);
  fill("red"); 
  textSize(40); text(time_string,width-70,height-45);
  pop();
}

function displayScore() {
  push();
  fill(0); noStroke(); textSize(20); text("score",40,height-80);
  fill("green"); 
  textSize(40); text(score,40,height-45);
  pop();
}

function displayTimerPRACTICE(timer_type) {

  if (timer_type == "current") { time_in_seconds = total_transmit_seconds+current_transmit_seconds }
  if (timer_type == "total")   { time_in_seconds = total_transmit_seconds }

  minutes = floor(time_in_seconds/60)
  seconds = time_in_seconds-(minutes*60)

  if (seconds < 10) { seconds_string = "0"+seconds } else { seconds_string = seconds }
  if (minutes < 10) { minutes_string = "0"+minutes } else { minutes_string = minutes }
  
  var time_string = minutes_string+":"+seconds_string

  push();
  fill(0); noStroke(); textSize(20); text("transmit time",width-170,height-210);
  fill("red"); 
  textSize(40); text(time_string,width-170,height-175);
  pop();
}

function displayScore() {
  push();
  fill(0); noStroke(); text("score",40,height-80);
  fill("green"); 
  textSize(40); text(score,40,height-45);
  pop();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function transmission_button(x,y,word,delay,word_x,word_y,go_to_screen) {  // x,y is the center of the button, requires ellipseMode(CENTER,CENTER)

  // if the user is over the button
  if (overCircle(x, y, diam) === true ) {
    // if the user is currently pressing the button
    if ( mouseIsPressed === true ) {
      button_height = y // make the button press all the way down

      //text(floor(millis()),width/2,620)

      // transmit the word letter by letter
      incremental_text_appearance(word,delay,currentLetter,word_x,word_y,go_to_screen) // currentLetter is global variable
    
    } else { 
    button_height = y-8  // make the button stick up - for when user leaves button
    currentLetter=0      // reset current letter to 0
    timer_type = "total" // reset when the button is released
    }

  } else { 
    button_height = y-8  // make the button stick up - for when nothing has happened yet
  }    

  // draw the button
  push(); 
  fill("grey"); ellipse(x,y,diam,diam)          // outer grey circle, largest part, diam = 52
  fill("black"); ellipse(x,y,diam-10,diam-10)   // black line around red button base
  fill("darkred"); ellipse(x,y,diam-12,diam-12) // shaded side of the red button
  fill("red"); ellipse(x,button_height,diam-12,diam-12)     // top of red button - this is the part that goes up and down
  pop();

}    

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function copycat_matcher() {

	// if they sent the long signal, always answer correctly - so just look up the correct meaning and guess that
	if (signal.length > 3) {
		guess = meaning_map[longword_map.indexOf(signal)]

	// but if they didn't send the long signal, do this instead
	} else {
		if (signal_history.includes(signal)) {  // if the signal sent is in the signal history
			var here = signal_history.lastIndexOf(signal) // then look up the most recent trial it happened on
			//console.log("last index of signal: "+str(here))
			//guess = meanings[here] // and guess the meanings from that trial
			guess = meaning_history[here]
		} else {
			guess = random(["F","I"]) // randomly choose F or I, with 50/50 probability
			botguessed[trial-1] = 1;  // and record that the bot was forced to guess on this trial.
			//console.log("   matcher bot was forced to guess")
		}
	}
	return(guess)

	//console.log(signal)
	//console.log(signal_history)
	//console.log(here)
	//console.log(guess)
}

function copycat_sender() {

  if (meaning_history.includes(meaning)) {                  // if the current meaning is in the meaning history, 
    var here = meaning_history.lastIndexOf(meaning)         // then look up the most recent trial it happened on
    //console.log("last index of meaning: "+str(here))
    //signal = signals[here]                                // and send the signal from that trial
    signal = signal_history[here]
    //console.log("meaning history includes the current meaning") 
  
  } else {                                                  // if the current meaning has not been seen yet,
    long_word = longword_map[meaning_map.indexOf(meaning)]  // lookup what long word goes with the current meaning
    signal = random([short_word,long_word])                 // randomly choose the long or short form, with 50/50 probability
    botguessed[trial-1] = 1;                                // and record that the bot was forced to guess on this trial.
    //console.log("   director bot was forced to guess")
  }
  return(signal)

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function updateMemoryObjects() {  // call this twice 1) before the bot matches and 2) before bot sends

	// do not include the current trial, so use trial-1 for your indexing
	//console.log("for this trial ("+str(trial)+") the bot accesses the two memory objects below:")

	// in round 2 of condition 1, you need to use a special memory object:
  	if (current_round === 2 && condition === 1) {
  		//console.log("SPECIAL LONG MEMORY CONDITION")
  		// in this case, we need the memory round to contain the trials from round 1
  		// so concat all trials from round1 to all trials in memory so far in round 2
  		// (need to index round1 since the length is always 64, but when demoing the experiment, trials can be < 64)
  		meaning_history = concat(meanings_round1.slice(0,max_trial),meanings.slice(0,trial-1))
  		signal_history = concat(signals_round1.slice(0,max_trial),signals.slice(0,trial-1))
  		
  	} else {
  		// otherwise, this is what to use by default:
  		meaning_history = meanings.slice(0,trial-1) // grab history of all meanings seen so far, excluding the current trial
  		signal_history = signals.slice(0,trial-1)
  	}
  	//console.log("meaning history")
  	//console.log(meaning_history)
  	//console.log("signal history")
    //console.log(signal_history)
}


function displayMatcherTrial(F_side) {

  // display for entire matcher trial - but need to type again below whenever noLoop() is called
  screenBorder()
  progressBar(trial)
  displayScore()
  displayTimer(timer_type)
  
  if (support_on === true) { 
    // show meaning of each image - REMOVE LATER
    if (F_side === "L") { text("F",test2_xL,460); text("I",test2_xR,460) }
    if (F_side === "R") { text("F",test2_xR,460); text("I",test2_xL,460) }
  }

  if (screen == 1) {  // Bot Director chooses signal

    updateMemoryObjects()  // updates the variables signal_history and meaning_history

    signal = copycat_sender()

  	screen = 2
  	//console.log("XXXXX HUMAN MATCHER")
  	//console.log("F_side = "+F_side)
  	//console.log("   correct meaning: "+meaning)
    //console.log("   signal sent: "+signal)

  }

  if (screen == 2) {  // Human Matcher chooses image

  	F_image = images[meaning_map.indexOf("F")]  // lookup which image is "F"
  	I_image = images[meaning_map.indexOf("I")]  // lookup which image is "I"

  	//                                     left is here                       right is here
    if (F_side == "L")  { image(F_image,image2_xL,image2_y); image(I_image,image2_xR,image2_y) }  // put F_image on left
    if (F_side == "R") { image(I_image,image2_xL,image2_y); image(F_image,image2_xR,image2_y) }  // put F_image on right

    text("Your partner said", width/2, 50)
    push(); textSize(30); text(signal, width/2, 80); pop();
    text("Which plant do you think your partner was describing?", width/2, 120)

    if (F_side === "L") {  // what side of the screen is the "F" image on - if F is on the left,
      testButton(test2_xL,test2_y,test2_width,test2_height,test2L,"")  // left button gets L boolean
      testButton(test2_xR,test2_y,test2_width,test2_height,test2R,"")  // right button gets R boolean
      if (test2L === true) { meaning_chosen = "F" }  // save F if they chose the left button
      if (test2R === true) { meaning_chosen = "I" }  // save I if they chose the right button
    }
    if (F_side === "R") {  // if F is on the right,
      testButton(test2_xL,test2_y,test2_width,test2_height,test2L,"")
      testButton(test2_xR,test2_y,test2_width,test2_height,test2R,"")
      if (test2R === true) { meaning_chosen = "F" }  // save F if they chose the right button
      if (test2L === true) { meaning_chosen = "I" }  // save L if they chose the left button
    }
    
    // when human matcher chooses a meaning
    if (test2L === true || test2R === true) {
      screen = 3;

      // TODO am I saving the correct things???
      // should guesses alternate between meanings and signals?

      signals[trial-1] = signal;  // save the signal that the bot director sent
      guess = meaning_chosen;     // assign to guess, coz I'm not clearing or updating the meaning_chosen variable
      guesses[trial-1] = guess;   // save the meaning that the human matcher guessed

      //console.log("   and the guess was: "+guess)
      //console.log("meaning_chosen was "+meaning_chosen)
    }

  }

  if (screen == 3) {  // Matcher feedback
  	background(255); noLoop(); // for TIMEOUT

  	// if the guess was right
    if (guess === meaning) {
      push(); fill("green"); textSize(60); text("CORRECT",width/2,height/2-100); pop();
      text("You guessed the same plant!", width/2, height/2);
      if (support_on === true) { text("GUESS = "+guess,width/2, height/2+100); }
      outcome = 1;
      score ++; // need the score to update on this screen so people see they just got the point

    // if the guess was wrong
    } else {
      push(); fill("red"); textSize(60); text("WRONG",width/2,height/2-100); pop();
      text("You guessed the other plant!", width/2, height/2);
      if (support_on === true) { text("GUESS = "+guess,width/2, height/2+100); }
      outcome = 0;
    }

    // need to run these again after you called noLoop(); to keep displaying them
    // and put this chunk below score++ above so it will display the new point on the feedback screen
    progressBar(trial)
    screenBorder()
    displayScore()
    displayTimer(timer_type)

    setTimeout(function() { toScreen(4); loop() }, feedback_time);
  }

  if (screen == 4) {
    // everything in this screen executes only once

    // save what you want to from the matcher trial
      accuracy[trial-1] = outcome

    // reset whatever you need to reset  HEREEEEE
    testL = false; testR = false;
    test2L = false; test2R = false;
  	
    // send user back to another director trial if they're not done yet
    if (trial < max_trial) {
      phase = "director_trial";
      screen = 1;
      trial++;
      trials[trial-1] = trial;
      human_roles[trial-1] = "director"; // for the upcoming trial type
      //console.log("trial = "+trial+" (human directs)")
    
    // or take them to the end of the experiment
    } else { phase = "trials_finished"; }
  }

}

function displayTrialsFinished() {

  trial = max_trial+1 // this gets the progress bar to display as 100% full now

  progressBar(trial)
  screenBorder()
  displayScore()
  displayTimer(timer_type)

  push(); imageMode(CENTER); textAlign(CENTER); textSize(25)

  if (condition === 0) { // two robots
  	if (current_round === 1) { image(robotA,width/2,220) }
    if (current_round === 2) { image(robotB,width/2,220) }
  	text("Congratulations! You just completed Game "+current_round+" with Robot "+current_round+".",width/2,50)	
  }

  if (condition === 1) { // same robot
  	image(robotA,width/2,220)
  	text("Congratulations! You just completed Game "+current_round+" with the Robot.",width/2,50)
  }

  textSize(20); //bbb
  text("Your score for Game 1 was: \n"+score+" points",200,400) 
  text("Your total time for Game 1 was: \n"+minutes+" minutes and "+seconds+" seconds",600,400)
  pop();
}


function displayDemographics() {
	agebox.show()
	langsbox.show()
	yearsbox.show()

	push(); textAlign(LEFT);
	text("Please answer the following questions:",30,50)

	text("Age",30,130)
	text("Gender",30,210)
	text("What language(s) do you speak in your household?",30,290)
	text("How many years of experience have you had with Australian English?",30,420)
	pop();

	text("Female",208,210)
	checkBox(150,208,20,20,female);

	text("Male",348,210)
  checkBox(300,208,20,20,male);

  text("Non-binary",504,210)
  checkBox(430,208,20,20,nonbinary);

	age = agebox.value(); 
	langs = langsbox.value();
	years = yearsbox.value();
  
  	if ( age.length > 0 ) { age_check = true; }
  	if ( langs.length > 0 ) { langs_check = true; }
  	if ( years.length > 0 ) { years_check = true; }
  	if ( female === true || male === true || nonbinary === true ) { gender_check = true; }

  	if ( female === true ) { gender = "female" }
  	if ( male === true ) { gender = "male" }
  	if ( nonbinary === true ) { gender = "non-binary"}

  	if (age_check === true && gender_check === true && langs_check === true && years_check === true) {
  		next2.show()
  	}

}

function displayExitQuestions() { //xxx
  push(); textAlign(LEFT); imageMode(CENTER);

  //screen=4 // delete

  // control where buttons appear here
  if (screen === 1) { navexit.show() } else { navexit.hide() }


  if (screen === 1) {
    textSize(30);
    text("You have reached the last part of the experiment.",30,50)

    textSize(20);
    text("We need to ask you a few important questions about your experiences \nin Game 1 and Game 2.",30,125)
    text("Please take a moment to answer them correctly and thoroughly.",30,200)
  } // end screen 1

  if (screen === 2) {
    if (condition === 0) { // then they play robotB in Game 2
      image(robotB,width/2,160)
    }
    if (condition === 1) { // then they play robotA in Game 2
      image(robotA,width/2,160)
    }

    textSize(20);
    text("While you were playing this robot in Game 2, \ndid you think this robot knew or remembered anything you did during Game 1?",30,340)
    image(arrow5,300,292)

    text("Yes",310,412)
    checkBox(290,410,20,20,yesQ1)
    text("No",510,412)
    checkBox(490,410,20,20,noQ1)

    if ( yesQ1 === true || noQ1 === true ) { Q1_check = true; navexit.show(); }
    if ( yesQ1 === true ) { Q1 = "Y" }
    if ( noQ1 === true ) { Q1 = "N" }
  } // end screen 2

  if (screen === 3) {

    text("Which of these statements best describes your behavior in Game 2?",30,50)

    text("I tried to use the names in the same way I'd been using them in Game 1.",65,102)
    text("I tried to use the names in a different way to how I'd been using them in Game 1.",65,152)

    checkBox(40,100,20,20,sameQ2)
    checkBox(40,150,20,20,changeQ2)

    if ( sameQ2 === true || changeQ2 === true ) { Q2_check = true; navexit.show(); }
    if ( sameQ2 === true ) { Q2 = "same" }
    if ( changeQ2 === true ) { Q2 = "changed" }
  } // end screen 3

  if (screen === 4) { // was screen 1

    if (about_round === 1) { text("Think back to the plants you saw in Game 1.",30,50) }
    if (about_round === 2) { text("Now, think back to the plants you saw in Game 2.",30,50) }

    text("Which of these sentences best describes what you saw during Game "+about_round+"?",30,120)
    text("I saw one of the plant images more often than the other.",80,170)
    text("I saw both plant images equally often.",80,220)

    checkBox(50,168,20,20,skewed);
    checkBox(50,218,20,20,equal);

    if (equal === true) { // then send them right back to this page for the round 2 questions
      navexit.show()
    } else {       // if they said it was skewed,
      navexit.hide()  // then don't show the next button or hide it again - then show the next question below
    }

    if (skewed === true) {
      image(image2,130,450,200,200)
      image(image1,370,450,200,200)
      text("Which plant did you see more often in Game "+about_round+"?",30,290)

      // draw grey rectangle over the image they hover over
      if (overButton(130,450,200,200) === true) { 
        push(); rectMode(CENTER); noFill(); stroke(150); strokeWeight(3); rect(130,450,200,200); pop();
      }
      if (overButton(370,450,200,200) === true) { 
        push(); rectMode(CENTER); noFill(); stroke(150); strokeWeight(3); rect(370,450,200,200); pop();
      }

      // draw rectangle over the selected image - using the boolean assigned in mousePressed()
      if (image2_more === true) { 
        push(); rectMode(CENTER); noFill(); stroke(150); strokeWeight(5); rect(130,450,200,200); pop(); 
      }
      if (image1_more === true) { 
        push(); rectMode(CENTER); noFill(); stroke(150); strokeWeight(5); rect(370,450,200,200); pop(); 
      }

      // then when all answers are selected, let them advance to screen 5
      if (image1_more === true || image2_more === true ) {
        navexit.show() // exitNavigator() if screen === 4, then advance to screen = 5
      }
    }

    // create Q3 = "skewed" or "equal"
    if (about_round === 1) { 
      if (skewed === true) { Q3_round1 = "skewed"; }
      if (equal === true) { Q3_round1 = "equal"; }
    }
    if (about_round === 2) { 
      if (skewed === true) { Q3_round2 = "skewed"; }
      if (equal === true) { Q3_round2 = "equal"; }
    }

    // create Q4 = "Y" or "N"  Did the participant choose the image that actually appeared more (i.e. the "F" image)?
    // Check if the participant chose image1 or image2, then check which one was the "F" image
    if (about_round === 1) {
      if (image1_more === true) { // participant chose image1
        one_selected = meaning_map_round1[0] // grab image1 meaning from round1 meaning_map
        if (one_selected === "F") { Q4_round1 = "Y" } else { Q4_round1 = "N" }  // check if this equals "F"
      }
      if (image2_more === true) { // participant chose image2
        one_selected = meaning_map_round1[1] // grab image2 meaning from round1 meaning_map
        if (one_selected === "F") { Q4_round1 = "Y" } else { Q4_round1 = "N" }  // check if this equals "F"
      }
    }
    if (about_round === 2) { 
      if (image1_more === true) { // participant chose image1
        one_selected = meaning_map_round2[0] // grab image1 meaning from round1 meaning_map
        if (one_selected === "F") { Q4_round2 = "Y" } else { Q4_round2 = "N" }  // check if this equals "F"
      }
      if (image2_more === true) { // participant chose image2
        one_selected = meaning_map_round2[1] // grab image2 meaning from round1 meaning_map
        if (one_selected === "F") { Q4_round2 = "Y" } else { Q4_round2 = "N" }  // check if this equals "F"
      }
    }
  }





  if (screen === 5) {  // was screen 2
    navexit.show()

    textAlign(CENTER)
    text("Move the slider below to tell us how often you saw the plants in Game "+about_round+".", width/2, 50)
    displaySlider2()

    // create Q5 = percent of times that the "F" image was seen
    // slider.value() = is hard coded to equal the percentage of image2
    if (about_round === 1) {
      // check if image2 is the "F" image
      if (meaning_map_round1[1] === "F") { // if this is the case, then record the percentage as is
        Q5_round1 = slider.value()
      } else { // otherwise, record the inverse of the percentage
        Q5_round1 = 100-slider.value()
      }
    }
    if (about_round === 2) { // repeate the chunk above for the round2 variables
      if (meaning_map_round2[1] === "F") {
        Q5_round2 = slider.value()
      } else { // otherwise, record the inverse of the percentage
        Q5_round2 = 100-slider.value()
      }
    }
  }

  if (screen === 6) {  // was screen 3
    slider.hide()
    navexit.show()
    text("What strategies did you use to communicate with the robot?",30,50)
    strategiesbox.show()
    strategies = strategiesbox.value()
  }

  pop(); // push() began on first line of displayExitQuestions() definition

}



function displaySlider() {

  slider.show()

  image(image1,width/4,height/2)
  image(image2,width/4*3,height/2-30)

  push();
  textSize(40);
  text(slider.value()+"%",width/4*3+18,height/2+160)
  text(100-slider.value()+"%",width/4+18,height/2+160)
  pop();

}

function displaySlider2() {
  slider.show()

  image(image1,width/4+60,height/2+190,200,200)          // blue one
  image(image2,width/4*3-60,height/2+190-10,200,200)     // yellow one

  push();
  textSize(40);
  //text(100-slider.value()+"%",width/4+18,height/2+160)
  //text(slider.value()+"%",width/4*3+18,height/2+160)
  text(100-slider.value()+"%",width/4+18+42,height/2+30) // blue one 
  text(slider.value()+"%",width/4*3+18-68,height/2+30)   // yellow one
  pop();

  push();
  fill("#FBC03A")
  rectMode(CORNERS)
  //rect(500,400,400,400-(2*slider.value()))  // (x,y bottom right corner  x,y top left corner) and rect draws downwards
  rect(600,300,500,300-(2*slider.value()))

  fill("#DE432E")
  //rect(400,400,300,200+(2*slider.value()))
  rect(310,300,210,100+(2*slider.value()))
  pop();

  // 2 rectangles side by side that move together
  //rect(400,400,300,400-slider.value())
  //rect(500,400,400,400-slider.value())

  // 2 rectangles side by side that move inversely
  //rect(400,400,300,400-slider.value())
  //rect(500,400,400,300+slider.value())

  // this swaps the location of the rectangles above  (swap the x coordinates)
  //rect(500,400,400,400-slider.value())
  //rect(400,400,300,300+slider.value()) 
}

function displayTrainInstructions() { 
  //noLoop();  // use redraw() each time a navigation button is pushed
  next3.hide() // TODO dont show next3 earlier - find where shown and remove

  push();  // pop() closes this at the last line of displayTrainInstructions()
	 
  //condition = 1 // DELETE
  //screen = 6
  //current_round = 1 // qqq

  //////////////////////////////////////////////// ROUND 1 Instructions ////////////////////////////////////////////////
  if (current_round === 1) {

    if (screen < 6 || screen === 7 || screen === 8 ) { navnext.show() } else { navnext.hide() }  // don't show on screen 7 (transmit button)
    if (screen > 1 && screen < 9) { navback.show() } else { navback.hide() }
    if (screen > 8) { begin.show() } else { begin.hide() }

    if (screen < 9) {
      textAlign(LEFT,TOP); textSize(40); text("Instructions",30,30)
      textSize(20); text("page "+screen+" of 8",654,30)
    }
    
    if (screen === 1) {

      if (condition === 0) {  // play two different robots
        textSize(20); text("In this experiment, you will play two word learning games with two different robots.",30,100)
        
        textAlign(CENTER); imageMode(CENTER)
        image(robotA,200,340)
        textSize(25); text("Game 1",200,170)
        image(robotB,580,340)
        textSize(25); text("Game 2",580,170)

        textSize(20); text("In Game 1, you will play Robot 1.",200,470)
        text("In Game 2, you will play Robot 2.",580,470)
      } // condition = 0

      if (condition === 1) {  // play one robot
        textSize(20); text("In this experiment, you will play two word learning games with a robot.",30,100)
        
        textAlign(CENTER); imageMode(CENTER)
        image(robotA,200,340)
        textSize(25); text("Game 1",200,170)
        image(robotA,580,340)
        textSize(25); text("Game 2",580,170)

        textSize(20); text("In both games, you will play with the same robot.",width/2,470)
      }

      if (condition === "temp") {  // play one robot
        textSize(20); text("In this experiment, you will play two word learning games with a robot.",30,100)
        
        imageMode(CENTER); image(robotA,width/2,340)
      }

    } // end screen 1

    if (screen === 2) {
      textSize(25); text("Part A: Training",30,170)
      textSize(20); text("Each game has two parts.",30,100)

      text("You and your robot partner are going to learn the \nnames for some really weird plants.",30,220)
      text("\nWe will show you and the robot several pictures of \nplants with their names written below it, like this",30,270)
      text("\nYour robot partner will see the same things you see.",30,340)

      text("All you need to do in Part A is sit back, watch, and \ntry to remember what the plants are called.",30,410)

      image(ex1,640,340)
      image(arrow1,485,330)

    } // end screen 2

    if (screen === 3) {
      image(ex2,620,320+40)
      textAlign(CENTER); text("Director View",620,250)

      textAlign(LEFT); textSize(25); text("Part B: Communication",30,100)

      textSize(20);
      text("Next, you and the robot will play a communication game together. \nIn the communication game, you and the robot will take turns being the \"director\" \nand being the \"matcher\".",30,150)  

      text("The director will be shown one of the plants and \nmust choose a name to send to the matcher.",30,240+40)

      text("There is a special button that sends the name to \nthe matcher.  It transmits the name slowly, one \nletter at a time, and you must hold the button \ndown until the transmission is complete",30,342+40)
      //text("When you choose the word you want to send, use the special red button to transmit the word to the matcher. ",30,370)
      image(arrow2,498,427+40)

    } // end screen 3

    if (screen === 4) {
      image(ex3,620,270+60)
      textAlign(CENTER); text("Matcher View",620,220)

      textAlign(LEFT); textSize(25); text("Part B: Communication",30,100)

      textSize(20);
      text("Then, the matcher receives the name and guesses which plant the director had.",30,150)  
      text("If the matcher guesses correctly, both you and \nthe robot get a point!  \n\nIf the matcher doesn't guess correctly, no one \ngets a point.",30,190+60)
    
    } // end screen 4

    if (screen === 5) {

      image(ex4,width/2,430)

      textSize(25); text("Goal",30,100)

      textSize(20); 
      text("Both you and the robot have the same goal: \nto get as many points as possible, in the shortest amount of time.",30,150)
      text("At the bottom of the screen we will show you:",30,220)

      textAlign(CENTER)
      text("Your score \nThis should be high!",160,260)
      text("Your time \nThis should be low!",600,260)

      image(arrow3,160,340)
      image(arrow3,600,340)

      textAlign(LEFT)
      text("The progress bar.  This tells you how \nmuch of the game you have completed.",270,540)
      image(arrow4,250,530)


    } // end screen 5

    if (screen === 6) {

      textSize(25); textAlign(LEFT); text("Transmitting the name",30,100)

      textSize(20);
      text("As we said, you want to keep your time low.  The timer keeps track of the total \nnumber of seconds you spent using the transmit button.  If you accidentally let go \nof the button before the name finishes sending, we won't count that mistake.  \nWe will only count the seconds you used when you successfully transmitted a name.",30,150)

      text("Practice using the button below to transmit the name \"wugamug\" to your partner. \n(Don't worry, this is just practice - we won't count these seconds against you!)",30,270)

      // show the transmission button and timer for an example word
      push(); stroke(0); noFill(); strokeWeight(1); rect(transbox_x, transbox_y-32, transbox_width, transbox_height); pop(); // adjust location of transmit box here (box y=-32 up)
      push(); textAlign(LEFT); fill(200); textSize(30); text("wugamug",transbox_x-(transbox_width/2)+10, transbox_y-48); pop(); // adjust grey word location in box here (word y=-48)
      transmission_button(transbutton_x, transbutton_y-32, "wugamug", transmit_speed, transbox_x-(transbox_width/2)+10, transbox_y-48,7)  // adjust location of black word overwrite
      textAlign(CENTER); displayTimerPRACTICE(timer_type)


    } // end screen 7

    if (screen === 7) {  // screen 6 needs to bounce here then back when the transmit button sends the full name
      
      textSize(25); textAlign(LEFT); text("Transmitting the name",30,100)

      textSize(20);
      text("As we said, you want to keep your time low.  The timer keeps track of the total \nnumber of seconds you spent using the transmit button.  If you accidentally let go \nof the button before the name finishes sending, we won't count that mistake.  \nWe will only count the seconds you used when you successfully transmitted a name.",30,150)

      text("Practice using the button below to transmit the name \"wugamug\" to your partner. \n(Don't worry, this is just practice - we won't count these seconds against you!)",30,270)

      // show the transmission button and timer for an example word
      push(); stroke(0); noFill(); strokeWeight(1); rect(transbox_x, transbox_y-32, transbox_width, transbox_height); pop(); // adjust location of transmit box here (box y=-32 up)
      push(); textAlign(LEFT); fill(0); textSize(30); text("wugamug",transbox_x-(transbox_width/2)+10, transbox_y-48); pop(); // adjust grey word location in box here (word y=-48)
      //transmission_button(transbutton_x, transbutton_y-32, "wugamug", transmit_speed, transbox_x-(transbox_width/2)+10, transbox_y-48,6)  // adjust location of black word overwrite
      textAlign(CENTER); displayTimerPRACTICE(timer_type)

      text("Great job, you transmitted the name! \nClick \"Back\" to try it again.",width/2,510)

    } // end screen 8

    if (screen === 8) { //qqq

      textSize(25); textAlign(LEFT); text("You're ready to begin!",30,100)

      textSize(20); text("If anything is unclear, please use the \"Back\" button to review the instructions.",30,150)

      imageMode(CORNER)
      image(ex1,86+30,250+50,200,200)
      image(ex2,496-20,225+50,210,210)

      text("Recap:",30,170+50)
      textAlign(CENTER)
      text("In Part A, \nwatch the plants being named ",190+30,200+50)
      text("In Part B, \nplay the communication game",600-20,200+50)

    } // end screen 9

    if (screen === 9) {

      if (condition === 0) { // play two robots
        textAlign(CENTER); textSize(25)
        text("You will now play Game 1 with Robot 1.",width/2,150)

        imageMode(CENTER); image(robotA,width/2,340)
      }
      if (condition === 1) { // play one robot
        textAlign(CENTER); textSize(25)
        text("You will now play Game 1 with the Robot.",width/2,150)

        imageMode(CENTER); image(robotA,width/2,340)
      }
    } // end screen 10

  } // end round 1 instructions

  //////////////////////////////////////////////// ROUND 2 Instructions ////////////////////////////////////////////////
  if (current_round === 2) {

    if (screen === 1) { begin.show() } else { begin.hide() }

    if (screen = 1) {
      textAlign(CENTER); textSize(25)

      if (condition === 0) { // play 2 robots
        imageMode(CENTER); image(robotB,width/2,290)  // switch to the next robot
        text("You will now play Game 2 with Robot 2.",width/2,100)
      }
      if (condition === 1) {  // play one robot
        imageMode(CENTER); image(robotA,width/2,290) // keep showing the same robot: robot A
        text("You will now play Game 2 with the Robot.",width/2,100)
      }
      textSize(20); text("You may take a break if you'd like. \nClick \"Begin\" when you are ready to start.",width/2,540)
    } // end screen 1
  } // end round 2 instructions
	
  pop()

} // end define displayTrainInstructions()


function displayGameInstructions() {
	push()

  if (condition === 0) { // two robots
    if (current_round === 1) { imageMode(CENTER); image(robotA,width/2,310) }
    if (current_round === 2) { imageMode(CENTER); image(robotB,width/2,310) }
  }
  if (condition === 1) { // same robot
    imageMode(CENTER); image(robotA,width/2,310)  // always play robot A
  }
	
  textAlign(CENTER); textSize(25)
  text("Good job! You just completed Part A.",width/2,50)

  textSize(20)
  text("Now you will do Part B: \nYou will play the communication game with your robot partner!",width/2,130)

  text("Your goal: \nWork together with your robot partner to get the \nhighest score in the shortest amount of time.",width/2,490)

	pop()
}


function finishRound1() {
  // flip the meaning_map for round 2
  meaning_map = meaning_map_round2

  // save all variables from round 1
  train_words_round1 = train_words
  train_meanings_round1 = train_meanings
  meanings_round1 = meanings
  signals_round1 = signals
  guesses_round1 = guesses
  botguessed_round1 = botguessed
  accuracy_round1 = accuracy
  short_sides_round1 = short_sides
  F_sides_round1 = F_sides
  trials_round1 = trials
  human_roles_round1 = human_roles
  score_round1 = score                                    // save here coz this value will be reset for round 2
  total_transmit_seconds_round1 = total_transmit_seconds  // save here coz this value will be reset for round 2
  // but don't reset score and transmit time - let participant see cumulative score for whole experiment

  // reset those variables for round 2
  meanings = meanings_round2 // meanings_round2 was already created in setup()
  signals = []
  guesses = []
  botguessed = initBotguessed() // initializes with all zeros
  accuracy = []
  short_sides = createShortSides()
  F_sides = createFSides()
  trials = []
  human_roles = []

  // reset display variables for everything that replays in round 2
  train_trial = 1                    // reset train trial to 1
  trial = 1                          // reset game trial to 1
  screen = 1
  trials[trial-1] = 1                // then initialize
  human_roles[trial-1] = "director"  // then initialize
  current_round = 2

  createTrainSet() // creates new train_words and train_meanings for the next round 2 training phase
}

function finishRound2() {
  // save all variables from round 2
  train_words_round2 = train_words
  train_meanings_round2 = train_meanings
  meanings_round2 = meanings
  signals_round2 = signals
  guesses_round2 = guesses
  botguessed_round2 = botguessed
  accuracy_round2 = accuracy
  short_sides_round2 = short_sides
  F_sides_round2 = F_sides
  trials_round2 = trials
  human_roles_round2 = human_roles
  score_round2 = score
  total_transmit_seconds_round2 = total_transmit_seconds

  screen = 1
}

function joinExperiment() {
  // get stuff from the Google Datastore
  // make a GET request to server.py's joinExperiment handler
    $(document).ready(function(){
      $.get({
        url: "joinExperiment",
        success: function(data) { // the GET response arrives in a pre-packaged variable called "data"
          // incoming data from server.py is a string formatted like this:
          // chosen_id;cnd;cod;dis;chn;gen;trn;prn;current_time
          incoming = data.split(";") // split the string into its variables
          //console.log(incoming)
          //console.log(incoming)
          entityID = incoming[0] // assign each incoming variable to an existing js global variable
          condition = int(incoming[1])
          time_started = incoming[2]

          // if all of the slots are full, server.py will send an empty string.
          // the runtime plan is to make a crapload of slots, so they will never get completely full
          // but just in case, I'm putting this code in there
          if (incoming == "") {
            alert("There was an error loading the experiment.  Please email Jacob at kuek@student.unimelb.edu.au and we'll fix this for you! \n\nClose this browser and try back when we email you that it's fixed.")
            // if the user closes the error box, experiment.js will stay looping in phase="consent" until the browser is closed.
          } else {
            callback = true  // callback. when callback = true it means the get request was a success (i.e. data for a slot was returned)
          }
        },
      });
    });
}

function sendData() {

  if (condition === 0) { condition_recode = "different" }
  if (condition === 1) { condition_recode = "same" }

	send_me = "condition="+condition_recode+"&entityID="+entityID+"&c_code="+c_code+"&transmit_speed="+transmit_speed+"&robotA_ID="+robotA_ID+"&age="+age+"&gender="+gender+"&langs="+langs+"&years="+years+"&strategies="+strategies+"&Q1="+Q1+"&Q2="+Q2+"&Q3_round1="+Q3_round1+"&Q3_round2="+Q3_round2+"&Q4_round1="+Q4_round1+"&Q4_round2="+Q4_round2+"&Q5_round1="+Q5_round1+"&Q5_round2="+Q5_round2+"&score_round1="+score_round1+"&total_transmit_seconds_round1="+total_transmit_seconds_round1+"&score_round2="+score_round2+"&total_transmit_seconds_round2="+total_transmit_seconds_round2+"&images_map="+images_map+"&longword_map="+longword_map+"&meaning_map_round1="+meaning_map_round1+"&meaning_map_round2="+meaning_map_round2+"&train_meanings_round1="+train_meanings_round1+"&train_words_round1="+train_words_round1+"&train_meanings_round2="+train_meanings_round2+"&train_words_round2="+train_words_round2+"&meanings_round1="+meanings_round1+"&signals_round1="+signals_round1+"&guesses_round1="+guesses_round1+"&botguessed_round1="+botguessed_round1+"&accuracy_round1="+accuracy_round1+"&short_sides_round1="+short_sides_round1+"&F_sides_round1="+F_sides_round1+"&human_roles_round1="+human_roles_round1+"&meanings_round2="+meanings_round2+"&signals_round2="+signals_round2+"&guesses_round2="+guesses_round2+"&botguessed_round2="+botguessed_round2+"&accuracy_round2="+accuracy_round2+"&short_sides_round2="+short_sides_round2+"&F_sides_round2="+F_sides_round2+"&human_roles_round2="+human_roles_round2+"&time_started="+time_started;
	//"key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val+"&key="+val;

	//console.log("data is being sent")
	//console.log(send_me)

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


// try later for creating a slider!
// tempoSlider = createSlider(40, 208, 100);
// tempoSlider.class('slider');


