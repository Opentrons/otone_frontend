import logging


logger = logging.getLogger('app.the_queue')


class TheQueue:
    """TheQueue class-converted from js dict in Planner.js into a python class
    
    TheQueue class is used to hold the array of groups contained in a protocol instruction
    and process them iteratively.
    
    The robot_protocol file is an array of instructions.  
    
    An instruction is an array of groups + a specified tool which executes 
        the group.
        
    A group can be defined as the lifecycle of a tip.  Each group holds
        a single command.
        
    A command is one of the following:
        Transfer; Consolodate; Distribute; Mix
        
    The instructionQueue iteratively selects an instruction in the
        robot_protocol array and passes it to theQueue object along with the
        specified tool(pipette).  The theQueue object iteratively processes 
        the groups in the instruction until theQueue is empty, which triggers
        the InstructionQueue to select the next instruction.  All protocol
        processing stops when the instructionQueue is empty.
        
    TheQueue object holds the groups contained in the instruction in a
        FIFO array called qlist.  When a '{stat:0}' is received from the 
        smoothieAPI object, TheQueue pops off the next group in qlist, passing 
        the command to the smoothieAPI.

    :obj:`qlist` - List that holds the commands

    """
    # 'theQueue' keeps an array of all coordinate messages meant for 'smoothie.js'
    # and places them in a first-in-first-out array
    # when a '{stat:0}' is recieved from 'smoothie.js', theQueue increments to the next in line
    
#Special Methods
    def __init__(self, head, publisher):
        """Initialize TheQueue object 
        """
        self.head = head
        self.paused = False
        self.is_busy = False
        self.current_command = None    #note: could be a function or string?
        self.just_started = False
        self.pubber = publisher
        self.qlist = list()

        
    def __str__(self):
        return "TheQueue"
        
        
#local functions-----------------------
    # this is called when the smoothieboard has successfully received a messages
    # but not yet completed the command
    def sent_successfully(self):
        """Callback to be passed to smoothieAPI (:class:`smoothie_ser2net`) in :class:`head` object
        
        .. note:: NOT ACTUALLY IMPLEMENTED YET
        """
        if self.just_started and self.pubber.on_start and type(self.pubber.on_start) == 'function':
            self.pubber.on_start()

#Fields            
    
    
#Methods
    def pause(self):
        """Pauses TheQueue by setting paused True
        """
        logger.debug('the_queue.pause called')
        if len(self.qlist):
            self.paused = True

        self.head.smoothieAPI.delay_cancel()
            
    def resume(self):
        """Resumes TheQueue by setting paused False and calling :meth:`step`
        """
        logger.debug('the_queue.resume called')
        self.paused = False
        self.step(False)
        
    def add(self,commands):
        """Add a command to TheQueue's :obj:`qlist`
        """
        logger.debug('the_queue.add called')
        if commands and self.paused==False:
            # test to see if the queue is currently empty
#            self.just_started = False   #is this needed?
            if len(self.qlist)==0:
                self.just_started = True
            # add new commands to the end of the queue
            if isinstance(commands, list):
                self.qlist.extend(commands)
            elif isinstance(commands, dict):
                self.qlist.append(commands)
    
            self.step(self.just_started) # attempt to increment the queue


    def step(self,just_started):
        """Pop a command from :obj:`qlist` and process it via smoothieAPI (:class:`smoothie_ser2net`) object in :class:`head`

        """
        logger.debug('the_queue.step called')
        if self.is_busy==False:
            logger.debug('length of the_queue.qlist = {}'.format(len(self.qlist)))
            if len(self.qlist)>0:
                # pull out the first in line from the queue
#                self.current_command = self.qlist.splice(0,1)[0];
                self.current_command = self.qlist.pop(0)
                self.is_busy = True;
                #logger.debug('the_queue.current_command: {}'.format(self.current_command))

                # 'wait' for someone to click a button on interface. Not there yet.
                if 'wait' in self.current_command:
                    self.head.smoothieAPI.wait(self.current_command['wait'], self.sent_successfully)  # WAIT
                
                elif 'delay' in self.current_command:
                    self.head.smoothieAPI.delay(self.current_command['delay'])#, self.sent_successfully)

                elif 'home' in self.current_command:
                    self.head.smoothieAPI.home(self.current_command['home'])#, self.sent_successfully)  # HOME

                elif 'speed' in self.current_command:
                    self.head.smoothieAPI.set_speed(self.current_command['axis'],self.current_command['speed'])
                    
                else:
                    self.head.smoothieAPI.move(self.current_command)	#, self.sent_successfully );      # MOVE

            else:
                if self.pubber.on_finish and hasattr(self.pubber.on_finish,'__call__'):
                    self.pubber.on_finish()

            
    def clear(self):
        """Clear :obj:`qlist`, :obj:`is_busy`, :obj:`paused`, and :obj:`current_command`
        """
        self.qlist = list()
        self.is_busy = False
        self.paused = False
        self.current_command = None   #note: could be a function or string?

        self.head.smoothieAPI.delay_cancel()
        
        
    #from planner.js
    def pause_job(self):
        """Call :meth:`pause`... redundant, consider removing
        """
        #doesn't map to smoothieAPI
        #function pauseJob()
        self.pause()
        
    #from planner.js
    def resume_job(self):
        """Call :meth:`resume`... redundant, consider removing
        """
        #doesn't map to smoothieAPI
        #function resumeJob()
        self.resume()
    
    #from planner.js
    def erase_job(self, data):
        """Call :meth:`clear`... redundant, consider removing, and why does it have unused data parameter???
        """
        #doesn't map to smoothieAPI
        #function eraseJob(){
        self.clear() 
        
        
    #new to eliminate theQueue ref in head
    def kill(self):
        """Kill :class:`head` operation and clear :obj:`qlist`
        """
        self.head.kill()
        self.clear()

    #new to eliminate theQueue ref in head
    def reset(self):
        """Tell :class:`head` to reset and clear :obj:`qlist`
        """
        self.head.reset()
        self.clear()  
        
