import os

import zope

# Create __init__.py file in the top level zope dir so py2exe can import it
# http://stackoverflow.com/questions/7816799
open(
    os.path.join(zope.__path__[0], '__init__.py'), 'a'
).close()
