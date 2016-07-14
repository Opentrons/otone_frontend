import json
import logging


logger = logging.getLogger('app.publisher')


class Publisher:
    """Publisher to centralize publishing data and callbacks
    
    later maybe replaced with WAMP
    """


#Special Methods
    def __init__(self, session):
        """Initialize Publisher object
        
        """
        logger.info('publisher.__init__ called')
        self.head = None
        self.runner = None
        self.caller = session


    def __str__(self):
        return "Publisher"


    def set_head(self, head):
        """Set the Publisher's Head
        """
        logger.debug('publisher.set_head called')
        self.head = head


    def set_runner(self, runner):
        """Set the Publisher's ProtocolRunner
        """
        logger.debug('publisher.set_runner called')
        self.runner = runner


#Handlers
    def on_smoothie_connect(self):
        """Publish that Smoothieboard is connected
        """
        logger.debug('publisher.on_smoothie_connect called')
        self.send_message('status', True)

    def on_smoothie_disconnect(self):
        """Publish that Smoothieboard is disconnected and try to reconnect
        """
        logger.debug('publisher.on_smoothie_disconnect called')
        self.send_message('status',False)
        self.head.theQueue.is_busy = False
        
    
    def on_start(self):  #called from planner/theQueue
        """Publish that theQueue started a command
        """
        logger.debug('publisher.on_start called')


    def on_raw_data(self,string):     #called from smoothie/createSerialConnection
        """
        Publish raw data from Smoothieboard
        """
        logger.debug('publisher.on_raw_data called')
        self.send_message('smoothie',{'string':string})


    def on_position_data(self,string):
        """
        Publish position data from Smoothieboard
        """
        logger.debug('publisher.on_position_data called')
        self.send_message('position',{'string':string})


    def on_limit_hit(self,axis):
        """Publish that a limit switch was hit
        """
        logger.debug('publisher.on_limit_hit called')
        self.send_message('limit',axis)
        
    def on_finish(self):     #called from planner/theQueue
        """Publish status and move on to next instruction step
        """
        logger.debug('publisher.on_finish called')

        try:
            self.runner.insQueue.ins_step() #changed name 
        except AttributeError as ae:
            logger.exception('On finish failed')


    def show_delay(self, time_left):
        self.send_message('delay',time_left)


#OTHER DATA NEEDING TO GO BACK TO UI
    def finished(self):
        """Publish that instruction queue finished
        """
        logger.debug('publisher.finished called')
        self.send_message('finished',None)

    def send_message(self,type_,damsg):
        """Send a message
        """
        logger.debug('publisher.send_message called')
        if damsg is not None:
            msg = {
                'type':type_,
                'data':damsg
            }
        else:
            msg = {
                'type':type_
            }
        try:
            self.caller._myAppSession.publish('com.opentrons.robot_to_browser',json.dumps(msg))
        except Exception as e:
            logger.exception("error trying to send_message")

    def send_ctrl_message(self,type_,damsg):
        """Send a Control Message (Similar to Control Transfer in USB), not implemented yet
        """
        logger.debug('publisher.send_ctrl_message called')
        if damsg is not None:
            msg = {
                'type':type_,
                'data':damsg
            }
        else:
            msg = {
                'type':type_
            }
        self.caller._myAppSession.publish('com.opentrons.robot_to_browser_ctrl',json.dumps(msg))

