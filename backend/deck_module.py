import logging


logger = logging.getLogger('app.deck_module')


class DeckModule:
    """Base class for specific module types
    
    A DeckModule is a base class intended to be subclassed into specific
    module types that correspond to the physical objects placed in one of the
    15 slots on the deck.  Example subclassed deckmodules could be:
    - 96 well plate
    - tip rack
    - trash
    -12 row trough
    -96 well mag wash station
    """
    
#Special Methods
    def __init__(self, modname, modtype, slot):
        """Initialize DeckModule
        
        modname = the name of the module (string)
        modetype = the type of module e.g. plate, spinner, etc. (string)
        
        """
        logger.debug('deck_module.__init__ called')
    
        self.modname = modname
        self.modtype = modtype
        self.slot = slot
        self.location = (0,0)
        
        
    def __str__(self):
        return "{0.modname!r}".format(self)
       
       
    def __repr__(self):
        return "DeckModule({0.modname!r},{0.modtype!r},{0.slot!r})".format(self)
        
#Methods
    def set_location(self, location):
        """Set/reset x,y reference location of a deck module from a 
        calibration procedure
        
        location = a tuple containing the location in mm of the reference 
                position of the module for plates ref_location = A1
        """
        logger.debug('deck_module.set_location called')
        self.ref_location = location
        return self.ref_location
        
        
    def set_slot(self, slot):
        """Set a new slot of a DeckModule on the deck
        
        slot = an integer between 1 and 15 to indicate the position
        of this deckModule
        """
        logger.debug('deck_module.set_slot called')
        self.slot = slot