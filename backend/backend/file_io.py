import collections
import json
import logging
import os

logger = logging.getLogger('app.file_io')


class FileIO(object):
    """
    The FileIO class is intended to provide standard static methods for use
    by other classes in the application.
    """

    def __str__(self):
        return "FileIO"

    @staticmethod
    def writeFile(filename,filetext,onError):
        try:
            out_file = open(filename, "w")
            out_file.write(filetext)
        except Exception as e:
            logger.exception('Error writing file')

    @staticmethod
    def onError(msg,data=None):
        pass
    
    @staticmethod
    def readfile(filename, encoding, onError):
        pass
    
    @staticmethod
    def get_dict_from_json(input_file):
        if not os.path.isfile(input_file):
            raise Exception('Error, file does not exist: {}'.format(input_file))

        with open(input_file, 'r') as in_file:
            prot_dict = json.load(
                in_file,
                object_pairs_hook=collections.OrderedDict
            )
            return prot_dict
