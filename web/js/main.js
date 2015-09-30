/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var globalConnection;
var robotStatus = false;
var debug = true;
var verbose = false;
var str_last = "";

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
    checkConnection();
    // Subscribe and register all function end points we offer from the 
    // javascript to the other clients (ie python)

    connection.session.subscribe('com.opentrons.robot_ready', function(status){
      if(debug===true) {
        console.log('robotReady called');
        console.log('robotStatus: '+robotStatus);
        console.log('status: '+status);
        if((robotStatus==false) && (status==true)){
          console.log('going to send calibration request');
       }
      }
      var msg = {
        'type' : 'getContainers'
      };
      if(debug===true) console.log('msg stringified... '+JSON.stringify(msg));
      connection.session.publish('com.opentrons.browser_to_robot', [JSON.stringify(msg)]);
      var msg = {
        'type' : 'getCalibrations'
      };
      if(debug===true) console.log('msg stringified... '+JSON.stringify(msg));
      connection.session.publish('com.opentrons.browser_to_robot', [JSON.stringify(msg)]);
      robotStatus = status;
    });

    if(debug===true) console.log('about to publish com.opentrons.browser_ready TRUE');
    connection.session.publish('com.opentrons.browser_ready', [true]);

    connection.session.subscribe('com.opentrons.robot_to_browser', function(str) {
      try{
        if(debug===true){
          if(verbose===true || str[0]!==str_last){
            console.log('message on com.opentrons.robot_to_browser: '+str[0])
          }
        }
        str_last = str[0];
        var msg = JSON.parse(str);
        if(msg.type && socketHandler[msg.type]) socketHandler[msg.type](msg.data);
        else console.log('error handling message (1): '+str);
        
      } catch(error) {
        console.log('error handling message (2)');
        console.log(error);
      }
    });

    connection.session.subscribe('com.opentrons.robot_to_browser_ctrl', function(str) {
      try{
        var msg = JSON.parse(str);
        if(msg.type && socketHandler[msg.type]) socketHandler[msg.type](msg.data);
        else console.log('error handling message (3): '+str);
      } catch(error) {
        console.log('error handling message (4)');
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
var internetConnection = 'offline';
var conn_timer = 0;

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
    if(!(theContainerLocations.a[oldKidName] || theContainerLocations.b[oldKidName])) {
      containerMenu.removeChild(kidOptions[k]);
      k--;
    }
  }

  highestSpot = 99999;
  for(var nameA in theContainerLocations.a) {

    var foundIt = false;
    for(var k = 0; k < kidOptions.length; k++) {
      if(kidOptions[k].children[0].innerHTML===nameA) {
        foundIt = true;
        break;
      }
    }
    if(!foundIt){
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
      var PA = document.createElement('td');
      var PB = document.createElement('td');


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


      if(theContainerLocations.a[nameA].x!==null && theContainerLocations.a[nameA].y!==null && theContainerLocations.a[nameA].z!==null){
        
        PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:inline-block;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
        <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:inline-block;\" disabled>OD</button>";
      
      } else {
        
        PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:none;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
        <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:none;\" disabled>OD</button>";
      }

      if (nameA in theContainerLocations.b){
        if(theContainerLocations.b[nameA].x!==null && theContainerLocations.b[nameA].y!==null && theContainerLocations.b[nameA].z!==null){

          PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:inline-block;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
          <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:inline-block;\" disabled>OD</button>";

        } else {
          
          PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:none;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
          <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:none;\" disabled>OD</button>";

        }
      }



      
      

      tempRow.appendChild(tempDatum);
      //switched append order to reflect center-left 
      tempRow.appendChild(PB);
      tempRow.appendChild(PA);

      containerMenu.appendChild(tempRow);
    }

    if(theContainerLocations.a[nameA].z < highestSpot) highestSpot = theContainerLocations.a[nameA].z;
    if(theContainerLocations.b[nameA].z < highestSpot) highestSpot = theContainerLocations.b[nameA].z;
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
      var PA = document.createElement('td');
      var PB = document.createElement('td');

      tempDatum.classList.add("col-md-4");
      PA.classList.add("col-md-4");
      PB.classList.add("col-md-4");
      tempDatum.classList.add("col-sm-4");
      PA.classList.add("col-sm-4");
      PB.classList.add("col-sm-4");

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

      if(theContainerLocations.b[name].x!==null && theContainerLocations.b[name].y!==null && theContainerLocations.b[name].z!==null){

        PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:inline-block;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
        <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:inline-block;\" disabled>OD</button>";

      } else {
        
        PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:none;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
        <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:none;\" disabled>OD</button>";

      }

      if (name in theContainerLocations.a){
        if(theContainerLocations.a[name].x!==null && theContainerLocations.a[name].y!==null && theContainerLocations.a[name].z!==null){
         
          PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:inline-block;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
          <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:inline-block;\" disabled>OD</button>";
        
        } else {
          
          PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:none;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button> \
          <button type=\"button\" class=\"btn tron-grey\" onclick=\"overrideDepth();\" style=\"display:none;\" disabled>OD</button>";
        
        }
      }

      tempRow.appendChild(tempDatum);
      //switched append order to reflect center-left 
      tempRow.appendChild(PB);
      tempRow.appendChild(PA);
      containerMenu.appendChild(tempRow);
    }

    if(theContainerLocations.b[name].z < highestSpot){
      highestSpot = theContainerLocations.b[name].z;
      if(debug===true){
        console.log('highestSpot('+name+'-b.2):'+highestSpot);
        console.log('theContainerLocations.b['+name+'] = '+theContainerLocations.b[name].z);
      }
    }

    if(theContainerLocations.b[name].z < highestSpot) highestSpot = theContainerLocations.b[name].z;
  }


  if(debug===true) console.log('highestSpot(1):'+highestSpot)
  if(highestSpot>200) {
    highestSpot = 5;
  }
  if(debug===true) console.log('highestSpot(2):'+highestSpot)
  if(highestSpot<5) {
    highestSpot = 5;
  }
  // call function that cuts out the 'save' buttons for unused containers (defined in loadFiles.js)
  if(CURRENT_PROTOCOL && CURRENT_PROTOCOL.head) {
    setPipetteContainers(CURRENT_PROTOCOL, PIPETTES); // uses global variables CURRENT_PROTOCOL, PIPETTES
  }
}

//////////////////////////////
//////////////////////////////
//////////////////////////////

var currentSelectedContainer = undefined;
var firstTD = undefined;
var secondTD = undefined;

function selectContainer(currentDiv) {

  if(currentSelectedContainer) {
    currentSelectedContainer.classList.remove('tron-grey');
    firstTD = currentSelectedContainer.nextSibling;
    secondTD = firstTD.nextSibling;
    
    console.log(firstTD);
    var moveBtnB = firstTD.lastChild.previousElementSibling.previousElementSibling;
    var saveBtnB = firstTD.firstChild;
    console.log(secondTD);
    var moveBtnA = secondTD.lastChild.previousElementSibling.previousElementSibling;
    var saveBtnA = secondTD.firstChild;

    moveBtnA.disabled = true;
    moveBtnB.disabled = true;
    saveBtnA.disabled = true;
    saveBtnB.disabled = true;

    var resetBtnB = firstTD.lastChild.previousElementSibling;
    var resetBtnA = secondTD.lastChild.previousElementSibling;

    resetBtnB.disabled = true;
    resetBtnA.disabled = true;

    var odBtnB = firstTD.lastChild;
    var odBtnA = secondTD.lastChild;

    odBtnB.disabled = true;
    odBtnA.disabled = true;
  }

  if(currentDiv) {
    currentSelectedContainer = currentDiv;
    currentSelectedContainer.classList.add('tron-grey');
    firstTD = currentSelectedContainer.nextSibling;
    secondTD = firstTD.nextSibling;
    
    var moveBtnB = firstTD.lastChild.previousElementSibling;
    var saveBtnB = firstTD.firstChild;

    var moveBtnA = secondTD.lastChild.previousElementSibling;
    var saveBtnA = secondTD.firstChild;


    moveBtnA.disabled = false;
    moveBtnB.disabled = false;
    saveBtnA.disabled = false;
    saveBtnB.disabled = false;


    
    if(TIPRACKS['a'][0]==currentDiv.value){
      var resetBtnA = secondTD.lastChild.previousElementSibling;
      resetBtnA.disabled = false;
    }
    if(TIPRACKS['b'][0]==currentDiv.value){
      var resetBtnB = firstTD.lastChild.previousElementSibling;
      resetBtnB.disabled = false;
    }
    
    var odBtnB = firstTD.lastChild;
    var odBtnA = secondTD.lastChild;

    odBtnB.disabled = false;
    odBtnA.disabled = false;
    

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function saveContainer (axis) {

  var contName = currentSelectedContainer.value;

  firstTD = currentSelectedContainer.nextSibling;
  secondTD = firstTD.nextSibling;
  
  if(axis == 'a'){
    
    var moveBtn = secondTD.lastChild.previousElementSibling;
    moveBtn.style.display = 'inline-block';
    if(TIPRACKS['a'][0]==contName){
      var resetBtn = secondTD.lastChild;
      resetBtn.style.display = 'inline-block';
    }
  
  } else {

    var moveBtn = firstTD.lastChild.previousElementSibling;
    moveBtn.style.display = 'inline-block';
    if(TIPRACKS['b'][0]==contName){
      var resetBtn = firstTD.lastChild;
      resetBtn.style.display = 'inline-block';
    }

  }

  calibrateContainer(axis, contName);

  setTimeout(function(){
    selectContainer(currentSelectedContainer);
  },500);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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
  'position' : (function(){
    return function (data) {
      console.log(data);
      msg = data.string;
      try {
        var coordMessage = msg;
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
  })(),
  'smoothie' : (function(){

    var previousMessage = undefined;

    return function (data) {

      if(data.string!==previousMessage) {

        /*if(data.string.indexOf('{')>=0){
          msg = data.string.slice(data.string.indexOf('{'));
          try {
            var coordMessage = JSON.parse(msg);
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
        }*/

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
    if(debug===true) console.log(data);
    //just for debugging?
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
        document.getElementById('btn_top_'+axis).style.visibility = "visible"
        document.getElementById('btn_blowout_'+axis).style.visibility = "visible"
        document.getElementById('btn_droptip_'+axis).style.visibility = "visible"
      }
      catch(e){}
    }
  },
  'containers' : function (data) {
    var blob = data;//JSON.parse(data);
    var newContainers = blob.containers;
    console.log('newContainers...');
    console.log(newContainers);
    if (newContainers) {
      saveContainers(newContainers);
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
  'internet' : function(data) {
    conn_timer = 0;
    internetConnection=data;
  },
  'per_data' : function(data) {
    internetConnection=data.internet
    if(data.wifi_essid==""){
      document.getElementById('wifi_essid_span').innerHTML = '[none]';
    }else{
      document.getElementById('wifi_essid_span').innerHTML = data.wifi_essid;
    }
    if(data.wifi_ip==""){
      document.getElementById('wifi_ip').innerHTML = '[none]';
    }else{
      document.getElementById('wifi_ip').innerHTML = data.wifi_ip;
    }
    if(data.eth_ip==""){
      document.getElementById('eth_ip').innerHTML = '[none]';
    }else{
      document.getElementById('eth_ip').innerHTML = data.eth_ip;
    }
  },
  'limit' : function(data) {
    if(debug===true) console.log('limit... '+data.slice(0,4));
    setStatus('Minimum limit switch hit for '+data.slice(-1).toUpperCase()+' axis! Please home the machine.','red');
    var dt1 = new Date();
    var utcDate = dt1.toUTCString();
    if(data.slice(0,4)=="min_"){
      var ax = data;
      alert('Minimum limit switch hit for '+data.slice(-1).toUpperCase()+' axis!\n\nPlease home the machine.\n\n\n\n'+utcDate);
    }
  },
  'progress' : function(data) {
    //not currently being used
    if(debug===true) console.log('making progress... '+data);
  },
  'success' : function(data) {
    setStatus(data,'green');
    alert(data);
  },
  'failure' : function(data) {
    setStatus(data,'red');
    alert(data);
  }
};

var timeSentJob = undefined;

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function sendMessage (msg) {
  if(debug===true) console.log('sendMessage('+msg+')');
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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

function calibrate (axis, property, current) {

  var showMe = current.parentNode.children[1];
  showMe.style.visibility = 'visible';

  var msg = {
    'type' : 'calibratePipette',
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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function moveVolume (axis) {
  var volumeMenu = document.getElementById('volume_testing');
  var volume = volumeMenu ? volumeMenu.value : undefined;

  if(debug===true) console.log('volume '+volume);

  if(volume) {

    volume *= -1; // negative because we're just sucking up right now

    // deduce the percentage the plunger should move to
    var totalPipetteVolume = robotState.pipettes[axis].volume;
    if(!totalPipetteVolume) totalPipetteVolume = 200;
    if(!isNaN(totalPipetteVolume)) {
      var plungerPercentage = volume / totalPipetteVolume;

      if(debug===true) console.log('moving to '+plungerPercentage);

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


/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function saveVolume (axis) {

  var volumeMenu = document.getElementById('volume_testing');
  var volume = volumeMenu ? volumeMenu.value : undefined;

  if(volume) {

    // find the percentage we've moved between "bottom" and "top"
    var totalDistance = robotState.pipettes[axis].bottom - robotState.pipettes[axis].top;
    var distanceFromBottom = robotState.pipettes[axis].bottom - robotState[axis];
    var percentageFromBottom = distanceFromBottom / totalDistance;

    if(debug===true) console.log('saved at '+percentageFromBottom);

    // determine the number of uL this pipette can do based of percentage
    var totalVolume = volume / percentageFromBottom;

    if(!isNaN(totalVolume) && totalVolume>0) {

      if(debug===true) console.log('pipetteVolume_'+axis);
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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function calibrateContainer (axis, containerName) {
  if ('ab'.indexOf(axis)>=0) {
    var msg = {
      'type' : 'calibrateContainer',
      'data' : {
        'axis' : axis,
        'name' : containerName
      }
    };

    sendMessage(msg);
  }
}


function overrideDepth () {
  var contName = currentSelectedContainer.value;

  var thisLoc = theContainerLocations[axis][contName];

  new_depth = robotState.z - thisLoc.z

  var msg = {
    'type' : 'containerDepthOverride',
    'data' : {
      'name' : contName,
      'depth' : new_depth
    }
  };

  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function step (axis, multiplyer) {
  var msg = {
    'type' : 'step',
    'data' : {}
  };

  setSpeed(axis);

  var allAxis = 'xyzab';

  if(debug===true){
    console.log("multiplyer is: "+multiplyer);
    console.log("it's a number? "+!isNaN(multiplyer));
  }

  if(axis && !isNaN(multiplyer) && allAxis.indexOf(axis) >= 0) {
    var stepSize;
    if(axis==='a' || axis==='b') stepSize = document.getElementById('stepSize_ab').value;
    else stepSize = document.getElementById('stepSize_xyz').value;
    if(debug===true) console.log('stepSize is '+stepSize);
    if(!isNaN(stepSize)) {
      stepSize *= multiplyer;
      if(debug===true) console.log("new stepSize: "+stepSize);
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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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
  document.getElementById('ssid_input').value = '';
  document.getElementById('passphrase_input').value = '';
  document.getElementById('wifi_essid_span').innerHTML = '[pending...]'
  document.getElementById('wifi_ip').innerHTML = '[pending...]';
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function scanWIFI() {
   var msg = {
      'type' : 'wifiscan',
      'data' : {}
   };
   sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

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

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function reboot(){
  var msg = {
    'type' : 'reboot'
  };
  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function poweroff(){
  var msg = {
    'type' : 'poweroff'
  };
  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function restart(){
  setStatus('restarting...','blue')
  var msg = {
    'type' : 'restart'
  };
  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function update(data){
  setStatus('updating '+data+'...','blue');
  var msg = {
    'type' : 'update',
    'data' : data
  };
  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function setConnection (string,color) {
  if (string) {
    document.getElementById('connection').innerHTML = string;
    document.getElementById('connection').style.color = color;
  }
  setTimeout(checkConnection, 2000);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function checkConnection () {
  if (internetConnection !== 'online'){
    setConnection('offline', 'red');
    disableUpdateButtons();
  } else {
    if(conn_timer>10){
      setConnection('offline', 'red');
      internetConnection = 'offline'
      disableUpdateButtons();
    }else{
      setConnection('online', 'green');
      enableUpdateButtons();
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function enableUpdateButtons() {
  document.getElementById('updateAllButton').disabled=false
  document.getElementById('updateFirmwareButton').disabled=false
  document.getElementById('updateFrontendButton').disabled=false
  document.getElementById('updateBackendButton').disabled=false
  document.getElementById('updateScriptsButton').disabled=false
}

function disableUpdateButtons() {
  document.getElementById('updateAllButton').disabled=true
  document.getElementById('updateFirmwareButton').disabled=true
  document.getElementById('updateFrontendButton').disabled=true
  document.getElementById('updateBackendButton').disabled=true
  document.getElementById('updateScriptsButton').disabled=true
}

function toggleWiFiMenu() {
  if (document.getElementById('wifi_settings_div').style.display == 'inline-block'){
    document.getElementById('wifi_settings_div').style.display = 'none';
    document.getElementById('hostname_div').style.display = 'none';
  }else{
    document.getElementById('wifi_settings_div').style.display = 'inline-block';
    document.getElementById('hostname_div').style.display = 'inline-block';
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function updatePiConfigs() {
  update('piconfigs');
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function shareInternet(){
  setStatus('sharing internet...','blue');
  var msg = {
    'type' : 'shareinet'
  };
  sendMessage(msg);
}


function relativeCoords(){
  var msg = {
    'type' : 'relativeCoords'
  };
  sendMessage(msg);
}