#!/usr/bin/env python3

import atexit
from concurrent.futures import ThreadPoolExecutor
import glob
import json
import logging
import math
import serial
import sys
import time


logger = logging.getLogger('app.smoothie_pyserial')


class Smoothie(object):
    _dict = {
        'absoluteMove' : "G90\r\nG0",
        'relativeMove' : "G91\r\nG0",
        'home' : "G28",
        'setupFeedback' : "M62",
        'off' : "M112",
        'on' : "M999",
        'speed_xyz' : "G0F",
        'speed_a' : "G0a",
        'speed_b' : "G0b",
        'speed_c' : "G0c",
        'reset' : 'reset'
    }

    theState = {
        'x': 0,
        'y': 0,
        'z': 0,
        'a': 0,
        'b': 0,
        'c': 0,
        'direction': {
            'x': 0,
            'y': 0,
            'z': 0,
            'a': 0,
            'b': 0,
            'c': 0
        },
        'stat': 0,
        'delaying': 0,
        'homing': {
            'x': False,
            'y': False,
            'z': False,
            'a': False,
            'b': False,
            'c': False
        }
    }

    old_msg = ""

    def __init__(self, outer):
        self.outer = outer
        self.raw_callback = None
        self.position_callback = None
        self.limit_hit_callback = None
        self.move_callback = None
        self.delay_callback = None
        self.on_connect_callback = None
        self.on_disconnect_callback = None
        self.smoothieQueue = list()
        self.already_trying = False
        self.ack_msg_rcvd = "ok"
        self.state_ready = 0
        self.delay_handler = None
        self.delay_start = 0
        self.delay_end = 0
        self.serial_port = None
        self.attempting_connection = False
        self.callbacker = self.CB_Factory(self)
        self.connected = False
        self.pool = ThreadPoolExecutor(max_workers=5)
        self.delay_future = None

        def close_port():
            if self.serial_port and self.serial_port.is_open:
                try:
                    self.serial_port.close()
                    self.callbacker.connection_lost()
                except serial.SerialException:
                    pass

        atexit.register(close_port)


        # the below coroutine loops forever
        # reading from an available serial port until it gets a terminating '\r\n'
        # if it fails, it calls .connect()
        def read_loop():
            while True:
                time.sleep(0.01)
                if self.connected and self.serial_port and self.serial_port.is_open:
                    try:
                        data = self.serial_port.readline().decode('UTF-8')
                        if data:
                            try:
                                self.callbacker.data_received(data)
                            except Exception as e:
                                # if no X/Y/Z coordinates are calibrated for labware,
                                # then this branch will get triggered. previously,
                                # this was causing the red/green/red/green
                                # repeated disconnect reconnect issue.
                                # now that should be fixed, though protocils
                                # will still fail if all labware isn't properly calibrated
                                logger.exception(
                                    'Failed parsing data from smoothie board'
                                )
                    except OSError:
                        self.callbacker.connection_lost()
                else:
                    self.callbacker.connection_lost()

        self.pool.submit(read_loop)

    class CB_Factory(object):

        def __init__(self, outer):
            self.outer = outer
            self.proc_data = ""
            self.old_data = None

        def connection_made(self):
            """Callback when a connection is made
            """
            self.outer.connected = True
            logger.info("smoothie_pyserial:\n\tCB_Factory.connection_made called")

            self.smoothieQueue = list()

            self.outer.on_success_connecting()


        def data_received(self, data):
            """Callback when data is received from Smoothieboard
            """
            logger.debug('smoothie_pyserial:\n\tCBFactory.data_received: ')
            logger.debug(data)
            self.old_data = data

            self.proc_data = self.proc_data + data
            deli = "\n"
            sub_data = self.proc_data[:self.proc_data.rfind("\n")]
            self.proc_data = self.proc_data[self.proc_data.rfind("\n")+1:]
            list_data = [e+deli for e in sub_data.split(deli)]
            for ds in list_data:
                self.outer.smoothie_handler(ds,data)  #self.outer


        def connection_lost(self):
            """Callback when connection is lost
            """
            if self.outer.serial_port and self.outer.connected:
                
                self.outer.connected = False
                self.outer.smoothieQueue = list()
                self.outer.already_trying = False
                logger.info("smoothie_pyserial:\n\tCBFactory.connection_lost called")

                self.outer.theState['stat'] = 0
                self.outer.theState['delaying'] = 0

                self.outer.delay_cancel()

                self.outer.already_trying = False
                self.proc_data = ""
                self.outer.on_disconnect()

    def set_raw_callback(self, callback):
        """connects the external callback for raw data
        """
        logger.debug('smoothie_pyserial.set_raw_callback called')
        self.raw_callback = callback


    def set_position_callback(self, callback):
        """connects the external callback for position data
        """
        logger.debug('smoothie_pyserial.set_position_callback called')
        self.position_callback = callback


    def set_limit_hit_callback(self, callback):
        """Connect the external callback for limit hit data
        """
        logger.debug('smoothie_pyserial.set_limit_hit_callback called')
        self.limit_hit_callback = callback

    def set_move_callback(self, callback):
        """Connect the external callback for move call
        """
        logger.debug('smoothie_pyserial.set_move_callback called')
        self.move_callback = callback

    def set_delay_callback(self, callback):
        """Connect the external callback for delay call
        """
        self.delay_callback = callback

    def set_on_connect_callback(self, callback):
        """Connect the external callback for handling connections
        """
        self.on_connect_callback = callback

    def set_on_disconnect_callback(self, callback):
        """Connect the external callback for handling disconnections
        """
        self.on_disconnect_callback = callback

    def connect(self, portname):
        """Make a connection to Smoothieboard
            This method is called whenever the port is found to either not exist or throw an error
        """

        self.connected = False

        if self.serial_port and self.serial_port.is_open:
            try:
                self.serial_port.close()
            except serial.SerialException:
                pass

        try:
            # pause for a couple seconds, because the port has a tendancy to
            # disappear then reappear after first being plugged in
            self.serial_port = serial.Serial(portname, 115200, timeout=0.02)
            self.callbacker.connection_made()
        except serial.SerialException or OSError:
            self.callbacker.connection_lost()

    def on_success_connecting(self):
        """Smoothie callback for when a connection is made

        Sends startup commands to engage automatic feedback from Smoothieboard, :meth:`home`,
        and call :meth:`on_connect` callback
        """
        logger.debug('smoothie_pyserial.on_success_connecting called')
        thestring = self._dict['setupFeedback']
        self.try_add(thestring)#self  self._dict['setupFeedback'])
        self.try_add('G91 G0Z-2 G0Z2 G0Z-2 G0Z2 G0Z-2 G0Z2')
        self.on_connect(self.theState)


    def send(self, string):
        """sends data to the smoothieboard using a transport
        """
        if self.connected:
            logger.debug('smoothie_pyserial.send called')
            self.on_raw_data('--> '+string)  #self
            if self.serial_port and self.serial_port.is_open:
                logger.debug('\n\tstring: {}'.format(string))
                string = (string+'\r\n').encode('UTF-8')
                try:
                    self.serial_port.write(string)
                except serial.SerialException:
                    self.callbacker.connection_lost()
            else:
                self.callbacker.connection_lost()


    def smoothie_handler(self, msg, data_):
        """Handle lines of data from Smoothieboard
        """
        ok_print = False
        if self.old_msg != msg:
            ok_print = True
            logger.debug('smoothie_pyserial.smoothie_handler called')
            logger.debug('\n\tmsg: {}'.format(msg))
        self.on_raw_data(msg)   #self

        if self.ack_msg_rcvd in msg:
            self.already_trying = False
            logger.debug('ok... self.already_trying: {}'.format(self.already_trying))
        if msg.find('{')>=0:
            msg = msg[msg.index('{'):]

            try:
                data = json.loads(msg)
            except Exception as e:
                logging.debug('json.loads(msg) error: {}'.format(msg))
                logging.debug('original messag ewas: {}'.format(data_))
                logging.exception('Failed to load json in smoothie handler')
                return

            didStateChange = False
            stillHoming = False

            if ok_print:
                logger.debug('smoothie_pyserial(1):\n\ttheState: {}'.format(self.theState))
            for key, value in data.items():
                if key == "!!":
                    self.already_trying = False
                    didStateChange = True
                if ok_print:
                    if key in self.theState:
                        logger.debug('smoothie_pyserial:\n\ttheState[{0}] = {1}'.format(key,self.theState[key]))
                if key == 'stat' and self.theState[key] != value:
                    didStateChange = True
                    self.already_trying = False

                if key in self.theState:
                    if key.upper()=='X' or key.upper()=='Y':
                        self.theState[key] = value + self.theState['direction'][key]
                    else:
                        self.theState[key] = value

                if ok_print:
                    logger.debug('smoothie_pyserial:\n\tkey: {}'.format(key))
                    logger.debug('smoothie_pyserial:\n\tvalue: {}'.format(value))
                if key!='stat' and key!='homing' and key!='delaying':
                    if key.isalnum() and value == 0 and self.theState['homing'][key]==True:
                        logger.debug('smoothie_pyserial:\n\tchanging key [{}] homing to False'.format(key))
                        self.theState['homing'][key] = False
                        self.theState['direction'][key] = 0
                        for h_key, h_value in self.theState['homing'].items():
                            if h_value == True:
                                stillHoming = True

                        if stillHoming==False:
                            didStateChange = True

                if key == 'limit':
                    self.on_limit_hit(value)


            if 'x' in data or 'y' in data or 'z' in data or 'a' in data or 'b' in data or 'c' in data:
                pos = {}
                pos['x']=self.theState['x']
                pos['y']=self.theState['y']
                pos['z']=self.theState['z']
                pos['a']=self.theState['a']
                pos['b']=self.theState['b']
                pos['c']=self.theState['c']
                self.on_position_data(pos)

            if didStateChange == True and self.theState['stat']==self.state_ready and self.already_trying == False:
                if len(self.smoothieQueue)>0:
                    self.try_step()
                else:
                    if didStateChange == True:
                        self.on_state_change(self.theState)

            self.prevMsg = msg
            if ok_print:
                logger.debug('smoothie_pyserial:\n\tdidStateChange?: {}'.format(didStateChange))


    def get_state(self):
        """Returns the robot state

        example state:

        theState = {
        'x': 0,
        'y': 0,
        'z': 0,
        'a': 0,
        'b': 0,
        'c': 0,
        'stat': 1,
        'direction': {
            'x': 0,
            'y': 0,
            'z': 0,
            'a': 0,
            'b': 0,
            'c': 0
        },
        'delaying': 0,
        'homing': {
            'x': False,
            'y': False,
            'z': False,
            'a': False,
            'b': False,
            'c': False
            }
        }

        """
        logger.debug('smoothie_pyserial.get_state called')
        temp_state = dict(self.theState)
        return temp_state


    def try_add(self, cmd):
        """Add a command to the smoothieQueue
        """
        if self.connected:
            logger.debug('smoothie_pyserial.try_add called')
            self.smoothieQueue.append(cmd)
            #if len(self.smoothieQueue) == 1:
            self.try_step()


    def move(self, coords_list):
        """Move according to coords_list

        :todo:
        1. Show an example coords_list in documentation
        """
        logger.debug('smoothie_pyserial.move called')
        logger.debug('coords_list: {}'.format(coords_list))

        absolMov = True
        if isinstance(coords_list, dict):
            header = self._dict['absoluteMove']
            if 'relative' in coords_list:
                if coords_list['relative']==True:
                    absolMov = False
                    header = self._dict['relativeMove']

            cmd = header

            for n, value in coords_list.items():
                logger.debug('smoothie_pyserial:\n\tn: {}'.format(n))
                logger.debug('smoothie_pyserial:\n\tvalue: {}'.format(value))
                logger.debug('smoothie_pyserial:\n\tvalue type: {}'.format(type(value)))
                if n.upper()=='X' or n.upper()=='Y' or n.upper()=='Z' or n.upper()=='A' or n.upper()=='B':
                    axis = n.upper()
                    cmd = cmd + axis

                    if absolMov == True:
                        try:
                            if float(value)<0:
                                value = 0
                            #SWITCH DIRECTION STUFF HERE
                            if axis=='X' or axis=='Y':
                                tvalue = float(self.theState[n])
                                if value < tvalue and self.theState['direction'][n]==0:
                                    self.theState['direction'][n] = 0.5
                                elif value > tvalue and self.theState['direction'][n]>0:
                                    self.theState['direction'][n] = 0
                                value = value - self.theState['direction'][n]
                        except Exception as e:
                            # TODO(Ahmed): wtf is going on here...
                            logging.exception('Failed do switch direction stuff....')

                    else:
                        if axis=='X' or axis=='Y':
                            if value < 0 and self.theState['direction'][n]==0:
                                self.theState['direction'][n] = 0.5
                                value = value - self.theState['direction'][n]
                            elif value > 0 and self.theState['direction'][n]>0:
                                value = value + self.theState['direction'][n]
                                self.theState['direction'][n] = 0
                    cmd = cmd + str(float(value))
                    logger.debug('smoothie_pyserial:\n\tcmd: {}'.format(cmd))


            self.try_add(cmd)


    def try_step(self):
        """Try to step the smoothieQueue
        """
        logger.debug('smoothie_pyserial.try_step called')
        logger.debug('self.already_trying: {}'.format(self.already_trying))
        logger.debug('self.theState[{0}]: {1}'.format('stat', self.theState['stat']))
        logger.debug('self.theState[{0}]: {1}'.format('delaying',self.theState['delaying']))
        if self.theState['stat'] == 0 and self.theState['delaying'] == 0 and self.already_trying == False:
            self.already_trying = True
            cmd = self.smoothieQueue.pop(0)
            self.send(cmd)


    def delay(self, seconds):
        """Delay for given number of milli_seconds
        """
        float_seconds = 0
        logger.debug('smoothie_pyserial.delay called')
        try:
            float_seconds = float(seconds)
        except ValueError:
            pass
            
        if float_seconds >= 0 and self.delay_future == None:

            self.theState['delaying'] = 1
            self.on_state_change(self.theState)

            def sleep_delay(delay_time):

                while delay_time>0:

                    if not self.connected:
                        self.delay_callback(0)
                        self.delay_cancel()
                        return

                    self.delay_callback(delay_time)
                    time.sleep(min(1,delay_time))
                    delay_time -= min(1,delay_time)

                self.delay_callback(0)

                self.delay_cancel()

                self.on_state_change(self.theState)

            self.delay_future = self.pool.submit(sleep_delay, float_seconds)


    def delay_cancel(self):

        if self.delay_future != None:
            self.delay_future.cancel()

        self.delay_future = None

        self.theState['delaying'] = 0


    def home(self, axis_dict):
        """Home robots according to axis_dict argument

        If axis_dict is empty, homes all in the order ABZ, XY, to clear the deck before moving in XY plane
        """
        #axis_dict = json.loads(axisJSON)
        logger.debug('smoothie_pyserial.home called')
        logger.debug('\n\taxis_dict: {}'.format(axis_dict))
        if axis_dict is None or len(axis_dict)==0:
            axis_dict = {'a':True, 'b':True, 'x':True, 'y':True, 'z':True}

        self.halt()

        homeCommand = ''
        homingX = False
        homingABZ = False

        if 'a' in axis_dict or 'A' in axis_dict:
            homeCommand += self._dict['home']
            homeCommand += 'A'
            self.theState['homing']['a'] = True
            homingABZ = True

        if 'b' in axis_dict or 'B' in axis_dict:
            if homingABZ == False:
                homeCommand += self._dict['home']
            homeCommand += 'B'
            self.theState['homing']['b'] = True
            homingABZ = True

        if 'z' in axis_dict or 'Z' in axis_dict:
            if homingABZ == False:
                homeCommand += self._dict['home']
            homeCommand += 'Z'
            self.theState['homing']['z'] = True
            homingABZ = True

        if homingABZ == True:
            homeCommand += '\r\n'
            self.try_add(homeCommand)
            homeCommand = ''

        if 'x' in axis_dict or 'X' in axis_dict:
            homeCommand += self._dict['home']
            homeCommand += 'X'
            self.theState['homing']['x'] = True
            homingX = True

        if 'y' in axis_dict or 'Y' in axis_dict:
            if homingX == False:
                homeCommand += self._dict['home']
            homeCommand += 'Y'
            self.theState['homing']['y'] = True

        if len(homeCommand)>=3:
            homeCommand += '\r\n'
            self.try_add(homeCommand)


    def halt(self):
        """Halt robot
        """
        logger.debug('smoothie_pyserial.halt called')
        if self.delay_handler is not None:
            self.delay_handler.cancel()
            self.delay_handler = None
            self.delay_cancel()

        self.delay_cancel()

        self.smoothieQueue = list()

        # send directly to smoothie board (bypass smoothie queue)
        self.send(self._dict['off'] + '\r\n')

        # the smoothie seems to require some time after resetting
        time.sleep(0.5)
        
        self.send(self._dict['on'] + '\r\n')
        time.sleep(0.5)


    def set_speed(self, axis, value):
        """Set the speed for a given axis
        """
        logger.debug('smoothie_pyserial.set_speed called')
        logger.debug('axis: {0}, value: {1}'.format(axis,value))

        if isinstance(value,(int, float, complex)) or isinstance(value, str):
            if axis=='xyz' or axis=='a' or axis == 'b' or axis == 'c':
                string = self._dict['speed_'+axis] + str(value)
                self.try_add(string)
            else:
                logger.debug('smoothie_pyserial.set_speed: axis {}'.format(axis))
        else:
            logger.error('smoothie_pyserial: value is not a number???')


    def raw(self, string):
        """Send a raw command to the Smoothieboard
        """
        #self.try_add(string)
        self.send(string)

    def list_serial_ports(self):
        """ Lists serial port names

            :raises EnvironmentError:
                On unsupported or unknown platforms
            :returns:
                A list of the serial ports available on the system
        """
        if sys.platform.startswith('win'):
            ports = ['COM%s' % (i + 1) for i in range(256)]
        elif sys.platform.startswith('linux') or sys.platform.startswith('cygwin'):
            # this excludes your current terminal "/dev/tty"
            ports = glob.glob('/dev/tty[A-Za-z]*')
        elif sys.platform.startswith('darwin'):
            ports = glob.glob('/dev/tty.*')
        else:
            raise EnvironmentError('Unsupported platform')

        result = []
        for port in ports:
            try:
                s = serial.Serial(port)
                s.close()
                result.append(port)
            except (OSError, serial.SerialException):
                pass
        return result


    #############################################
    #
    #   CALLBACKS
    #
    #############################################

    # FIRST SET EXTERNAL CALLBACKS

    #def set_on_disconnect_cb(self, od_cb):
    #    self.od_cb = od_cb

    #def set_on_ctate_change_cb(self, osc_cb):
    #    self.osc_cb = osc_cb
    # The callback 'hooks'


    def on_connect(self, theState):
        """Callback when connection made

        """
        logger.debug('smoothie_pyserial.on_connect called')
        if hasattr(self.on_connect_callback, '__call__'):
            self.on_connect_callback()

    def on_disconnect(self):
        """Callback when disconnected
        """
        logger.debug('smoothie_pyserial.on_disconnect called')

        if hasattr(self.on_disconnect_callback, '__call__'):
            self.on_disconnect_callback()

    def on_raw_data(self, msg):
        """Calls an external callback to show raw data lines received
        """
        if self.old_msg != msg:
            logger.debug('smoothie_pyserial.on_raw_data called')
        self.old_msg = msg
        if self.raw_callback != None:
            self.raw_callback(msg)


    def on_position_data(self, msg):
        """Calls an external callback to show raw data lines received
        """
        logger.debug('smoothie_pyserial.on_position_data called')
        if self.position_callback != None:
            self.position_callback(msg)


    def on_state_change(self, state):
        """Calls an external callback for when theState changes
        """
        logger.debug('smoothie_pyserial.on_state_change called')
        logger.debug('state: {}'.format(state))
        if hasattr(self.outer,'on_state_change'):
            try:
                self.outer.on_state_change(state)
            except Exception as e:
                logging.exception('smoothie_pyserial.on_state_change: problem calling self.outer.on_state_change')
                raise e

    def on_limit_hit(self, axis):
        """Calls an external callback for when a limitswitch is hit
        """
        logger.debug('smoothie_pyserial.on_limit_hit called on axis {}'.format(axis))
        if self.limit_hit_callback != None:
            self.limit_hit_callback(axis)
