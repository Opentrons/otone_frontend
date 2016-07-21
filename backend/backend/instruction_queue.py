import collections
import asyncio
import json
import logging


logger = logging.getLogger('app.instruction_queue')


class InstructionQueue:
    """Holds protocol instructions and starts a job.
    

    The instructionArray file is an array (list) of instructions.  
    
    An instruction is an array (list) of groups + a specified tool which executes 
        the group.
        
    A group can be defined as the lifecycle of a tip.  Each group holds
        a single command.
        
    A command is one of the following:
        Transfer; Consolodate; Distribute; Mix
        
    The instructionQueue iteratively selects an instruction in the
        instructionArray and passes its groups to the :class:`head` object along with the
        specified tool(pipette).  The :class:`head` object uses its theQueue object (:class:`the_queue`)
        to iteratively processes the groups in the instruction until theQueue is empty, which triggers
        the InstructionQueue to select the next instruction.  All protocol
        processing stops when the instructionQueue is empty.
        
    """
#Special Methods
    def __init__(self, head, publisher):
        """Initialize Instruction Queue object
        
        """
        logger.info('instruction_queue.__init__ called')
        self.head = head
        self.isRunning = False
        self.infinity_data = None
        self.pubber = publisher
        
    def __str__(self):
        return "InstructionQueue"
        
#attributes
    instructionArray = []

        
#Methods
    def start_job(self, instructions, should_home):
        """Start the ProtocolRunner job with a givein list of instructions
        """
        logger.info('instruction_queue.start_job called')
        logger.debug('instructions: {}'.format(instructions))
        if instructions and len(instructions):
            self.head.erase_job()
            self.instructionArray = instructions
            logger.debug('instruction_queue: new instructions: {}'.format(self.instructionArray))

            if self.infinity_data is None or should_home == True:
                self.head.home({'x':True,'y':True,'z':True,'a':True,'b':True})
                self.isRunning = True

            else:
                self.ins_step()  #changed name to distinguish from theQueue step function
    
    def start_infinity_job(self, infinity_instructions):
        """Start a job and save instructions to a variable (infinity_data) so they can be perpetually run with :meth:`start_job`
        """
        logger.info('instruction_queue.start_infinity_job called')
        if infinity_instructions and len(infinity_instructions):
            self.infinity_data = json.dumps(infinity_instructions,sort_keys=True,indent=4,separators=(',',': '))
            self.start_job(infinity_instructions, True)

    def erase_job(self):
        """Erase the ProtocolRunner job
        """
        logger.info('instruction_queue.erase_job called')
        self.head.erase_job()
        self.isRunning = False;
        self.instructionArray = []
        
#    def step(self)  #changed name to distinguish from theQueue step function
    def ins_step(self):
        """Increment to the next instruction in the :obj:`instructionArray`
        """
        logger.debug('instruction_queue.ins_step called, len(self.instructionArray): {}'.format(len(self.instructionArray)))
        logger.debug('instruction_queue self.instructionArray: {}'.format(self.instructionArray))
        if len(self.instructionArray)>0:
            #pop the first item in the instructionArray list
            #this_instruction = self.instructionArray.splice(0,1)[0]
            this_instruction = self.instructionArray.pop(0)
            if this_instruction and this_instruction['tool'] == 'pipette':
                self.send_instruction(this_instruction)
        elif self.isRunning == True:
            if self.infinity_data is not None:
                logger.debug('ins_step self.infinity_data: ********************************\n\n')
                logger.debug(self.infinity_data,'\n')
                self.start_job(json.loads(self.infinity_data, object_pairs_hook=collections.OrderedDict),False)
            else:
                self.erase_job()
                self.head.home({'x':True,'y':True,'z':True,'a':True,'b':True})
                self.pubber.finished()

  
    def send_instruction(self,instruction):
        """Execute groups (:meth:`head.pipette`) from the given instruction list one by one
        """
        logger.debug('instruction_queue.send_instruction called')
        logger.debug('instruction: {0}'.format(json.dumps(instruction,sort_keys=True,indent=4,separators=(',',': '))))
        if 'groups' in instruction and len(instruction['groups']):
            for m in instruction['groups']:
                this_group = m
                if this_group['command'] == 'pipette':
                    self.head.pipette(this_group)
                    
