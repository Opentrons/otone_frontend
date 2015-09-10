/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

/*

  This script receives the human-readable auto-protocol file, and creates the job-file from it.
  The job-file is then sent to the OT-One NodeJS script (app.js) to be run.

  Currently, the human-readable file is manually entered into a .json file, and dragged into the webpage.

  Creating the job-file is a combination of 4 different sections, all working together.
  These sections are specified in the human-readable file fed into this script.

    1) DECK - each container's labware type and variable-name
    2) HEAD - current pipettes, what axis their attached to, and their properties
    3) INGREDIENTS - initial locations and amounts for each ingredient in the protocol
    4) INSTRUCTIONS - lists of commands, and their individual parameters

  The first thing is script does is create a representation deck.
  Using the pre-loaded 'labware_from_db' object, it maps out each location (well)
    relative to it's container (containers are defined in the DECK section).

  It then uses the INGREDIENTS section to fill these representational wells,
    and calculates the current height (mm) of the liquids surface.

  This script then loops through all instructions, creating the coordinates the ot-one will iterate through.
  Each instruction uses a specific pipette (which must have been defined in the HEAD section)
    and has an array of commands called 'groups'.

*/


debug = true;
/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function createRobotProtocol (protocol) { // 'protocol' is the human-readable json object

  /*

    1) create representation of wells (coordinates & current volume)

  */

  /////////

  // function for creating one of our virtual locations (wells)

  function createLiquidLocation (location) {

    location['current-liquid-volume'] = 0;
    location['current-liquid-offset'] = 0;

    /////////

    location.updateVolume = function (ingredientVolume) {

      // then carry on as normal with linear calculation
      this['current-liquid-volume'] += ingredientVolume;
      var heightRatio = this['current-liquid-volume'] / this['total-liquid-volume'];
      if(!isNaN(heightRatio)) {
        location['current-liquid-offset'] = this.depth - (this.depth * heightRatio);
      }
    }

    /////////

  }

  /////////

  var _deck = {};

  for(var variableName in protocol.deck) {
    var _container = {};

    var labwareName = protocol.deck[variableName].labware.trim();

    _container.labware = labwareName;

    if(labware_from_db && labware_from_db[labwareName]) {

      _container.locations = JSON.parse(labware_from_db [labwareName]).locations;

      if(_container.locations) {

        for(var locationName in _container.locations) {
          var currentLocation = _container.locations[locationName];
          if(currentLocation['total-liquid-volume']) {
            createLiquidLocation (currentLocation);
          }
        }
      }
    }
    else throw '"'+labwareName+'" not found in labware definitions';
    _deck[variableName] = _container;
  }

  /*

    2) Now add the starting ingredients to those created locations (wells)

  */

  for(var ingredientName in protocol.ingredients) {
    var ingredientPartsArray = protocol.ingredients[ingredientName];

    ingredientPartsArray.forEach(function (ingredientPart) {

      if(ingredientPart.container && _deck[ingredientPart.container]) {
        var allLocations = _deck[ingredientPart.container].locations;
        if(ingredientPart.location && allLocations[ingredientPart.location]) {
          var currentLocation = allLocations[ingredientPart.location];
          var ingredientVolume = ingredientPart.volume;

          if(!isNaN(ingredientVolume) && currentLocation.updateVolume) {

            // add the starting ingredients to their locations
            currentLocation.updateVolume(ingredientVolume);
          }
        }
      }
    });
  }

  /*

    3) Give the pipettes access to the deck, so they can do .pickupTip() and .dropTip();

  */

  var _pipettes = {};

  for(var toolName in protocol.head) {
    _pipettes[toolName] = JSON.parse(JSON.stringify(protocol.head[toolName]));

    _pipettes[toolName]['current-plunger'] = 0;

    if(isNaN(_pipettes[toolName]['down-plunger-speed'])) _pipettes[toolName]['down-plunger-speed'] = 300;
    if(isNaN(_pipettes[toolName]['up-plunger-speed'])) _pipettes[toolName]['up-plunger-speed'] = 600; 

    if(isNaN(_pipettes[toolName]['distribute-percentage'])) _pipettes[toolName]['distribute-percentage'] = 0;
    if(_pipettes[toolName]['distribute-percentage'] < 0) _pipettes[toolName]['distribute-percentage'] = 0;
    if(_pipettes[toolName]['distribute-percentage'] > 1) _pipettes[toolName]['distribute-percentage'] = 1;

    if(_pipettes[toolName].points) {
      // an array of objects, each object has a "f1" and an "f2" volume number
      // take the old points, and sort them in accending order
      _pipettes[toolName].points.sort(
        function (a,b) {return a.f1-b.f1;}
      );
    }
    
    var _trashcontainerName = _pipettes[toolName]['trash-container'].container.trim();

    if(_trashcontainerName && _deck[_trashcontainerName]){
      var trashLabware = _deck[_trashcontainerName].labware;
      if(trashLabware) {
        _pipettes[toolName]['trash-container'].locations = JSON.parse(labware_from_db[trashLabware]).locations;
      }
    }
    else {
      throw '"'+_trashcontainerName+'" not found in deck';
    }

    var _tipracks = _pipettes[toolName]['tip-racks'];

    if(_tipracks) {

      for(var _rack in _tipracks) {

        var _rackParams = _tipracks[_rack];
        _rackParams['clean-tips'] = [];
        _rackParams['dirty-tips'] = [];

        var containerName = _rackParams.container.trim();
        var labwareName = _deck[containerName].labware.trim();

        if(labware_from_db[labwareName]) {
          // copy over all locations
          var _locations = JSON.parse(labware_from_db[labwareName]).locations;
          for(var locName in _locations) {
            _rackParams['clean-tips'].push(_locations[locName]);
          }
        }
        else {
          throw '"'+labwareName+'" not found in labware definitions';
        }
      }

      /////////
      /////////
      /////////

      _pipettes[toolName].pickupTip = function () {

        var myRacks = this['tip-racks'];

        this.justPickedUp = true;

        // pull out the first clean tip, in any of our racks
        // and move it over the the 'dirty-tips' array
        var newTipLocation;
        var newTipContainerName;
        for(var i=0;i<myRacks.length;i++) {
          if(myRacks[i]['clean-tips'].length) {
            var howManyTips = this['multi-channel'] ? 8 : 1;
            if(isNaN(howManyTips)) howManyTips = 1;
            newTipLocation = myRacks[i]['clean-tips'].splice(0,1)[0];
            newTipContainerName = myRacks[i].container;
            myRacks[i]['dirty-tips'].push(JSON.parse(JSON.stringify(newTipLocation)));

            // for when we're using a multi-channel, get rid of of the older tips
            for(var n=0;n<howManyTips-1;n++) {
              var tempTip = myRacks[i]['clean-tips'].splice(0,1)[0];
              if(tempTip!=undefined){
                myRacks[i]['dirty-tips'].push(JSON.parse(JSON.stringify(tempTip)));
              }
            }
            break;
          }
        }

        // if we couldn't find a tip, copy over dirty tips to be clean ones
        // this assumes a human will be there to resupply new tips to the now 'dirty' locations
        if(!newTipLocation) {
          for(var i=0;i<myRacks.length;i++) {
            myRacks[i]['clean-tips'] = myRacks[i]['dirty-tips'];
            myRacks[i]['dirty-tips'] = [];
          }

          newTipLocation = myRacks[0]['clean-tips'].splice(0,1)[0];
          newTipContainerName = myRacks[0].container;
          myRacks[0]['dirty-tips'].push(JSON.parse(JSON.stringify(newTipLocation)));
        }

        var moveArray = [];

        // now use the tip location, go over there, and grab the tip

        moveArray.push({
          'z' : 0
        });

        this['current-plunger'] = 0; // reset the plunger's current state

        moveArray.push({
          'plunger' : 'resting'
        });

        moveArray.push({
          'x' : newTipLocation.x,
          'y' : newTipLocation.y,
          'container' : newTipContainerName
        });

        for(var i=0;i<3;i++) {

          moveArray.push({
            'z' : newTipLocation.z-(this['tip-plunge']), // push down to grab the tip
            'container' : newTipContainerName
          });

            moveArray.push({
            'z' : newTipLocation.z+1, // go one millimeter above location
            'container' : newTipContainerName
          });
        }

        return moveArray;
      };

      /////////
      /////////
      /////////

      /////////
      /////////
      /////////

      _pipettes[toolName].dropTip = function () {

        var moveArray = [];

        // move to the trash location, and droptip
        var trashContainerName = this['trash-container'].container;

        var trashLocation;
        for(var o in this['trash-container'].locations) {
          trashLocation = this['trash-container'].locations[o];
          break;
        }

        moveArray.push({
          'z' : 0
        });

        this['current-plunger'] = 0; // reset the plunger's current state
        moveArray.push({
          'plunger' : 'resting'
        });

        moveArray.push({
          'x' : trashLocation.x,
          'y' : trashLocation.y,
          'container' : trashContainerName
        });

        moveArray.push({
          'z' : trashLocation.z, // add one millimeter
          'container' : trashContainerName
        });

        moveArray.push({
          'plunger' : 'droptip'
        });

        return moveArray;
      };

      /////////
      /////////
      /////////
    }
  }

  /*

    4) Make array of instructions, to hold commands and their individual move locations

  */
  
  var createdInstructions = []; // an instruction is for one specific tool

  var _instructions = protocol.instructions;

  // first make the plunger go up and down for each pipette being used
  for(var toolname in _pipettes) {
    createdInstructions.push({
      'tool' : _pipettes[toolname].tool,
      'groups' : [
        {
          'command': 'pipette',
          'axis': _pipettes[toolname].axis,
          'locations': [
            {
              'plunger' : 'blowout'
            },
            {
              'plunger' : 'resting'
            },
            {
              'plunger' : 'blowout'
            },
            {
              'plunger' : 'resting'
            }
          ]
        }
      ]
    });
  }


  // then add all the instructions from the loaded protocol file
  // parsing each command, and mapping to locations on the deck

  for (var i=0;i<_instructions.length;i++) {

    var currentPipette = _pipettes[_instructions[i].tool];

    if(currentPipette) {

      var newInstruction = {};
      newInstruction.tool = currentPipette.tool;
      newInstruction.groups = [];

      _instructions[i].groups.forEach( function(_group, index) { // loop through each group

        var newGroup;

        if(_group.transfer) {
          newGroup = createPipetteGroup.transfer (_deck, currentPipette, _group.transfer);
        }
        else if(_group.distribute) {
          newGroup = createPipetteGroup.distribute (_deck, currentPipette, _group.distribute);
        }
        else if(_group.consolidate) {
          newGroup = createPipetteGroup.consolidate (_deck, currentPipette, _group.consolidate);
        }
        else if(_group.mix) {
          newGroup = createPipetteGroup.mix (_deck, currentPipette, _group.mix);
        }

        if(newGroup) {
          newInstruction.groups.push(newGroup);
        }
      });
    }

    createdInstructions.push(newInstruction);
  }

  return createdInstructions;

}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var createPipetteGroup = {

  /////////
  /////////
  /////////

  'transfer' : function (theDeck, theTool, transferArray) {

    var createdGroup = {
      'command': 'pipette',
      'axis': theTool.axis,
      'locations': []
    };

    function _addMovements (_temp) {
      createdGroup.locations = createdGroup.locations.concat(_temp);
    }

    var pickupArray = theTool.pickupTip(); // GRAB A NEW TIP BEFORE EACH NEW GROUP
    _addMovements(pickupArray);

    // create a series of move commands to accomplish the transfer described in params
    for(var i=0;i<transferArray.length;i++) {

      var thisTransferParams = transferArray[i];
      var fromParams = thisTransferParams.from;
      var toParams = thisTransferParams.to;
      var volume = thisTransferParams.volume;

      fromParams.volume = volume * -1;
      toParams.volume = volume;

      fromParams['extra-pull'] = thisTransferParams['extra-pull'];

      var fromArray = makePipettingMotion(theDeck, theTool, fromParams, true);
      _addMovements(fromArray);

      var toArray = makePipettingMotion(theDeck, theTool, toParams, false);
      _addMovements(toArray);
    }

    var dropArray = theTool.dropTip(); // DROP THE CURRENT TIP AT THE END OF EACH GROUP
    _addMovements(dropArray);

    return createdGroup;
  },

  /////////
  /////////
  /////////

  'distribute' : function (theDeck, theTool, distributeGroup) {

    var createdGroup = {
      'command': 'pipette',
      'axis': theTool.axis,
      'locations': []
    };

    function _addMovements (_temp) {
      createdGroup.locations = createdGroup.locations.concat(_temp);
    }

    var pickupArray = theTool.pickupTip(); // GRAB A NEW TIP BEFORE EACH NEW GROUP
    _addMovements(pickupArray);

    // create a series of move commands to accomplish the distribute described in params

    // first we much find the total amount of volume we are moving
    // and then assign this total volume to the FROM command
    var toParamsArray = distributeGroup.to;
    var totalPercentage = 0;
    for(var i=0;i<toParamsArray.length;i++) {
      totalPercentage += getPercentage(toParamsArray[i].volume,theTool);
    }

    var totalVolume = theTool.volume * totalPercentage;

    // always add a percentage onto distribute, to compensate for the curve when dispensing
    // defaults to 0%
    if(debug===true) console.log('totalVolume(1): '+totalVolume);
    totalVolume += (totalVolume * theTool['distribute-percentage']);

    if(totalVolume>theTool.volume) totalVolume = Number(theTool.volume);

    if(debug===true) console.log('totalVolume(2): '+totalVolume);

    var fromParams = JSON.parse(JSON.stringify(distributeGroup.from));
    fromParams.volume = totalVolume * -1; // negative because we're sucking up

    fromParams['extra-pull'] = distributeGroup['extra-pull'];

    var tempFromArray = makePipettingMotion(theDeck, theTool, fromParams, true);
    _addMovements(tempFromArray); // adding the FROM well first

    // and then add the TO wells, this must happen after the FROM well, duh
    for(var b=0;b<toParamsArray.length;b++) {
      var tempToArray = makePipettingMotion(theDeck, theTool, toParamsArray[b], false);
      _addMovements(tempToArray);
    }

    // NEVER DO A BLOWOUT WHEN DISTRIBUTING!!

    // if(distributeGroup.blowout) {
    //   _addMovements({'plunger':'blowout'});
    // }

    var dropArray = theTool.dropTip(); // DROP THE CURRENT TIP AT THE END OF EACH GROUP
    _addMovements(dropArray);

    return createdGroup;
  },

  /////////
  /////////
  /////////

  'consolidate' : function (theDeck, theTool, consolidateGroup) {

    var createdGroup = {
      'command': 'pipette',
      'axis': theTool.axis,
      'locations': []
    };

    function _addMovements (_temp) {
      createdGroup.locations = createdGroup.locations.concat(_temp);
    }

    var pickupArray = theTool.pickupTip(); // GRAB A NEW TIP BEFORE EACH NEW GROUP
    _addMovements(pickupArray);

    // create a series of move commands to accomplish the consolidate described in params

    var fromParamsArray = JSON.parse(JSON.stringify(consolidateGroup.from));
    var totalPercentage = 0;

    for(var i=0;i<fromParamsArray.length;i++) {

      var fromParams = fromParamsArray[i];
      totalPercentage += getPercentage(fromParams.volume, theTool);
      fromParams.volume *= -1;

      fromParams['extra-pull'] = consolidateGroup['extra-pull'];

      var tempFromArray = makePipettingMotion(theDeck, theTool, fromParams, i===0);
      _addMovements(tempFromArray);
    }

    var totalVolume = totalPercentage * theTool.volume;

    var toParams = consolidateGroup.to;
    toParams.volume = totalVolume; // positive because we're blowing out

    var tempToArray = makePipettingMotion(theDeck, theTool, toParams, false);
    _addMovements(tempToArray); // adding the TO well last

    var dropArray = theTool.dropTip(); // DROP THE CURRENT TIP AT THE END OF EACH GROUP
    _addMovements(dropArray);

    return createdGroup;
  },

  /////////
  /////////
  /////////

  'mix' : function (theDeck, theTool, mixArray) {

    var createdGroup = {
      'command': 'pipette',
      'axis': theTool.axis,
      'locations': []
    };

    function _addMovements (_temp) {
      createdGroup.locations = createdGroup.locations.concat(_temp);
    }

    var pickupArray = theTool.pickupTip(); // GRAB A NEW TIP BEFORE EACH NEW GROUP
    _addMovements(pickupArray);

    // create a series of move commands to accomplish the transfer described in params
    for(var i=0;i<mixArray.length;i++) {
      var thisParam = JSON.parse(JSON.stringify(mixArray[i]));
      thisParam.volume *= -1; // this is so we accomodate for the moving liquid surface height
      var mixMoveCommands = makePipettingMotion(theDeck, theTool, thisParam, true);
      _addMovements(mixMoveCommands);
    }

    var dropArray = theTool.dropTip(); // DROP THE CURRENT TIP AT THE END OF EACH GROUP
    _addMovements(dropArray);

    return createdGroup;
  }

  /////////
  /////////
  /////////

};

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function makePipettingMotion (theDeck, theTool, thisParams, shouldDropPlunger) {
  var moveArray = [];

  // create the rainbow to the FROM location
  var containerName = thisParams.container;
  if(theDeck[containerName] && theDeck[containerName].locations) {

    var locationPos = theDeck[containerName].locations[thisParams.location];

    // don't update the volume yet if we're doing a MIX command (see below)
    locationPos.updateVolume(Number(thisParams.volume));

    var specifiedOffset = thisParams['tip-offset'] || 0;

    var arriveDepth;

    var bottomLimit = (locationPos.depth - 0.2) * -1; // give it 0.2 mm minimum distance from bottom of well

    if(thisParams['liquid-tracking']===true) {
      arriveDepth = specifiedOffset-locationPos['current-liquid-offset'];
    }
    else {
      arriveDepth = bottomLimit + specifiedOffset;
    }

    if(arriveDepth < bottomLimit) {
      arriveDepth = bottomLimit;
    }

    moveArray.push({
      'speed' : theTool['down-plunger-speed']
    });

    var rainbowHeight = highestSpot - 5;
    if(theTool.justPickedUp) {
      rainbowHeight = 0;
      theTool.justPickedUp = false;
    }
    moveArray.push({
      'z' : rainbowHeight
    });

    // make sure the plunger is all the way up before going down
    if(shouldDropPlunger) {
      theTool['current-plunger'] = 0;
      moveArray.push({
        'plunger' : 'resting'
      });
    }

    moveArray.push({
      'x' : locationPos.x,
      'y' : locationPos.y,
      'container' : containerName,
    });

    // go one mm above the position
    moveArray.push({
      'z' : 1,
      'container' : containerName,
    });

    // then update the plunger's position to go ALMOST all the way down
    // this helps prevent the plunger getting stuck, but will also cause bubbles...
    if(shouldDropPlunger) {
      for(var q=0;q<1;q++) {
        theTool['current-plunger'] = .1;
        moveArray.push({
          'plunger' : theTool['current-plunger']
        });
        theTool['current-plunger'] = .95;
        moveArray.push({
          'plunger' : theTool['current-plunger']
        });
      }
    }

    // then go to the 'liquid-level + offset' position
    moveArray.push({
      'z' : arriveDepth,
      'container' : containerName,
    });

    // then update the plunger's position to go all the way down
    if(shouldDropPlunger) {
      theTool['current-plunger'] = 1;
      moveArray.push({
        'plunger' : theTool['current-plunger']
      });
    }

    // if delay is called, pause before sucking up
    if(!isNaN(thisParams['delay'])) {
      moveArray.push({
        'delay' : thisParams['delay']
      });
    }

    var plungerPercentage = getPercentage(thisParams.volume, theTool);
    var extraPercentage = 0;

    // if it's a mix command, got through each repetition
    // then reset this well's volume to it's orginal level
    if(thisParams.repetitions) {

      locationPos.updateVolume(Number(thisParams.volume * -1)); // undo the volume change we did above

      // then loop through the repetitions, moving the plunger each step
      for(var i=0;i<thisParams.repetitions;i++) {
        moveArray.push({
          'speed' : theTool['up-plunger-speed']
        });
        theTool['current-plunger'] += plungerPercentage;
        moveArray.push({
          'plunger' : theTool['current-plunger']
        });
        moveArray.push({
          'speed' : theTool['down-plunger-speed']
        });
        theTool['current-plunger'] -= plungerPercentage;
        moveArray.push({
          'plunger' : theTool['current-plunger']
        });
      }
    }
    
    // if it's not a mix command, then just pipette it
    else {

      // if we're about to suck up, and 'extra-pull' was set, use it to suck up extra liquid
      if(shouldDropPlunger && theTool['extra-pull-volume'] && thisParams['extra-pull']) {
        extraPercentage = (Number(theTool['extra-pull-volume']) / theTool.volume);
      }

      moveArray.push({
        'speed' : theTool['up-plunger-speed']
      });

      // if "extraPercentage" isn't 0, it's positive, but should be used to pull the plunger negatively (UP)
      theTool['current-plunger'] += (plungerPercentage - extraPercentage);
      if(theTool['current-plunger']<0) theTool['current-plunger'] = 0;
      moveArray.push({
        'plunger' : theTool['current-plunger']
      });

      if(extraPercentage!==0) {

        var delaytime = 200; // default incase a delay wasn't initialized in the 'head'
        if(!isNaN(theTool['extra-pull-delay'])) delaytime = Math.abs(theTool['extra-pull-delay']);

        // let it pause before dispesning the 'extra-pull' liquid
        moveArray.push({
          'delay' : delaytime
        });

        moveArray.push({
          'speed' : theTool['down-plunger-speed']
        });

        // "extraPercentage" is positive, so adding it will push the plunger DOWNWARDS
        theTool['current-plunger'] += extraPercentage;
        moveArray.push({
          'plunger' : theTool['current-plunger']
        });
      }
    }

    if(!isNaN(thisParams['delay'])) {
      moveArray.push({
        'delay' : thisParams['delay']
      });
    }

    moveArray.push({
      'speed' : theTool['down-plunger-speed']
    });

    // go to the top of the well
    moveArray.push({
      'z' : 0,
      'container' : containerName,
    });

    if(thisParams['blowout']) {
      moveArray.push({
        'plunger' : 'blowout'
      });
    }

    // add a touch-tip to get rid of any droplets lefts over
    if(thisParams['touch-tip'] && locationPos['diameter']) {
      moveArray.push({
        'y' : locationPos['diameter'] / 2,
        'relative' : true
      });
      moveArray.push({
        'y' : -locationPos['diameter'],
        'relative' : true
      });
      moveArray.push({
        'y' : locationPos['diameter'] / 2,
        'relative' : true
      });
      moveArray.push({
        'x' : locationPos['diameter'] / 2,
        'relative' : true
      });
      moveArray.push({
        'x' : -locationPos['diameter'],
        'relative' : true
      });
      moveArray.push({
        'x' : locationPos['diameter'] / 2,
        'relative' : true
      });
    }
  }

  return moveArray;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function getPercentage (thisVolume, theTool) {
  var realVolume = Number(thisVolume);
  var absVolume = Math.abs(realVolume);

  var amountToScale = 1;

  if(absVolume && theTool && theTool.points) {
    for(var i=0;i<theTool.points.length-1;i++) {
      // if our abs volume is between this and the next "f1" points, scale it
      if(absVolume>=theTool.points[i].f1 && absVolume<=theTool.points[i+1].f1) {
        var f1Diff = theTool.points[i+1].f1 - theTool.points[i].f1;

        var f1Percentage = (absVolume - theTool.points[i].f1) / f1Diff;

        var lowerScale = theTool.points[i].f1 / theTool.points[i].f2;
        var upperScale = theTool.points[i+1].f1 / theTool.points[i+1].f2;

        amountToScale = ((upperScale - lowerScale) * f1Percentage) + lowerScale;

        break;
      }
    }
  }

  absVolume *= amountToScale;
  if(realVolume<0) absVolume *= -1;

  return absVolume / theTool.volume;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////