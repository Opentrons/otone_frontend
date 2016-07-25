import json
import logging
import os

from file_io import FileIO
from pipette import Pipette
import smoothie_pyserial as openSmoothie
from the_queue import TheQueue


logger = logging.getLogger('app.head')


class Head:
    """A representation of the robot head
    
    The Head class is intended to be instantiated to a head object which
    aggregates the subclassed tool objects and the smoothieAPI object.
    It also hold a references to theQueue and publisher objects.
    Appropriate methods are exposed to allow access to the aggregated object's
    functionality.
    """
    
#Special Methods-----------------------
    #def __init__(self, tools, global_handlers, theQueue):
    def __init__(self, tools, publisher, dir_path):
        """Initialize Head object
        
        tools = dictionary of the tools on the head
        
        """
        logger.info('head.__init__ called')
        self.smoothieAPI = openSmoothie.Smoothie(self)
        self.PIPETTES = {'a':Pipette('a'),'b':Pipette('b')}    #need to create this dict in head setup
        self.tools = tools
        self.pubber = publisher
        self.smoothieAPI.set_raw_callback(self.pubber.on_raw_data)
        self.smoothieAPI.set_position_callback(self.pubber.on_position_data)
        self.smoothieAPI.set_limit_hit_callback(self.pubber.on_limit_hit)
        self.smoothieAPI.set_move_callback(self.pubber.on_start)
        self.smoothieAPI.set_delay_callback(self.pubber.show_delay)
        self.smoothieAPI.set_on_connect_callback(self.pubber.on_smoothie_connect)
        self.smoothieAPI.set_on_disconnect_callback(self.pubber.on_smoothie_disconnect)
        self.theQueue = TheQueue(self, publisher)
        
        self.path = os.path.abspath(__file__)
        self.dir_path = dir_path  
        self.dir_par_path = os.path.dirname(self.dir_path)
        self.dir_par_par_path = os.path.dirname(self.dir_par_path)      

        self.load_pipette_values()
        
    def __str__(self):
        return "Head"
        
    def __repr__(self):
        return "Head({0!r})".format(self.tools.keys())
        
# the current coordinate position, as reported from 'smoothie.js'
    theState = {'x' : 0,'y' : 0,'z' : 0,'a' : 0,'b' : 0}

    # this function fires when 'smoothie.js' transitions between {stat:0} and {stat:1}
    #SMOOTHIEBOARD.on_state_change = function (state) {
    def on_state_change(self, state):
        """Check the given state (from Smoothieboard) and engage :obj:`theQueue` (:class:`the_queue`) accordingly

        If the state is 1 or the state.delaying is 1 then :obj:`theQueue` is_busy,

        else if the state is 0 and the state.delaying is 0, :obj:`theQueue` is not busy, 
        clear the currentCommand for the next one, and if not paused, tell :obj:`theQueue` 
        to step. Then update :obj:`theState`.

        :todo:
        :obj:`theState` should be updated BEFORE the actions taken from given state
        """
        logger.debug('head.on_state_change called')
        
        if state['stat'] == 1 or state['delaying'] == 1:
            self.theQueue.is_busy = True

        elif state['stat'] == 0 and state['delaying'] == 0:
            self.theQueue.is_busy = False
            self.theQueue.currentCommand = None
            if self.theQueue.paused==False:
                self.theQueue.step(False)
    
        self.theState = state
        logger.debug('Head state: {}'.format(self.theState))


#local functions---------------
    def get_tool_type(self, head_tool):
        """Get the tooltype and axis from head_tool dict
        
        :returns: (tool_type, axis)
        :rtype: tuple
        """
        logger.debug('head.get_tool_info called')
        tool_type = head_tool['tool']
        axis = head_tool['axis']
        
        return (tool_type, axis)
        
        
        
#Methods-----------------------
    def configure_head(self, head_data):
        """Configure the head per Head section of protocol.json file
        
        
        :example head_data:

        head_data = dictionary of head data (example below):
            "p200" : {
                "tool" : "pipette",
                "tip-racks" : [{"container" : "p200-rack"}],

                ... or ...
                "tip-racks" : ["p200-rack","some-other-rack"]  <--- preferred array format for JSON


                "trash-container" : {"container" : "trash"},


                ... or ...
                "trash-container" : ["trash"] <--- preferred array format for JSON (although currently only one trash container supported)

                "tip-depth" : 5,
                "tip-height" : 45,
                "tip-total" : 8,
                "axis" : "a",
                "volume" : 160
            },
            "p1000" : {
                "tool" : "pipette",
                "tip-racks" : [{"container" : "p1000-rack"}],
                "trash-container" : {"container" : "trash"},
                "tip-depth" : 7,
                "tip-height" : 65,
                "tip-total" : 8,
                "axis" : "b",
                "volume" : 800
            }
        """
        logger.debug('head.configure_head called')
        logger.debug('\targs: {}'.format(head_data))
        #delete any previous tools in head
        del self.tools
        self.tools = []
        #instantiate a new tool for each name and tool type in the file
        #ToDo - check for data validity before using

        for key in head_data:
            hd = head_data[key]
            #get the tool type to know what kind of tool to instantiate
            tool_type = self.get_tool_type(hd)  #tuple (toolType, axis)
            if tool_type[0] == 'pipette':
                #newtool = Pipette(hd['axis'])
                #pass
                #self.PIPETTES[hd['axis']] = newtool
                setattr(self.PIPETTES[hd['axis']],'tip_racks',hd['tip-racks'])
                if len(hd['tip-racks'])>0:
                    tpOD = hd['tip-racks'][0]
                    if isinstance(tpOD,dict):
                        tpItems = tpOD.items()
                        listTPItems = list(tpItems)
                        setattr(self.PIPETTES[hd['axis']],'tip_rack_origin',listTPItems[0][1])
                    elif isinstance(tpOD,str):
                        setattr(self.PIPETTES[hd['axis']],'tip_rack_origin',tpOD)



                setattr(self.PIPETTES[hd['axis']],'trash_container',hd['trash-container'])
                if 'tip-depth' in hd:
                    setattr(self.PIPETTES[hd['axis']],'tip-depth',hd['tip-depth'])
                if 'tip-height' in hd:
                    setattr(self.PIPETTES[hd['axis']],'tip-height',hd['tip-height'])
                if 'tip-total' in hd:
                    setattr(self.PIPETTES[hd['axis']],'tip-total',hd['tip-total'])
                if 'axis' in hd:
                    setattr(self.PIPETTES[hd['axis']],'axis',hd['axis'])
                if 'volume' in hd:
                    setattr(self.PIPETTES[hd['axis']],'volume',hd['volume'])

            elif tool_type[0] == 'grabber':
                #newtool = Grabber(key,*tool_info)
                pass
            else:
                #ToDo - add error handling here
                pass
        



        self.save_pipette_values()
        self.publish_calibrations()


    def relative_coords(self):
        for axis in self.PIPETTES:
            self.PIPETTES[axis].relative_coords()
        self.save_pipette_values()
        self.publish_calibrations()
        
    #this came from pipette class in js code
    def create_pipettes(self, axis):
        """Create and return a dictionary of Pipette objects

        :returns: A dictionary of pipette objects
        :rtype: dictionary
        
        :note: Seems nothing calls this...

        :todo:
        Is :meth:`create_pipettes` even needed?
        """
        logger.debug('head.create_pipettes called')
        thePipettes = {}
        if len(axis):
            for a in axis:
            #for i in range(0,len(axis)):
                #a = axis(i)
                thePipettes[a] = Pipette(a)
                
        return thePipettes
        
        
    #Command related methods for the head object
    #corresponding to the exposed methods in the Planner.js file
    #from planner.js
    def home(self, axis_dict):   #, callback):
        """Home robot according to axis_dict
        """
        #maps to smoothieAPI.home()
        logger.debug('head.home called, args: {}'.format(axis_dict))
        
        self.smoothieAPI.home(axis_dict)
        
        
    #from planner.js
    def raw(self, string):
        """Send a raw command to the Smoothieboard
        """
        logger.debug('head.raw called')
        #maps to smoothieAPI.raw()
        #function raw(string)
        self.smoothieAPI.raw(string)
        
        
    #from planner.js
    def kill(self):
        """Halt the Smoothieboard (M112) and clear the the object (:class:`the_queue`)
        """
        logger.debug('head.kill called')
        #maps to smoothieAPI.halt() with extra code
        self.smoothieAPI.halt()
        self.theQueue.clear();

    #from planner.js
    def reset(self):
        """Reset the Smoothieboard and clear theQueue object (:class:`the_queue`)
        """
        logger.debug('head.reset called')
        #maps to smoothieAPI.reset() with extra code
        self.smoothieAPI.reset()
        self.theQueue.clear();
        
        
    #from planner.js
    def get_state(self):
        """Get state information from Smoothieboard
        """
        logger.debug('head.get_state called')
        #maps to smoothieAPI.get_state()
        #function get_state ()
        return self.smoothieAPI.get_state()
        
        
        #from planner.js
    def set_speed(self, axis, value):
        """Set the speed for given axis to given value
        """
        logger.debug('head.set_speed called')
        
        #maps to smoothieAPI.set_speed()
        #function setSpeed(axis, value, callback)
        self.smoothieAPI.set_speed(axis, value)
        
        
        #from planner.js
        #function move (locations)
        #doesn't map to smoothieAPI
    def move(self, locations):
        """Moves the head by adding locations to theQueue



        var locations = [location,location,...]

        var location = {
        'relative' : true || false || undefined (defaults to absolute)
        'x' : 30,
        'y' : 20,
        'z' : 10,
        'a' : 20,
        'b' : 32
        }

        """
        logger.debug('head.move called')
        if locations:
            logger.debug('locations: {}'.format(locations))
            self.theQueue.add(locations)
        
    #from planner.js
    #function step (locations)
    #doesn't map to smoothieAPI
    def step(self, locations):
        """Step to the next command in theQueue(:class:`the_queue`) object's qlist

        
        locations = [location,location,...]

        location = {
        'x' : 30,
        'y' : 20,
        'z' : 10,
        'a' : 20,
        'b' : 32
        }
        """
        logger.debug('head.step called')
        logger.debug('locations: {}'.format(locations))
        # only step with the UI if the queue is currently empty
        logger.debug('head:\n\tlen(self.theQueue.qlist): {}'.format(len(self.theQueue.qlist)))
        logger.debug('head:\n\tself.theQueue.is_busy?: {}'.format(self.theQueue.is_busy))
        if len(self.theQueue.qlist)==0: # and self.theQueue.is_busy==False:

            if locations is not None:
                if isinstance(locations,list):
#                    for( i = 0; i < locations.length; i++):
                    for i in range(len(locations)):
                        locations[i]['relative']  = True
                        
                elif ('x' in locations) or ('y' in locations) or ('z' in locations) or ('a' in locations) or ('b' in locations):
                    locations['relative']  = True
                    
                self.move(locations)
         
         
    #from planner.js
    #function pipette(group)
    def pipette(self, group):
        """Run a pipette operation based on a given Group from protocol instructions


        group = {
          command : 'pipette',
          axis : 'a' || 'b',
          locations : [location, location, ...]
        }
    
        location = {
          x : number,
          y : number,
          z : number,
          container : string,
          plunger : float || 'blowout' || 'droptip'
        }
    
        If no container is specified, XYZ coordinates are absolute to the Smoothieboard
        if a container is specified, XYZ coordinates are relative to the container's origin 
        (180 degree rotation around X axis, ie Z and Y +/- flipped)
        
        """
        logger.debug('head.pipette called')
        if group and 'axis' in group and group['axis'] in self.PIPETTES and 'locations' in group and len(group['locations'])>0:
    
            this_axis = group['axis']  
            current_pipette = self.PIPETTES[this_axis]  
    
            # the array of move commands we are about to build from each location
            # starting with this pipette's initializing move commands
            move_commands = current_pipette.init_sequence()
            logger.debug('head.pipette, current_pipette.init_sequence(): {}'.format(current_pipette.init_sequence()))
            logger.debug('head.pipette, move_commands: {}'.format(move_commands))
    
            # loop through each location
            # using each pipette's calibrations to test and convert to absolute coordinates
            for i in range(len(group['locations'])) :
    
                thisLocation = group['locations'][i]  
    
                # convert to absolute coordinates for the specifed pipette axis
                logger.debug('head.pipette:\n\tlocation: {}'.format(thisLocation))
                absCoords = current_pipette.pmap(thisLocation)  
    
                # add the absolute coordinates we just made to our final array
                move_commands.extend(absCoords)  
    
            if len(move_commands):
                move_commands.extend(current_pipette.end_sequence())  
                self.move(move_commands)  
      
    
    #from planner.js
    def calibrate_pipette(self, pipette, property_):
        """Sets the value of a property for given pipette by fetching state information 
        from smoothieboard(:meth:`smoothie_pyserial.get_state`)
        """
        logger.debug('head.calibrate_pipette called')
        #maps to smoothieAPI.get_state() with extra code
        if pipette and self.PIPETTES[pipette]: 
            state = self.smoothieAPI.get_state()
            if property_=='top' or property_=='bottom' or property_=='blowout' or property_=='droptip':
                value = state[pipette]
                self.PIPETTES[pipette].calibrate(property_,value)  
                self.save_pipette_values()


    def calibrate_container(self, pipette, container):   
        """Set the location of a container
        """
        logger.debug('head.calibrate_container called')
        if pipette and self.PIPETTES[pipette]:     
            state = self.smoothieAPI.get_state()
            self.PIPETTES[pipette].calibrate_container(container,state)

             
    def save_volume(self, data):
        """Save pipette volume to otone_data/pipette_values.json
        """
        logger.debug('head.save_volume called')
        if(self.PIPETTES[data.axis] and data.volume is not None and data.volume > 0):
            self.PIPETTES[data.axis].volume = data.volume
            
        self.save_pipette_values()
        
        
    #from planner.js
    def save_pipette_values(self):
        """Save pipette values to otone_data/pipette_values.json
        """
        logger.debug('head.save_pipette_values called')
        pipette_values = {}

        params_to_save = [
            'resting',
            'top',
            'bottom',
            'blowout',
            'droptip',
            'volume',
            'theContainers',
            'tip_racks',
            'trash_container',
            'tip_rack_origin'
        ]

        for axis in self.PIPETTES:
            pipette_values[axis] = {}
            for k, v in self.PIPETTES[axis].__dict__.items():
                # make sure we're only saving what we need from that pipette module
                if k in params_to_save:
                    pipette_values[axis][k] = v

            # should include:
            #  'top'
            #  'bottom'
            #  'blowout'
            #  'droptip'
            #  'volume'
            #  'theContainers'

        filetext = json.dumps(pipette_values,sort_keys=True,indent=4,separators=(',',': '))
        
        filename = os.path.join(self.dir_path,'otone_data/pipette_calibrations.json')

        # save the pipette's values to a local file, to be loaded when the server restarts
        FileIO.writeFile(filename,filetext,lambda: logger.debug('\t\tError saving the file:\r\r'))      


    #from planner.js
    #fs.readFile('./data/pipette_calibrations.json', 'utf8', function (err,data)
    #load_pipette_values()
    def load_pipette_values(self):
        """Load pipette values from data/pipette_calibrations.json
        """
        logger.debug('head.load_pipette_values called')
        old_values = FileIO.get_dict_from_json(os.path.join(self.dir_path,'otone_data/pipette_calibrations.json'))
        logger.debug('old_values:\n')
        logger.debug(old_values)
        
        if self.PIPETTES is not None and len(self.PIPETTES) > 0:
            for axis in old_values:
                #for n in old_values[axis]:
                for k, v in old_values[axis].items():
                    self.PIPETTES[axis].__dict__[k] = v

                    # should include:
                    #  'resting'
                    #  'top'
                    #  'bottom'
                    #  'blowout'
                    #  'droptip'
                    #  'volume'
                    #  'theContainers'
            
            logger.debug('self.PIPETTES[{}]:\n\n'.format(axis))
            logger.debug(self.PIPETTES[axis])
        else:
            logger.debug('head.load_pipette_values: No pipettes defined in PIPETTES')
            
    #from planner.js
    # an array of new container names to be stored in each pipette
    #ToDo: this method may be redundant
    def create_deck(self, new_deck):
        """Create a dictionary of new container names to be stored in each pipette given a deck list

        Calls :meth:`head.save_pipette_values` right before returning dictionary

        :returns: container data for each axis
        :rtype: dictionary
        
        """
        logger.debug('head.create_deck called')
        logger.debug('newDeck: {}'.format(new_deck))
        
        #doesn't map to smoothieAPI
        nameArray = []  

        for containerName in new_deck :
            nameArray.append(containerName) 
        
        response = {}  
        
        for n in self.PIPETTES:
            response[n] = self.PIPETTES[n].create_deck(nameArray)  

        self.save_pipette_values() 
        return response         
            
            
    def get_deck(self):
        """Get a dictionary of container names currently stored in each pipette

        Calls :meth:`head.save_pipette_values` right before returning dictionary

        :returns: container data for each axis
        :rtype: dictionary
        
        """
        logger.debug('head.get_deck called')
        response = {}
        for axis in self.PIPETTES:
            response[axis] = {}
            logger.debug('self.PIPETTES[{0}].theContainers: {1}'.format(axis, self.PIPETTES[axis].theContainers))
            for name in self.PIPETTES[axis].theContainers:
                logger.debug('self.PIPETTES[{0}].theContainers[{1}]'.format(axis, self.PIPETTES[axis].theContainers[name]))
                response[axis][name] = self.PIPETTES[axis].theContainers[name]
  
        self.save_pipette_values()

        logger.debug('head.get_deck response: {}'.format(response))
        return response


    def get_pipettes(self):
        """Get a dictionary of pipette properties for each pipette on head

        :returns: Pipette properties for each pipette
        :rtype: dictionary
        
        """
        logger.debug('head.get_pipettes called')
        response = {}

        for axis in self.PIPETTES:
            response[axis] = {}
            for k, v in self.PIPETTES[axis].__dict__.items():
                response[axis][k] = v
            
            # should include:
            #  'top'
            #  'bottom'
            #  'blowout'
            #  'droptip'
            #  'volume'
        
        logger.debug('head.get_pipettes response: {}'.format(response))
        return response

    #from planner.js
    def move_pipette(self, axis, property_):
        """Move the pipette to one of it's calibrated positions (top, bottom, blowout, droptip)
        
        This command is useful for seeing saved pipette positions while calibrating
        """
        #doesn't map to smoothieAPI
        #function movePipette (axis, property)
        logger.debug('head.move_pipette called')
        logger.debug('axis: {0}, property_: {1}'.format(axis,property_))
        logger.debug('head:\n\tself.PIPETTES[axis].__dict__[{0}] = {1}'.format(property_,self.PIPETTES[axis].__dict__[property_]))
        if self.PIPETTES[axis] and property_ in self.PIPETTES[axis].__dict__:
            moveCommand = {}
            moveCommand[axis] = self.PIPETTES[axis].__dict__[property_]
            logger.debug('moveCommand = {}'.format(moveCommand))
            logger.debug(moveCommand)
            self.move(moveCommand)
            
    
    
    def move_plunger(self, axis, locations):
        """Move the plunger for given axis according to locations

        :note: This is only called from :class:`subscriber` and may be redundant

        locations = [loc, loc, etc... ]

        loc = {'plunger' : number}

        """

        logger.debug('head.move_plunger called')
        logger.debug('locations: {}'.format(locations))

        if(self.PIPETTES[axis]):
            for i in range(len(locations)):
                moveCommand = self.PIPETTES[axis].pmap(locations[i])
                self.move(moveCommand)


    def erase_job(self):
        """Tell theQueue to clear
        """
        logger.debug('head.erase_job called')
        self.smoothieAPI.delay_cancel()
        self.theQueue.clear()


    def publish_calibrations(self):
        """Publish calibrations data
        """
        logger.debug('head.publish_calibrations called')
        self.pubber.send_message('containerLocations',self.get_deck())
        self.pubber.send_message('pipetteValues',self.get_pipettes())
        
