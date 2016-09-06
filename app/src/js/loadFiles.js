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
  loadContainers('./data/containers.json');

  var userContainerFiles = remote.app.getUserJSONFiles();

  for (var i = 0; i < userContainerFiles.length; i++) {
    var filepath = userContainerFiles[i];
    loadContainers(filepath);
  }

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

const remote = require("electron").remote

window.addEventListener('load',function(){
  document.getElementById('ot_app_version').innerHTML = remote.app.getVersion()
});

function loadFile(e) {
  var files = e.dataTransfer.files; // FileList object.

  if(files[0]){
    var _F = files[0];

    _FILENAME = _F.name;

    console.log(_FILENAME);

    document.getElementById('fileName').innerHTML = _FILENAME.split('.')[0];

    var reader = new FileReader();

    reader.onload = function(e){
      const fs = require("fs")
      const path = require("path")
      const protocol_path = remote.app.getPath('userData') + "/otone_data/protocol.json";

      fs.writeFile(protocol_path, reader.result, function (err) {
        if(err){
          alert("An error ocurred saving the protocol:\n\n "+ err.message)
        }
      });

      var tempProtocol = undefined;

      try{
        var extensionsArray = _FILENAME.split('.');
        var extension = extensionsArray[extensionsArray.length-1];

        if(extension=='json'){
          tempProtocol = JSON.parse(reader.result);
        }
        else if(extension=='csv'){
          tempProtocol = convert_csv_to_json(reader.result);
        }
      }
      catch(err){
        tempProtocol = undefined;
        console.log(err);
        alert(err.message);
      }

      if(tempProtocol) {

        TIPRACKS = {'a':[],'b':[]}; // clear tipracks

        setPipetteNames(tempProtocol); // set the names of the pipettes in the container table
        //if we find the info generate html elements
        if(tempProtocol.deck && tempProtocol.head && tempProtocol.instructions && tempProtocol.ingredients) {

          document.getElementById('runButton').disabled = false;
          document.getElementById('runButton').classList.add('tron-blue');

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
          configureHead(tempProtocol.head);

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

var shouldInfinity = false;

function handleKeyboardEvent(e){
  keyboardState = e;
  if(e.shiftKey){
    shouldInfinity = true
  }
  else {
    shouldInfinity = false
  }
}

window.addEventListener("keydown", handleKeyboardEvent, false);
window.addEventListener("keypress", handleKeyboardEvent, false);
window.addEventListener("keyup", handleKeyboardEvent, false);

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function createAndSend () {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

        // var shouldSave = confirm('File processed. Save it to disk?');

        // if(shouldSave) saveAs(blob, savefilename);

        var jobMsg = {
          'type' : 'instructions',
          'data' : robotProtocol
        }

        var confirmation_text = '';

        if(shouldInfinity){
          confirmation_text += '\nWARNING: Protocol will run on loop\n'
          confirmation_text += '\nTo cancel at any time, press Cancel\n';
        }
        else{
          confirmation_text += '\nMake sure:\n';
          confirmation_text += '\n      -';
          confirmation_text += 'No Tip on Pipette';
          confirmation_text += '\n      -';
          confirmation_text += 'Tubes Open';
          confirmation_text += '\n      -';
          confirmation_text += 'Tip Racks Full';
          confirmation_text += '\n      -';
          confirmation_text += 'Modules On';
          confirmation_text += '\n\n';
          confirmation_text += 'Proceed to run protocol?';
        }


        var shouldRun = confirm(confirmation_text);

        if(shouldRun) {
          if(shouldInfinity) {
            jobMsg.type = 'infinity';
          }
          sendMessage(jobMsg);
          timeSentJob = new Date().getTime();

          document.getElementById('runButton').disabled = true;
          document.getElementById('runButton').classList.remove('tron-blue');
        }

        shouldInfinity = false;
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function loadContainers(containersFilepath) {

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
      var filename = containersFilepath.split('/');
      alert('Syntax error in containers file: '+filename[filename.length-1]);
    }
  }

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

function convert_csv_to_json(filetext) {

  var line_array = filetext.split('\n');

  var current_ingredients = {};
  var current_deck = {
    'trash' : {
      'labware' : 'point'    // always have 1 trash container
    }
  };
  var current_head = {};
  var current_instructions = [];

  var pipette_template = {
    "tool" : "pipette",
    "tip-racks" : [          // tipracks are added after all tips are counted below
    ],
    "trash-container" : {
      "container" : "trash"
    },
    "multi-channel" : false,
    "axis" : undefined,      // axis is set by the CSV
    "volume" : undefined,    // volume can remain unchanged by the file
    "down-plunger-speed" : 300,
    "up-plunger-speed" : 500,
    "tip-plunge" : 7,
    "extra-pull-volume" : 0.5,
    "extra-pull-delay" : 1,
    "distribute-percentage" : 0.1,
    "points" : []
  }

  var pipette_transfer_count = {};

  // get all pipettes and their axis
  // get all containers and labware type

  for(var i=0; i<line_array.length; i++) {
    if (line_array[i].trim().charAt(0) != '#') {

      let cells = line_array[i].split(',');

      if (cells[0].trim().toLowerCase() == 'pipette') {
        const pname = cells[1].trim();
        current_head[pname] = JSON.parse(JSON.stringify(pipette_template));
        current_head[pname].axis = cells[2].trim().toLowerCase();
        current_head[pname].volume = robotState.pipettes[current_head[pname].axis].volume || 200

        pipette_transfer_count[pname] = 0;
      }
      else if (cells[0].trim().toLowerCase() == 'container') {
        const cname = cells[1].trim();
        current_deck[cname] = {
          'labware' : cells[2].trim()
        };
      }
    }
  }


  var instruction_template = {
    'tool': 'p10-single',
    'groups': []
  };

  var current_pipette = undefined;
  var current_group = undefined;

  for(var i=0; i<line_array.length; i++) {
    var cells = line_array[i].split(',');
    if(cells.length>6) {
      if(cells[0].trim().indexOf('#')==0) {
      }
      if(cells[0].trim().toLowerCase()=='pipette') {
      }
      if(cells[0].trim().toLowerCase()=='container') {
      }
      else {

        var pname = cells[6].trim();
        var volume = Number(cells[4].trim());
        var dWell = cells[3].trim().toUpperCase();
        var dPlate = cells[2].trim();
        var sWell = cells[1].trim().toUpperCase();
        var sPlate = cells[0].trim();

        if(volume>0 && !isNaN(pipette_transfer_count[pname])) {

          // count how many transfers this pipette will do
          pipette_transfer_count[pname]++;

          if (pname != current_pipette) {
            // if we changed pipette, make a new instruction for it
            current_instructions.push({
              'tool' : pname,
              'groups' : [{
                'transfer': []
              }]
            });

            current_group = current_instructions[current_instructions.length-1]['groups'][0]['transfer']
          }
          current_pipette = pname;

          current_group.push({
            "from": {
              "container": sPlate,
              "location": sWell
            },
            "to": {
              "container": dPlate,
              "location": dWell
            },
            "volume": volume,
            "blowout" : true
          });
        }
      }
    }
  }

  for (var pip in current_head) {
    if(pipette_transfer_count[pip] > 0) {
      var total_plates = Math.floor(pipette_transfer_count[pip]/96) + 1
      for(var p=0; p<total_plates; p++) {
        var tiprack_name = 'tiprack_'+pip+'_'+(p+1);
        current_deck[tiprack_name] = {
          'labware' : 'tiprack-200ul'      // there is no dimensional difference between our tipracks
        }
        current_head[pip]['tip-racks'].push({
          'container' : tiprack_name
        });
      }
    }
  }

  var new_protocol = {
    'deck' : current_deck,
    'head' : current_head,
    'ingredients' : current_ingredients,
    'instructions' : current_instructions
  }

  //console.log(JSON.stringify(new_protocol,undefined,2));

  return new_protocol;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////
