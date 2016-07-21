import logging


class Grabber(Tool):
    """Grabber Class - concept for anticipated future use
    """
    
#Special Methods
    def __init__(self, toolname, tooltype, axis):
        """Initialize Grabber
        
        toolname = the name of the tool (string)
        tooltype = the type of tool e.g. 1ch pipette, 8ch pipette, etc.(string)
        axis = position of tool on head & associated 
                motor (A, B, C, etc) (string)
        offset = the offset in space from the A tool which is defined to
            have offset = (0,0,0)
        """
        super().__init__(toolname, tooltype, axis)
        
    def __str__(self):
        return "{0.toolname!r}".format(self)
       
       
    def __repr__(self):
        return "Grabber({0.toolname!r},{0.tooltype!r},{0.axis!r})".format(self)
        
#Methods
    def grab(self):
        """Placeholder
        """
        pass
        
    def release(self):
        """Placeholder
        """
        pass
