/////////////////////////////////
//// GORDON'S ADDITIONS /////////
/////////////////////////////////

var PIPETTES = { // global variable for use in setPipetteContainers
  "Center": false, // remembers which pipette is assigned to which axis
  "Left": false
}

function setPipetteNames(inputJSON){ // sets the names of the pipettes in the containers menu

  PIPETTES = { "Center": false, "Left": false }; // reset PIPETTES variable

  for(var pipette in inputJSON.head){ // loop through head items (pipettes)
    var channel = "";

    if(inputJSON.head[pipette].axis == "a") { // A is center
      channel = "Center";
    } else if(inputJSON.head[pipette].axis == "b") { // B is left
      channel = "Left";
    }

//    var channel = inputJSON.head[pipette].axis; // find the channel that this pipette is attached to
    PIPETTES[channel] = pipette;
  }

  for(var channel in PIPETTES){ // go through and set each channel
    var divName = "pipette-" + channel;
    var pip_divs = document.getElementsByClassName(divName);

    if(!PIPETTES[channel]){
      for(var i=0; i<pip_divs.length;i++){
        pip_divs[i].innerHTML = "N/A"; // set name to channel if the variable in PIPETTES is unset
      }
    } else {
      var pipette = PIPETTES[channel];

      for(var i=0; i<pip_divs.length;i++){
        if(pip_divs[i].classList.contains("shortform")){
          pip_divs[i].innerHTML = channel + ": " + pipette; // no real difference between shortform and regular since changing to left/center
        } else {
          pip_divs[i].innerHTML = channel + ": " + pipette; // set the text to the new name
        }
      }
    }
  }
}

function setPipetteContainers(inputJSON, pipettes){ // blanks out containers based on their use with each pipette

  var containerUsage = {};

  for(var location in pipettes){
    if(pipettes[location]){
      containerUsage[pipettes[location]] = {}; // if pipette isn't null, set containerUsage to an empty hash for that pipette
    }
  }

  var headItems = inputJSON.head; // hash of pipettes
  var instructions = inputJSON.instructions; // list of instructions

  // populages containerUsage with the containers each pipette uses
  for(var i=0; i<instructions.length; i++){

    var tool = instructions[i].tool;
    var groups = instructions[i].groups;

    //add trash, tiprack to each pipette
    var trash = ""
    if (typeof headItems[tool]["trash-container"][0] === 'string'){
      trash = headItems[tool]["trash-container"][0];
    }else{
      trash = headItems[tool]["trash-container"].container;
    }
    console.log('trash: '+trash);
    containerUsage[tool][trash] = true; //add trash container

    var tipracks = headItems[tool]["tip-racks"];
    for(var j=0; j<tipracks.length; j++){ //add all tipracks
      console.log('tipracks['+j+']: '+tipracks[j])
      if (typeof tipracks[j] == 'string'){
        containerUsage[tool][tipracks[j]] = true;
        console.log('containerUsage['+tool+']['+tipracks[j]+'] = '+containerUsage[tool][tipracks[j]]);
      }else{
        containerUsage[tool][tipracks[j].container] = true;
        console.log('containerUsage['+tool+']['+tipracks[j].container+'] = '+containerUsage[tool][tipracks[j].container]);
      }

      console.log('tipracks[j]: '+tipracks[j]);
    }

    //go through to add each liquid container
    for(var j=0; j<groups.length; j++){
      var move = groups[j];

      for(var key in move){

        var action = move[key];

        // go through each instruction type and fish around for the "container" section
        if(key == "transfer"){
          for(var k=0; k<action.length; k++){
            containerUsage[tool][action[k].from.container] = true; // container exists for this pipette
            containerUsage[tool][action[k].to.container] = true;
          }

        } else if(key == "distribute"){
          containerUsage[tool][action.from.container] = true;

          for(var k=0; k<action.to.length; k++){
            containerUsage[tool][action.to[k].container] = true;
          }

        } else if(key == "consolidate"){
          for(var k=0; k<action.from.length; k++){
            containerUsage[tool][action.from[k].container] = true;
          }
          containerUsage[tool][action.to.container] = true;

        } else if(key == "mix"){
          for(var k=0; k<action.length; k++){
            containerUsage[tool][action[k].container] = true;
          }
        }
      }
    }
  }

  var containers = document.getElementById("containerMenu").children[0].children; //get the row elements corresponding to the containers

  // go through containers displayed and cut out the "save" buttons accordingly
  for(var i=0; i<containers.length; i++){

    var rowBlocks = containers[i].children;

    rowBlocks[1].children[0].style.display = 'inline-block'; //make both visible by default
    rowBlocks[1].children[1].style.display = 'inline-block';
    //rowBlocks[1].children[2].style.display = 'inline-block';
    rowBlocks[2].children[0].style.display = 'inline-block';
    rowBlocks[2].children[1].style.display = 'inline-block';
    //rowBlocks[2].children[2].style.display = 'inline-block';


    var name = rowBlocks[0].innerHTML;
    console.log('name: '+name);

    if(pipettes["Left"] != false){ // pipette exists
      if(!(name in containerUsage[pipettes["Left"]])) { // containerUsage does not contain this key for this pipette
        console.log('not found LEFT!');
        rowBlocks[1].children[0].style.display = 'none';
        rowBlocks[1].children[1].style.display = 'none';
        rowBlocks[1].children[2].style.display = 'none';
      }
    } else {
      rowBlocks[1].children[0].style.display = 'none';
      rowBlocks[1].children[1].style.display = 'none';
      rowBlocks[1].children[2].style.display = 'none';
    }

    if(pipettes["Center"] != false){ // pipette exists
      if(!(name in containerUsage[pipettes["Center"]])) { // containerUsage does not contain this key for this pipette
        console.log('not found CENTER!');
        rowBlocks[2].children[0].style.display = 'none';
        rowBlocks[2].children[1].style.display = 'none';
        rowBlocks[2].children[2].style.display = 'none';
      }
    } else {
      rowBlocks[2].children[0].style.display = 'none';
      rowBlocks[2].children[1].style.display = 'none';
      rowBlocks[2].children[2].style.display = 'none';
    }

  }

}


function console_log(string){ // makeshift "console" - console div is currently commented out in index.html
  var console = document.getElementById("console");
  console.innerHTML += string + "<br>";
}




/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function setupPlateInterface() {
  setupDragBox();
  loadDefaultContainers();
}

window.addEventListener('load',setupPlateInterface);

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function setupDragBox(){

  function preventD(e) {
    e.preventDefault();
  }

  var dragDiv = document.getElementById('dragDiv');

  window.addEventListener('dragover', function(e){
    dragDiv.classList.add('tron-blue');
    e.preventDefault();
  }, false);
  window.addEventListener('dragenter', function(e){
    dragDiv.classList.add('tron-blue');
    e.preventDefault();
  }, false);
  window.addEventListener('dragleave', function(e){
    dragDiv.classList.remove('tron-blue');
    e.preventDefault();
  }, false);

  window.addEventListener('drop', function(e){
    e.preventDefault();
    dragDiv.classList.remove('tron-blue');
    loadFile(e);
  }, false);

  window.addEventListener('dragover', preventD, false);
  window.addEventListener('dragenter', preventD, false);
  window.addEventListener('dragleave', preventD, false);
  window.addEventListener('drop', preventD, false);
}

////////
////////
////////

var CURRENT_PROTOCOL = undefined;
var _FILENAME = undefined;
var TIPRACKS = {'a':[],'b':[]}; // tip rack origin is just first tiprack in list

function loadFile(e) {
  var files = e.dataTransfer.files; // FileList object.

  if(files[0]){
    var _F = files[0];
    TIPRACKS = {'a':[],'b':[]}; // clear tipracks
    _FILENAME = _F.name;

    document.getElementById('fileName').innerHTML = _FILENAME.split('.')[0];

    var reader = new FileReader();

    reader.onload = function(e){

      var tempProtocol = undefined;

      try{
        var tempProtocol = JSON.parse(reader.result);
      }
      catch(err){
        tempProtocol = undefined;
        console.log(err);
        alert(err.message);
      }

      if(tempProtocol) {

        setPipetteNames(tempProtocol); // set the names of the pipettes in the container table
        //if we find the info generate html elements
        if(tempProtocol.deck && tempProtocol.head && tempProtocol.instructions && tempProtocol.ingredients) {

          document.getElementById('runButton').disabled = false;
          document.getElementById('runButton').classList.add('tron-red');

          CURRENT_PROTOCOL = tempProtocol;
          for (var k in tempProtocol.head){
            console.log('the k: ',k);
            console.log('the head:')
            console.log(tempProtocol.head)
            ax = tempProtocol.head[k].axis;
            if (tempProtocol.head[k]['tip-racks']){
              console.log("there be tip-racks: "+tempProtocol.head[k]['tip-racks']);
              if (tempProtocol.head[k]['tip-racks'].length > 0){
                for (var n in tempProtocol.head[k]['tip-racks']){
                  console.log('tip-rack['+n+': '+tempProtocol.head[k]['tip-racks'][n])
                  if (typeof tempProtocol.head[k]['tip-racks'][n] === 'string'){
                    TIPRACKS[ax].push(tempProtocol.head[k]['tip-racks'][n])
                  }else{
                    TIPRACKS[ax].push(tempProtocol.head[k]['tip-racks'][n].container)
                  }
                }
                console.log("TIPRACKS[",ax,"] = ",TIPRACKS[ax]);
              }
            }

          }
          show_robot_new_info();
          configureHead(tempProtocol.head)


          document.getElementById('runButton').removeEventListener('click',createAndSend);
          document.getElementById('runButton').addEventListener('click',createAndSend);


          if(tempProtocol.info){
            document.getElementById('infoName').innerHTML= "<strong>File Name:</strong> "+ tempProtocol.info.name;
            document.getElementById('infoDate').innerHTML= "<strong>Date Created:</strong> "+ tempProtocol.info['create-date'];
            document.getElementById('infoVersion').innerHTML= "<strong>Version:</strong> "+ tempProtocol.info.version;
            document.getElementById('infoDesc').innerHTML= "<strong>Description:</strong> " + tempProtocol.info.description;
            document.getElementById('infoRun').innerHTML= "<strong>Run Notes:</strong> " + tempProtocol.info['run-notes'];

          }else if(!tempProtocol.info){
            document.getElementById('infoDesc').innerHTML="";
          }
        }
      }
      else { // if the files messed up, current_protocol is undefined
        CURRENT_PROTOCOL = undefined;
      }
    }
    reader.readAsText(_F);
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function show_robot_new_info() {

  // first, tell it the new containers we're using in this protocol

  var socketMsg = {
    'type' : 'createDeck',
    'data' : CURRENT_PROTOCOL.deck
  }

  sendMessage(socketMsg);

}

function configureHead(data) {
  var socketMsg = {
    'type' : 'configureHead',
    'data' : data
  }

  sendMessage(socketMsg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function createAndSend () {
  if(CURRENT_PROTOCOL) {

    var robotProtocol;
    var throwError = false;

    for(var toolname in CURRENT_PROTOCOL.head) {
      var thisAxis = CURRENT_PROTOCOL.head[toolname].axis;
      var calibratedVolume = robotState.pipettes[thisAxis].volume;
      if(calibratedVolume>0) {
        CURRENT_PROTOCOL.head[toolname].volume = calibratedVolume;
      }
      if(isNaN(CURRENT_PROTOCOL.head[toolname].volume) || CURRENT_PROTOCOL.head[toolname].volume<=0) {
        throwError = true;
      }
    }

    if(throwError) {
      alert('Please calibrate pipette volumes before running');
    }
    else {

      try {
        robotProtocol = createRobotProtocol(CURRENT_PROTOCOL);
      }
      catch (error) {
        console.log(error);
        alert(error);
      }

      if(robotProtocol) {

        var d = new Date();
        var dateString = '';

        dateString += d.getDate();
        dateString += '-';
        dateString += d.getMonth();
        dateString += '-';
        dateString += d.getFullYear();
        dateString += '-';
        dateString += d.getHours();
        dateString += ':';
        dateString += d.getMinutes();
        dateString += ':';
        dateString += d.getSeconds();

        var savefilename = _FILENAME.split('.')[0] + '-' + dateString + '.json';

        var blob = new Blob([JSON.stringify({
          'time' : dateString,
          'protocol' : CURRENT_PROTOCOL,
          'executable' : robotProtocol
        },undefined,2)], {type: "text/json;charset=utf-8"});

        var shouldSave = confirm('File processed. Save it to disk?');

        if(shouldSave) saveAs(blob, savefilename);

        var jobMsg = {
          'type' : 'instructions',
          'data' : robotProtocol
        }

        var shouldRun = confirm(`Send file to be run?\n\nDouble check:\nNo Tip on Pipette - Tubes Open - Tip Racks Full - Modules On`);

        if(shouldRun) {
          timeSentJob = new Date().getTime();
          sendMessage(jobMsg);
        }
        else {
          var shouldInfinity = confirm('Send file to be run FOR INFINITY?!?!?!?!?!');
          if(shouldInfinity) {
            jobMsg.type = 'infinity';
            sendMessage(jobMsg);
          }
          else {
            timeSentJob = undefined;
          }
        }
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function loadDefaultContainers() {

  function onContainers () {
    try {
      var blob = JSON.parse(this.responseText);
      var newContainers = blob.containers;
      //console.log('newContainers...');
      //console.log(newContainers);
      if (newContainers) {
        saveContainers(newContainers);
      }
    }
    catch(error) {
      console.log(error);
    }
  }

    var containersFilepath = './data/containers.json';

  getAJAX(containersFilepath,onContainers);
}

////////
////////
////////

var labware_from_db  = {};

function saveContainers(newContainers) {
  for(var n in newContainers) {
    console.log('newContainer n = '+n);
    var cont = newContainers[n];
    var stringedCont = undefined;
    try {
      stringedCont = JSON.stringify(cont);
      //console.log('stringedCont');
      //console.log(stringedCont)
    }
    catch (error) {
      console.log(error);
    }
    if(cont.locations && stringedCont) {
      //console.log('saving cont '+cont+' to labware_from_db');
      labware_from_db[n] = stringedCont;
    }
  }
}

////////
////////
////////

function getAJAX(filepath,callback) {
  var oReq = new XMLHttpRequest();
  oReq.onload = callback;
  oReq.open("get", filepath, true);
  oReq.send();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////
