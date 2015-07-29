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

function loadFile(e) {
  var files = e.dataTransfer.files; // FileList object.

  if(files[0]){
    var _F = files[0];

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
      }

      if(tempProtocol) {

        if(tempProtocol.deck && tempProtocol.head && tempProtocol.instructions && tempProtocol.ingredients) {

          document.getElementById('runButton').disabled = false;
          document.getElementById('runButton').classList.add('tron-red');

          CURRENT_PROTOCOL = tempProtocol;

          show_robot_new_info();

          document.getElementById('runButton').removeEventListener('click',createAndSend);
          document.getElementById('runButton').addEventListener('click',createAndSend);
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

        var shouldRun = confirm('Send file to be run?');

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
      if (newContainers) {
        saveContainers(newContainers);
      }
    }
    catch(error) {
      console.log(error);
    }
  }

  var containersFilepath = '/home/pi/otone_data/containers.json';

  getAJAX(containersFilepath,onContainers);
}

////////
////////
////////

var labware_from_db  = {};

function saveContainers(newContainers) {
  for(var n in newContainers) {
    var cont = newContainers[n];
    var stringedCont = undefined;
    try {
      stringedCont = JSON.stringify(cont);
    }
    catch (error) {
      //
    }
    if(cont.locations && stringedCont) {
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