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
  var wsuri = "ws://127.0.0.1:31947/ws";

  // Initialize the WAMP connection to the Router
  var connection = new autobahn.Connection({
    url: wsuri,
    realm: "ot_realm"
  });

  // Make connection accessible across the entire document
  globalConnection = connection;

  // When we open the connection, subscribe and register any protocols
  connection.onopen = function(session) {
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
        'type' : 'getCalibrations'
      };
      if(debug===true) console.log('msg stringified... '+JSON.stringify(msg));
      connection.session.publish('com.opentrons.browser_to_robot', [JSON.stringify(msg)]);
      robotStatus = status;

      setTimeout(listPorts,1000);
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
        console.log(error.message);
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

  highestSpot = 9999;
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
        <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";
      
      } else {
        
        PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:none;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";
      }

      if (nameA in theContainerLocations.b){
        if(theContainerLocations.b[nameA].x!==null && theContainerLocations.b[nameA].y!==null && theContainerLocations.b[nameA].z!==null){

          PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";

        } else {
          
          PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:none;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";

        }
      }



      
      

      tempRow.appendChild(tempDatum);
      //switched append order to reflect center-left 
      tempRow.appendChild(PB);
      tempRow.appendChild(PA);

      containerMenu.appendChild(tempRow);
    }

    if(CURRENT_PROTOCOL && CURRENT_PROTOCOL.deck && CURRENT_PROTOCOL.head){
      for(var pipName in CURRENT_PROTOCOL.head){
        var pipAxis = CURRENT_PROTOCOL.head[pipName].axis;
        if(pipAxis=='a'){
          for(var name in theContainerLocations[pipAxis]) {
            if(CURRENT_PROTOCOL.deck[name]){
              if(Number(theContainerLocations[pipAxis][name].z) > 0){
                if(theContainerLocations[pipAxis][name].z < highestSpot) {
                  highestSpot = theContainerLocations[pipAxis][name].z;
                  console.log('\n\n\n\nHIGHEST SPOT: '+highestSpot+' from '+pipAxis+' on '+name)
                }
              }
            }
          }
        }
      }
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
        <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";

      } else {
        
        PB.innerHTML = "<button type=\"button\" class=\"btn tron-black\" onclick=\"saveContainer('b');\" disabled>Save</button> \
        <button type=\"button\" class=\"btn tron-black\" onclick=\"movetoContainer('b');\" style=\"display:none;\" disabled>Move To</button> \
        <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";

      }

      if (name in theContainerLocations.a){
        if(theContainerLocations.a[name].x!==null && theContainerLocations.a[name].y!==null && theContainerLocations.a[name].z!==null){
         
          PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";
        
        } else {
          
          PA.innerHTML = "<button type=\"button\" class=\"btn tron-blue\" onclick=\"saveContainer('a');\" disabled>Save</button> \
          <button type=\"button\" class=\"btn tron-blue\" onclick=\"movetoContainer('a');\" style=\"display:none;\" disabled>Move To</button> \
          <button type=\"button\" class=\"btn tron-red\" onclick=\"relativeCoords();\" style=\"display:none;\" disabled>Reset</button>";
        
        }
      }

      tempRow.appendChild(tempDatum);
      //switched append order to reflect center-left 
      tempRow.appendChild(PB);
      tempRow.appendChild(PA);
      containerMenu.appendChild(tempRow);
    }

    if(CURRENT_PROTOCOL && CURRENT_PROTOCOL.deck && CURRENT_PROTOCOL.head){
      for(var pipName in CURRENT_PROTOCOL.head){
        var pipAxis = CURRENT_PROTOCOL.head[pipName].axis;
        if(pipAxis=='b'){
          for(var name in theContainerLocations[pipAxis]) {
            if(CURRENT_PROTOCOL.deck[name]){
              if(Number(theContainerLocations[pipAxis][name].z) > 0){
                if(theContainerLocations[pipAxis][name].z < highestSpot) {
                  highestSpot = theContainerLocations[pipAxis][name].z;
                  console.log('HIGHEST SPOT: '+highestSpot+' from '+pipAxis+' on '+name)
                }
              }
            }
          }
        }
      }
    }
  }

  if(highestSpot>80){
    highestSpot = 80;
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
    var saveBtnB = firstTD.firstChild;
    var moveBtnB = firstTD.firstChild.nextElementSibling;
    console.log(secondTD);
    var saveBtnA = secondTD.firstChild;
    var moveBtnA = secondTD.firstChild.nextElementSibling;
    

    moveBtnA.disabled = true;
    moveBtnB.disabled = true;
    saveBtnA.disabled = true;
    saveBtnB.disabled = true;

    var resetBtnB = moveBtnB.nextElementSibling;
    var resetBtnA = moveBtnA.nextElementSibling;

    resetBtnB.disabled = true;
    resetBtnA.disabled = true;
  }

  if(currentDiv) {
    currentSelectedContainer = currentDiv;
    currentSelectedContainer.classList.add('tron-grey');
    firstTD = currentSelectedContainer.nextSibling;
    secondTD = firstTD.nextSibling;
    
    var saveBtnB = firstTD.firstChild;
    var moveBtnB = firstTD.firstChild.nextElementSibling;
    
    var saveBtnA = secondTD.firstChild;
    var moveBtnA = secondTD.firstChild.nextElementSibling;

    moveBtnA.disabled = false;
    moveBtnB.disabled = false;
    saveBtnA.disabled = false;
    saveBtnB.disabled = false;


    console.log('currentDiv.value: ',currentDiv.value);
    console.log("TIPRACKS['a']: ",TIPRACKS['a']);
    console.log("TIPRACKS['b']: ",TIPRACKS['b']);
    if(TIPRACKS['a'][0]==currentDiv.value){
      var resetBtnA = moveBtnA.nextElementSibling;
      resetBtnA.disabled = false;
    }
    if(TIPRACKS['b'][0]==currentDiv.value){
      var resetBtnB = moveBtnB.nextElementSibling;
      resetBtnB.disabled = false;
    }
    

    var axis = ['a','b'];
    var coords = ['x','y','z'];

    for(var i=0;i<axis.length;i++) {
      for(var n=0;n<coords.length;n++) {
        var val = theContainerLocations[axis[i]][currentSelectedContainer.value][coords[n]];


        if(val!=null) val = val.toFixed(1);
        else val = 0;



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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  var contName = currentSelectedContainer.value;

  firstTD = currentSelectedContainer.nextElementSibling;
  secondTD = firstTD.nextElementSibling;
  
  if(axis == 'a'){
    
    var moveBtn = secondTD.firstChild.nextElementSibling;
    moveBtn.style.display = 'inline-block';
    console.log('TIPRACKS[a][0]: '+TIPRACKS['a'][0]);
    if(TIPRACKS['a'][0]==contName){
      var resetBtn = moveBtn.nextElementSibling;
      resetBtn.style.display = 'inline-block';
    }
  
  } else {

    var moveBtn = firstTD.firstChild.nextElementSibling;
    moveBtn.style.display = 'inline-block';
    console.log('TIPRACKS[b][0]: '+TIPRACKS['b'][0]);
    if(TIPRACKS['b'][0]==contName){
      var resetBtn = moveBtn.nextElementSibling;
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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

var robot_connected = false;

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
  'status' : function (isConnected) {
    if (isConnected===true) {
      robot_connected = true;
      document.getElementById('port_list').innerHTML = '';
      document.getElementById('status').innerHTML = 'Connected';
      document.getElementById('status').style.color = 'rgb(27,225,100)';
      if(current_portname){
        document.getElementById('portname').innerHTML = current_portname + '<span class="caret"></span>';
      }
    }
    else if (isConnected===false) {
      robot_connected = false;
      document.getElementById('port_list').innerHTML = '';
      document.getElementById('status').innerHTML = 'Disconnected';
      document.getElementById('status').style.color = 'red';
      document.getElementById('portname').innerHTML = 'No USB Selected' + '<span class="caret"></span>';
      resetPortList();

      erase();
    }
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
        document.getElementById('btn_bottom_'+axis).style.visibility = "visible"
        document.getElementById('btn_blowout_'+axis).style.visibility = "visible"
        document.getElementById('btn_droptip_'+axis).style.visibility = "visible"
      }
      catch(e){
        console.log(e);
      }
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

    document.getElementById('runButton').disabled = false;
    document.getElementById('runButton').classList.add('tron-red');
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
    var dt1 = new Date();
    var utcDate = dt1.toUTCString();
    if(data.slice(0,4)=="min_"){
      var ax = data;
      alert('Minimum limit switch hit for '+data.slice(-1).toUpperCase()+' axis!\nPlease home the machine.');
    }
  },
  'progress' : function(data) {
    //not currently being used
    if(debug===true) console.log('making progress... '+data);
  },
  'success' : function(data) {
    alert(data);
  },
  'failure' : function(data) {
    alert(data);
  },
  'delay' : function(countdown) {
    var seconds_left = Math.floor(countdown)
    if(seconds_left > 0){
      var temp_minutes = Math.floor(seconds_left / 60);
      var temp_seconds = Math.floor(seconds_left % 60);
      if(temp_minutes < 10) temp_minutes = '0' + temp_minutes;
      if(temp_seconds < 10) temp_seconds = '0' + temp_seconds;
      document.getElementById('countdown').innerHTML = 'Delaying '+temp_minutes+':'+temp_seconds;

      if(seconds_left % 2 == 0){
        document.getElementById('countdown').style.color = '#777';
      }
      else {
        document.getElementById('countdown').style.color = '#337ab7';
      }
    }
    else {
      document.getElementById('countdown').innerHTML = '';
    }
  },
  'portsList' : function(data) {

    setTimeout(function(){

      if(data.length){
        document.getElementById('port_list').innerHTML = 'Found ports';
      }
      else {
        document.getElementById('port_list').innerHTML = 'No ports';
      }
      //document.getElementById('port_list').style.color = 'rgb(100,100,100)';

    }, 250);

    resetPortList();

    var theList = document.getElementById('portsList')

    function add_port_list_element(name, on_click) {
      var newLinkElement = document.createElement('a');
      newLinkElement.innerHTML = name;
      newLinkElement.href = '#';
      newLinkElement.onclick = on_click;

      var newListElement = document.createElement('li');
      newListElement.appendChild(newLinkElement);

      theList.appendChild(newListElement);
    }

    for(var i=0;i<data.length;i++){

      temp_on_click = (function(){
        var tPortName = data[i];
        return function(){
          setPort(tPortName);
        }
      })();

      add_port_list_element(data[i], temp_on_click);
    }
  }
};

var timeSentJob = new Date().getTime();
var current_portname = '';

function setPort(portname){

  if(portname){

    current_portname = portname;
    document.getElementById('portname').innerHTML = current_portname + '<span class="caret"></span>';

    document.getElementById('status').innerHTML = 'Connecting...';
    document.getElementById('status').style.color = 'rgb(100,100,100)';

    var msg = {
      'type' : 'connectPort',
      'data' : current_portname
    };

    sendMessage(msg);
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function sendMessage (msg) {
  if(debug===true) console.log('sendMessage('+msg+')');
  try{
    console.log('msg: '+JSON.stringify(msg))
  } catch(e) {
    console.log(e);
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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  erase();

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

function resetPortList(){
  var theList = document.getElementById('portsList')
  theList.innerHTML = '';

  var newLinkElement = document.createElement('a');
  newLinkElement.innerHTML = '&#8635; refresh';
  newLinkElement.href = '#';
  newLinkElement.onclick = listPorts;

  var newListElement = document.createElement('li');
  newListElement.appendChild(newLinkElement);

  theList.appendChild(newListElement);
}

////////////
////////////
////////////

function listPorts () {

  document.getElementById('port_list').innerHTML = 'Searching...';

  var msg = {
    'type' : 'listPorts'
  };

  sendMessage(msg);
}

////////////
////////////
////////////

function pause () {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  var msg = {
    'type' : 'pauseJob'
  };

  sendMessage(msg);
}

////////////
////////////
////////////

function resume () {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  var msg = {
    'type' : 'resumeJob'
  };

  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function erase () {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  if(CURRENT_PROTOCOL){
    document.getElementById('runButton').disabled = false;
    document.getElementById('runButton').classList.add('tron-red');
  }

  var msg = {
    'type' : 'eraseJob'
  };

  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var fanState = false;

function toggleFan() {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  fanState = !fanState;

  sendMessage({
    'type' : 'fan',
    'data' : {
      'fan' : fanState
    }
  });
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function setSpeed (axis,value) {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

    // if(property==='bottom') {
    //   robotState.pipettes[axis]['blowout'] = robotState.pipettes[axis]['bottom'] + 2;
    // }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function movePipette(axis,property) {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

var is_otPro = false;

function set_is_otPro(_is_otPro){
  is_otPro = _is_otPro;

  var temp_slot_letters = ['a','b','c','d','e'];
  for(var n=0;n<temp_slot_letters.length;n++){
    var temp_id = 'btn-deck-slot-'+temp_slot_letters[n]+'3';
    if(is_otPro){
      document.getElementById(temp_id).style.display = "none";
      document.getElementById('current_deckSize').innerHTML = 'Deck Size: OT.Hood';
    }
    else {
      document.getElementById(temp_id).style.display = "inline-block";
      document.getElementById('current_deckSize').innerHTML = 'Deck Size: OT.One';
    }
  }
}

function moveSlot(slotName) {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  var letter = slotName.charAt(0);
  var number = Number(slotName.charAt(1));

  if(is_otPro) {
    number += 1;
  }

  var yPos = slotPositions.numbers[number+''];
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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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
              'plunger' : 1
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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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


/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function step (axis, multiplyer) {

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

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

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }

  var text = document.getElementById('debugCommandInput').value;

  var msg = {
    'type' : 'raw',
    'data' : text
  };

  document.getElementById('debugCommandInput').value = '';

  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function relativeCoords(){

  if(!robot_connected){
    alert('Please first connect to your machine');
    return;
  }
  
  var msg = {
    'type' : 'relativeCoords'
  };
  sendMessage(msg);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////