import logging


logger = logging.getLogger('app.tool')


class Tool:
    """Tool class which could be a 1 channel pipette, 8ch pipette, grabber, etc
    
    A Tool is a base class intended to be subclassed into specific tool types
    that are attached to the physical moveable head of the robot.  Example
    subclassed tools could be:
    -single channel pipette
    -8 channel pipette
    -plate grabber
    -camera
    """
    
    def __init__(self, toolname, tooltype, axis):
        """Initialize Tool
        
        toolname = the name of the tool (string)
        tooltype = the type of tool e.g. 1ch pipette, 8ch pipette, etc.(string)
        axis = position of tool on head & associated 
                motor (A, B, C, etc) (string)
        offset = the offset in space from the A tool which is defined to
            have offset = (0,0,0)
        """
        self.toolname = toolname
        self.tooltype = tooltype
        self.axis = axis
        self.offset = (0,0,0)
        
        
    def __str__(self):
        return "{0.toolname!r}".format(self)
       
       
    def __repr__(self):
        return "Tool({0.toolname!r},{0.tooltype!r},{0.axis!r})".format(self)
        
#Methods
    def set_offset(self, offset):
        """Set/reset x,y,z offset of a tool relative to A from a calibration procedure
        
        location = a tuple containing the offset in mm
                of the tool relative to the A tool
        """
        self.offset = offset
        return self.offset