import logging


logger = logging.getLogger('app.ingredients')


class Ingredients:
    """Hold information about the liquid sources
    
    The Ingredients class is intended to be instatiated into an ingredients
    object whose primary function (currently) is to keep track of reagent
    volumes as they are used up.
    """
    
#Special Methods
    def __init__(self, ingredients):
        """Initialize Ingredients object
        """

        self.ingredientDict = ingredients
        
        
    def __str__(self):
        return "Ingredients"
       
       
    def __repr__(self):
        return "Ingredients({0!r})".format(self.ingredientDict.keys())
        
        
#Methods
    def configure_ingredients(self, ingredients_data):
        """Recreate and fill ingredientsDict
        
        ingredients_data = a dictionary of the form:
        {"water": [{"container": "source-bucket","location": "A1","volume": 150000}],
         "wine": [{"container": "source-bucket","location": "A2","volume": 25000}]
        }
        """
        #delete any previous ingredients
        if self.ingredientDict:
            del self.ingredientDict
        self.ingredientDict = {}
        
        #save the ingredients_data values in ingredientsDict
        #ToDo - check for data validity before using
        for key in ingredients_data:
            ig = ingredients_data[key]
            self.ingredientDict[key] = ig
        