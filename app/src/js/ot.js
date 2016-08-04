$(document).ready(function() {
// Set up the URL to connect to 
var wsuri;
if (document.location.origin == "file://") {
   wsuri = "ws://127.0.0.1:31947/ws";

} else {
   wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
      document.location.host + "/ws";
}

// Initialize the WAMP connection to the Router
var connection = new autobahn.Connection({
   url: wsuri,
   realm: "ot_realm"
});

// When we open the connection, subsribe and register any protocols
connection.onopen = function(session) {
   connection.session.subscribe('com.opentrons.counter', function(str) {
      $("#counterField").text("Counter value: " + str);
   });

  // handle button clicks
  $(document).on('click', '#socket-form button', function() {
      var message = $('#socket-form #message').val();
      connection.session.publish('com.opentrons.event', [message]);
  });

  $(document).on('click', '#time-form button', function() {
     console.log("butan");
     session.call('com.opentrons.time', []).then(
        function (t) {
           $("#time-form #timeField").text(t);
        }
     );
  });
};

connection.open();
});
