/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var globalConnection;
var robotStatus = false;

window.addEventListener ('load', function () {

  // Initialize the server/router url based off where this file came from
  var wsuri;
  if (document.location.origin == "file://") {
    wsuri = "ws://127.0.0.1:8080/ws";
  } else {
    wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" + document.location.host + "/ws";
  }

  // Initialize the WAMP connection to the Router
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "ot_realm"
  });

  // Make connection accessible across the entire document
  globalConnection = connection;

  connection.onclose = function () {
    setStatus('Warning: Browser not connected to the server','red');
  };

  // When we open the connection, subscribe and register any protocols
  connection.onopen = function(session) {
    setStatus('Browser connected to server','rgb(27,225,100)');
  
    // Subscribe and register all function end points we offer from the 
    // javascript to the other clients (ie python)

    connection.session.subscribe('com.opentrons.robot_ready', function(status){
      console.log('robotReady called');
      console.log('robotStatus: '+robotStatus);
      console.log('status: '+status);
      if((robotStatus==false) && (status==true)){
        console.log('going to send calibration request');
      }
      var msg = {
        'type' : 'calibrate',
        'data' : ''
      };
      console.log('msg stringified... '+JSON.stringify(msg));
      connection.session.publish('com.opentrons.browser_to_robot', [JSON.stringify(msg)]);
      robotStatus = status;
    });

    connection.session.publish('com.opentrons.browser_ready', [true]);

    connection.session.subscribe('com.opentrons.robot_to_browser', function(str) {
      try{
        var msg = JSON.parse(str);
        if(msg.type && socketHandler[msg.type]) socketHandler[msg.type](msg.data);
        else console.log('error handling message (1): '+str);
      } catch(error) {
        console.log('error handling message (2)');
        console.log(error);
      }
    });
  };
  connection.open();
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var theContainerLocations = {};
var highestSpot = 5;
var connection = 'offline'

function handleContainers (newContainers) {

  for(var axis in newContainers){
    try{
      theContainerLocations[axis] = newContainers[axis];
    }catch(err){
      console.log(err);
      theContainerLocations[axis] = newContainers[axis];
    }
  }

  var containerMenu = document.getElementById('containerMenu').children[0];
  var kidOptions = containerMenu.children;

  // remove all containers from containerMenu 
  // that are not in theContainerLocations.a
  // why only a, what about b???
  for(var k = 0; k < kidOptions.length; k++) {
    var oldKidName = kidOptions[k].children[0].innerHTML;
    if(!theContainerLocations.a[oldKidName]) {
      containerMenu.removeChild(kidOptions[k]);
      k--;
    }
  }

  highestSpot = 99999;
  for(var nameA in theContainerLocations.a) {
    var foundIt = false;
    for(var k = 0; k < kidOptions.length; k++) {
      if(kidOptions[k].children[0].innerHTML===name) {
        foundIt = true;
        break;
      }
    }
    if(!foundIt) {
      for(var nameB in theContainerLocations.b) {
        for(var l = 0; l < kidOptions.length; l++) {
          if(kidOptions[l].children[0].innerHTML===nameB) {
            foundIt = true;
            break;
          }
        }
      }
    }
    if(!foundIt) {
      var tempRow = document.createElement('tr');
      var tempDatum = document.createElement('td');

      var clickEvent = (function(){
        var option = tempDatum;
        return function(e) {
          selectContainer(option);
        }
      })();

      tempDatum.addEventListener('click',clickEvent);

      var containerOption = document.createElement('option');
      tempDatum.value = nameA;
      tempDatum.innerHTML = nameA;

      
      tempRow.appendChild(tempDatum);
      containerMenu.appendChild(tempRow);
    }

    if(theContainerLocations.a[nameA].z < highestSpot){
      highestSpot = theContainerLocations.a[nameA].z;
      console.log('highestSpot('+nameA+'-a.1):'+highestSpot)
      console.log('theContainerLocations.a['+nameB+'] = '+theContainerLocations.a[nameA].z)
    }
    if(theContainerLocations.b[nameB].z < highestSpot){
      highestSpot = theContainerLocations.b[nameB].z;
      console.log('highestSpot('+nameB+'-b.1):'+highestSpot)
      console.log('theContainerLocations.b['+nameB+'] = '+theContainerLocations.b[nameB].z)
    }
  }

  
  for(var name in theContainerLocations.b) {
    var foundIt = false;
    for(var k = 0; k < kidOptions.length; k++) {
      if(kidOptions[k].children[0].innerHTML===name) {
        foundIt = true;
        break;
      }
    }
    if(!foundIt) {
      var tempRow = document.createElement('tr');
      var tempDatum = document.createElement('td');

      var clickEvent = (function(){
        var option = tempDatum;
        return function(e) {
          selectContainer(option);
        }
      })();

      tempDatum.addEventListener('click',clickEvent);

      var containerOption = document.createElement('option');
      tempDatum.value = name;
      tempDatum.innerHTML = name;
      tempRow.appendChild(tempDatum);
      containerMenu.appendChild(tempRow);
    }

    if(theContainerLocations.b[name].z < highestSpot){
      highestSpot = theContainerLocations.b[name].z;
      console.log('highestSpot('+name+'-b.2):'+highestSpot)
      console.log('theContainerLocations.b['+name+'] = '+theContainerLocations.b[name].z)
    }

  }


  console.log('highestSpot(1):'+highestSpot)
  if(highestSpot>200) {
    highestSpot = 5;
  }
  console.log('highestSpot(2):'+highestSpot)
  if(highestSpot<5) {
    highestSpot = 5;
  }
}

////////////
////////////
////////////

var currentSelectedContainer = undefined;

function selectContainer(currentDiv) {

  if(currentSelectedContainer) {
    currentSelectedContainer.classList.remove('tron-grey');
  }

  if(currentDiv) {
    currentSelectedContainer = currentDiv;
    currentSelectedContainer.classList.add('tron-grey');

    var axis = ['a','b'];
    var coords = ['x','y','z'];

    for(var i=0;i<axis.length;i++) {
      for(var n=0;n<coords.length;n++) {
        var val = theContainerLocations[axis[i]][currentSelectedContainer.value][coords[n]];

        if(val!=null) val = val.toFixed(1);
        else val = 'none';
        document.getElementById('containerpos_'+coords[n]+'_'+axis[i]).innerHTML = val;
      }
    }
  }
  else {
    currentSelectedContainer = undefined;
  }
}

////////////
////////////
////////////

function saveContainer (axis) {

  var contName = currentSelectedContainer.value;

  calibrateContainer(axis, contName);

  setTimeout(function(){
    selectContainer(currentSelectedContainer);
  },500);
}

////////////
////////////
////////////

function movetoContainer (axis) {
  var contName = currentSelectedContainer.value;
  
  var thisLoc = theContainerLocations[axis][contName];
  
  if(!isNaN(thisLoc.x) && !isNaN(thisLoc.y) && !isNaN(thisLoc.z)) {

    var moveArray = [];

    moveArray.push({
      'z' : 0
    });
    moveArray.push({
      'x' : thisLoc.x,
      'y' : thisLoc.y
    });
    moveArray.push({
      'z' : thisLoc.z
    });

    var msg = {
      'type' : 'move',
      'data' : moveArray
    }
    
    sendMessage(msg);
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var lineCount = 0;
var lineLimit = 500; // If this number is too big bad things happen

var socketHandler = {
  'smoothie' : (function(){

    var previousMessage = undefined;

    return function (data) {

      if(data.string!==previousMessage) {

        if(data.string.indexOf('{')>=0){
          try {
            var coordMessage = JSON.parse(data.string);
            if(!isNaN(coordMessage.x)) {
              document.getElementById('position_x').innerHTML = coordMessage.x.toFixed(1);
              robotState.x = coordMessage.x;
            }
            if(!isNaN(coordMessage.y)) {
              document.getElementById('position_y').innerHTML = coordMessage.y.toFixed(1);
              robotState.y = coordMessage.y;
            }
            if(!isNaN(coordMessage.z)) {
              document.getElementById('position_z').innerHTML = coordMessage.z.toFixed(1);
              robotState.z = coordMessage.z;
            }
            if(!isNaN(coordMessage.a)) {
              document.getElementById('position_a').innerHTML = coordMessage.a.toFixed(1);
              robotState.a = coordMessage.a;
            }
            if(!isNaN(coordMessage.b)) {
              document.getElementById('position_b').innerHTML = coordMessage.b.toFixed(1);
              robotState.b = coordMessage.b;
            }
          }
          catch(e) {
            console.log(e);
          }
        }

        previousMessage = data.string;

        var printer = document.getElementById('print');

        var brk = document.createElement('br');
        printer.appendChild(brk);

        var span = document.createElement('span');

        if(data.string.indexOf('-->')>=0) {
          span.style.color = 'red';
        }
        
        lineCount++;
        span.innerHTML = lineCount+': ';
        span.innerHTML += data.string;
        printer.appendChild(span);

        var h = printer.scrollHeight;
        printer.scrollTop = h;

        while(printer.childElementCount > lineLimit ){
          printer.removeChild(printer.firstChild);
        }
      }
    }
  })(),

  'coordinates' : function (data) {
    console.log(data);
  },
  'status' : function (data) {
    setStatus(data.string,data.color);
  },
  'pipetteValues' : function (data) {
    for(var axis in data) {
      robotState.pipettes[axis].top = data[axis].top || robotState.pipettes[axis].top;
      robotState.pipettes[axis].bottom = data[axis].bottom || robotState.pipettes[axis].bottom;
      robotState.pipettes[axis].blowout = data[axis].blowout || robotState.pipettes[axis].blowout;
      robotState.pipettes[axis].droptip = data[axis].droptip || robotState.pipettes[axis].droptip;
      robotState.pipettes[axis].volume = data[axis].volume || robotState.pipettes[axis].volume;

      try{
        document.getElementById('pipetteVolume_'+axis).innerHTML = robotState.pipettes[axis].volume.toFixed(2);
      }
      catch(e){}
    }
  },
  'containerLocations' : function (data) {
    handleContainers(data);
  },
  'refresh' : function(data) {
    refresh();
  },
  'finished' : function(data) {
    var now = new Date().getTime();
    var difference = now - timeSentJob;
    var seconds = Math.floor(difference/1000)%60;
    var minutes = Math.floor(difference/(1000*60));
    alert('Job finished in '+minutes+' minutes, '+seconds+' seconds');
  },
  'networks' : function(data) {
    alert(JSON.stringify(data));
  },
  'wifi_ip' : function(data) {
    if(data==""){
      document.getElementById('wifi_ip').innerHTML = '[none]';
    }else{
      document.getElementById('wifi_ip').innerHTML = data;
    }
  },
  'eth_ip' : function(data) {
    if(data==""){
      document.getElementById('eth_ip').innerHTML = '[none]';
    }else{
      document.getElementById('eth_ip').innerHTML = data;
    }
  },
  'wifi_essid' : function(data) {
    if(data==""){
      document.getElementById('wifi_essid_span').innerHTML = '[none]';
    } else {
      document.getElementById('wifi_essid_span').innerHTML = data;
    }
  },
  'connection' : function(data) {
    connection=data;
  }
};

var timeSentJob = undefined;

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function sendMessage (msg) {
  console.log('sendMessage('+msg+')');
  try{
    console.log('msg: '+JSON.stringify(msg))
  } catch(e) {

  }
  try{
    globalConnection.session.publish('com.opentrons.browser_to_robot',[JSON.stringify(msg)]);
  } catch(e){
    console.log(e)
  }
  /*if(msg && socket && socket.isOpen) {
    socket.send(JSON.stringify(msg));
  }*/
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function setStatus (string,color) {
  if (string) {
    document.getElementById('status').innerHTML = string;
    document.getElementById('status').style.color = color;
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var robotState = {
  'x' : 0,
  'y' : 0,
  'z' : 0,
  'a' : 0,
  'b' : 0,
  'pipettes' : {
    'a' : {
      'top' : 0,
      'bottom' : 0,
      'blowout' : 0,
      'droptip' : 0,
      'volume' : 200 // defaults to 200uL, why not?
    },
    'b' : {
      'top' : 0,
      'bottom' : 0,
      'blowout' : 0,
      'droptip' : 0,
      'volume' : 200
    }
  },
  'stat' : 0
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function home (axis) {

  if(!axis) axis = {
    'x' : true,
    'y' : true,
    'z' : true,
    'a' : true,
    'b' : true
  };

  var msg = {
    'type' : 'home',
    'data': axis
  };

  sendMessage(msg);
}

////////////
////////////
////////////

function pause () {

  var msg = {
    'type' : 'pauseJob'
  };

  sendMessage(msg);
}

////////////
////////////
////////////

function resume () {

  var msg = {
    'type' : 'resumeJob'
  };

  sendMessage(msg);
}

////////////
////////////
////////////

function erase () {

  var msg = {
    'type' : 'eraseJob'
  };

  document.getElementById('fileName').innerHTML = '[empty]';
  document.getElementById('runButton').disabled = true;
  document.getElementById('runButton').classList.remove('tron-red');

  CURRENT_PROTOCOL = undefined;

  sendMessage(msg);
}

////////////
////////////
////////////

function setSpeed (axis,value) {

  var div = document.getElementById('speed_'+axis);
  if(div){
    value = value || div.value;
    if(!value) {
      if(axis==='a' || axis==='b') value = 300;
      else value = 3000;
    }
    var msg = {
      'type' : 'speed',
      'data' : {
        'axis' : axis,
        'value' : value
      }
    };

    sendMessage(msg);
  }
}

////////////
////////////
////////////

function calibrate (axis, property) {

  var msg = {
    'type' : 'calibrate',
    'data' : {
      'axis' : axis,
      'property' : property
    }
  };

  sendMessage(msg);

  if(robotState.pipettes[axis] && !isNaN(robotState.pipettes[axis][property])) {
    robotState.pipettes[axis][property] = robotState[axis];

    if(property==='blowout') {
      robotState.pipettes[axis]['bottom'] = robotState.pipettes[axis]['blowout'] - 2;
    }
  }
}

////////////
////////////
////////////

function movePipette(axis,property) {

  setSpeed(axis);

  var msg = {
    'type' : 'movePipette',
    'data' : {
      'axis' : axis,
      'property' : property
    }
  };

  sendMessage(msg);
}

function shakePipette(axis) {
  sendMessage({
    'type' : 'movePlunger',
    'data' : {
      'axis' : axis,
      'locations' : [
        {
          'speed' : 500
        },
        {
          'plunger' : '1'
        },
        {
          'a' : '1',
          'relative' : true
        },
        {
          'plunger' : 'resting'
        },
        {
          'speed' : 300
        }
      ]
    }
  });
}

////////////
////////////
////////////

var slotPositions = {
  'numbers' : {
    '1' : 320,
    '2' : 190,
    '3' : 50
  },
  'letters' : {
    'A' : 20,
    'B' : 120,
    'C' : 220,
    'D' : 320,
    'E' : 360
  }
}

function moveSlot(slotName) {
  var letter = slotName.charAt(0);
  var number = slotName.charAt(1);

  var yPos = slotPositions.numbers[number];
  var xPos = slotPositions.letters[letter];

  if(xPos && yPos) {

    var moveArray = [];

    moveArray.push({
      'z' : 0
    });
    moveArray.push({
      'x' : xPos,
      'y' : yPos
    });

    var msg = {
      'type' : 'move',
      'data' : moveArray
    }

    sendMessage(msg);
  }
}

////////////
////////////
////////////

function moveVolume (axis) {
  var volumeMenu = document.getElementById('volume_'+axis);
  var volume = volumeMenu ? volumeMenu.value : undefined;

  console.log(volume);

  if(volume) {

    volume *= -1; // negative because we're just sucking up right now

    // deduce the percentage the plunger should move to
    var totalPipetteVolume = robotState.pipettes[axis].volume;
    if(!totalPipetteVolume) totalPipetteVolume = 200;
    if(!isNaN(totalPipetteVolume)) {
      var plungerPercentage = volume / totalPipetteVolume;

      console.log('moving to '+plungerPercentage);

      sendMessage({
        'type' : 'movePlunger',
        'data' : {
          'axis' : axis,
          'locations' : [
            {
              'z' : -20,
              'relative' : true
            },
            {
              'speed' : 300
            },
            {
              'plunger' : 'blowout'
            },
            {
              'plunger' : .95
            },
            {
              'z' : 20,
              'relative' : true
            },
            {
              'plunger' : 1
            },
            {
              'speed' : 300
            },
            {
              'plunger' : 1 + plungerPercentage // say 1+ because we're backing off from 1 right now
            }
          ]
        }
      });
    }
    else {
      alert('Please calibrate pipette volume first');
    }
  }
}


////////////
////////////
////////////

function saveVolume (axis) {

  var volumeMenu = document.getElementById('volume_'+axis);
  var volume = volumeMenu ? volumeMenu.value : undefined;

  if(volume) {

    // find the percentage we've moved between "bottom" and "top"
    var totalDistance = robotState.pipettes[axis].bottom - robotState.pipettes[axis].top;
    var distanceFromBottom = robotState.pipettes[axis].bottom - robotState[axis];
    var percentageFromBottom = distanceFromBottom / totalDistance;

    console.log('saved at '+percentageFromBottom);

    // determine the number of uL this pipette can do based of percentage
    var totalVolume = volume / percentageFromBottom;

    if(!isNaN(totalVolume) && totalVolume>0) {

      console.log('pipetteVolume_'+axis);
      document.getElementById('pipetteVolume_'+axis).innerHTML = totalVolume.toFixed(2);
      robotState.pipettes[axis].volume = totalVolume;

      sendMessage({
        'type':'saveVolume',
        'data': {
          'volume':totalVolume,
          'axis':axis
        }
      });
    }
    else  {
      alert('error saving new volume, check the pipette\'s coordinates');
    }
  }
}

////////////
////////////
////////////

function pickupTip(axis) {
  if(CURRENT_PROTOCOL && CURRENT_PROTOCOL.head) {
    for(var pipetteName in CURRENT_PROTOCOL.head) {
      if(CURRENT_PROTOCOL.head[pipetteName].axis===axis) {
        var plungeAmount = CURRENT_PROTOCOL.head[pipetteName]['tip-plunge'] || 0;

        var msg = {
          'type' : 'step',
          'data' : [
            {'z': plungeAmount},
            {'z': -1*plungeAmount},
            {'z': plungeAmount},
            {'z': -1*plungeAmount},
            {'z': plungeAmount},
            {'z': -1*plungeAmount}
          ]
        };

        sendMessage(msg);
      }
    }
  }
  else {
    alert('Load a protocol file before using "Pickup-Tip"');
  }
}

////////////
////////////
////////////

function calibrateContainer (axis, containerName) {
  if ('ab'.indexOf(axis)>=0) {
    var msg = {
      'type' : 'calibrate',
      'data' : {
        'axis' : axis,
        'property' : containerName
      }
    };

    sendMessage(msg);
  }
}

////////////
////////////
////////////

function step (axis, multiplyer) {
  var msg = {
    'type' : 'step',
    'data' : {}
  };

  setSpeed(axis);

  var allAxis = 'xyzab';

  console.log("multiplyer is: "+multiplyer)
  console.log("it's a number? "+!isNaN(multiplyer))

  if(axis && !isNaN(multiplyer) && allAxis.indexOf(axis) >= 0) {
    var stepSize;
    if(axis==='a' || axis==='b') stepSize = document.getElementById('stepSize_ab').value;
    else stepSize = document.getElementById('stepSize_xyz').value;
    console.log('stepSize is '+stepSize)
    if(!isNaN(stepSize)) {
      stepSize *= multiplyer;
      console.log("new stepSize: "+stepSize)
      msg.data[axis] = stepSize;
      sendMessage(msg);
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function sendDebugCommand () {
  var text = document.getElementById('debugCommandInput').value;

  var msg = {
    'type' : 'raw',
    'data' : text
  };

  document.getElementById('debugCommandInput').value = '';

  sendMessage(msg);
}

function updateCommand () {
  var ssid = document.getElementById('ssidInput').value;
  var pwd = document.getElementById('pwdInput').value;

  var msg = {
    'type' : 'update',
    'data' : {
      'ssid' : ssid,
      'password' : pwd
    }
  };
  var popupBlock = document.getElementById('popUpDiv');
  while(popupBlock.firstChild){
    popupBlock.removeChild(popupBlock.firstChild);
  }
  var updaterLabel = document.createElement('span');
  popupBlock.appendChild(updaterLabel);
  updaterLabel.innerHTML = "TRYING TO UPDATE...\r\nthis page will automatically refresh in 60 seconds";

  setTimeout(function(){refresh();},60000);

  sendMessage(msg);
}

function refresh () {
  window.location.reload();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

// ADDED FOR CONFIGURATION PAGE MOCKUP

function selectMode() {
  // Interface stuff
}

function setWifiMode() {
  var mode = document.getElementById('wifiSelect').value;
  var ssid = document.getElementById('ssid_input').value;
  var pswd = document.getElementById('passphrase_input').value;
  var msg = {
    'type' : 'wifimode',
    'data' : {
      'mode' : mode,
      'ssid' : ssid,
      'pswd' : pswd
    }
  };
  sendMessage(msg);
}

function scanWIFI() {
   var msg = {
      'type' : 'wifiscan',
      'data' : {}
   };
   sendMessage(msg);
}

function changeHostname() {
  var hostname = document.getElementById('hostname_input').value;
  if(hostname.length>0) {
    var msg = {
      'type' : 'hostname',
      'data' : hostname
    };
    sendMessage(msg);
  }
}

function reboot(){
  var msg = {
    'type' : 'reboot'
  };
  sendMessage(msg);
}

function poweroff(){
  var msg = {
    'type' : 'poweroff'
  };
  sendMessage(msg);
}

function update(data){
  var msg = {
    'type' : 'update',
    'data' : data
  };
  sendMessage(msg);
}

function setConnection (string,color) {
  if (string) {
    document.getElementById('connection').innerHTML = string;
    document.getElementById('connection').style.color = color;
  }
  setTimeout(checkConnection, 10000);
}

function checkConnection () {
  if connection !== 'online'{
    setConnection('offline', 'red');
  } else {
    setConnection('online', 'green');
  }
}