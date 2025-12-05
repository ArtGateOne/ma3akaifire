//MA3 Akai Fire control code beta 0.3 by ArtGateOne
var easymidi = require("easymidi");
var osc = require("osc");
var W3CWebSocket = require("websocket").w3cwebsocket;
var client = new W3CWebSocket("ws://127.0.0.1:8080?user=Encoder"); //U can change localhost(127.0.0.1) to Your console IP address

//config
midi_in = "FL STUDIO FIRE"; //set correct midi in device name
midi_out = "FL STUDIO FIRE"; //set correct midi in device name
localip = "127.0.0.1";
localport = 8008;
remoteip = "127.0.0.1";
remoteport = 8000;

// encoder position map
const encoderPositions = {
  16: { x: 320, y: 324 },
  17: { x: 630, y: 324 },
  18: { x: 930, y: 324 },
  19: { x: 1240, y: 324 },
};
const keyMap = {
  131: 0,
  132: 1,
  133: 2,
  134: 3,
  135: 4,
  136: 5,
  137: 6,
  138: 7,
  139: 8,
  140: 9,
  141: 10,
  142: 11,
  143: 12,
  144: 13,
  145: 14,
  146: 16,
  147: 17,
  148: 18,
  149: 19,
  150: 20,
  151: 21,
  152: 22,
  153: 23,
  154: 24,
  155: 25,
  156: 26,
  157: 27,
  158: 28,
  159: 29,
  160: 30,
  161: 32,
  162: 33,
  163: 34,
  164: 35,
  165: 36,
  166: 37,
  167: 38,
  168: 39,
  169: 40,
  170: 41,
  171: 42,
  172: 43,
  173: 44,
  174: 45,
  175: 46,
  176: 48,
  177: 49,
  178: 50,
  179: 51,
  180: 52,
  181: 53,
  182: 54,
  183: 55,
  184: 56,
  185: 57,
  186: 58,
  187: 59,
  188: 60,
  189: 61,
  190: 62
};
var grandmaster = 100;
var BO = 0; //Black Out 0 -off
var Page = 1;
var clear = 0;

// Create an osc.js UDP Port listening on port 8000.
var udpPort = new osc.UDPPort({
  localAddress: localip,
  localPort: localport,
  metadata: true,
});

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
  //console.log(oscMsg);

  if (clear == 0) {
    midiclear();
    clear = 1;
    output.send("cc", { controller: 36, value: 2, channel: 0 });
    output.send("cc", { controller: 37, value: 2, channel: 0 });
    output.send("cc", { controller: 38, value: 2, channel: 0 });
    output.send("cc", { controller: 39, value: 2, channel: 0 });
  }

  if (oscMsg.address == "/Page") {
    change_page(oscMsg.args[0].value);
  } else if (oscMsg.address.startsWith("/Key")) {
  const keyNum = parseInt(oscMsg.address.replace("/Key", ""), 10);
  if (keyMap[keyNum] !== undefined) {
    light_executor(keyMap[keyNum], oscMsg.args[0].value, oscMsg.args[1].value);
  }
}
});

// Open the socket.
udpPort.open();

// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {
  console.log("READY");
});

console.log("MIDI inputs:");
console.log(easymidi.getInputs());

console.log("MIDI outputs:");
console.log(easymidi.getOutputs());

const availableInputs = easymidi.getInputs();
const availableOutputs = easymidi.getOutputs();

if (!availableInputs.includes(midi_in)) {
  console.error(
    `❌ MIDI IN "${midi_in}" nie znaleziony. Dostępne:`,
    availableInputs
  );
  process.exit(1);
}

if (!availableOutputs.includes(midi_out)) {
  console.error(
    `❌ MIDI OUT "${midiName}" nie znaleziony. Dostępne:`,
    availableInputs
  );
  process.exit(1);
}

var input = new easymidi.Input(midi_in);
var output = new easymidi.Output(midi_out);

midiclear();

input.on("cc", function (msg) {
  if (encoderPositions[msg.controller]) {
    //ENCODERS
    let delta = 0;
    if (msg.value === 1) delta = 1;
    else if (msg.value === 127) delta = -1;

    if (delta !== 0) {
      const pos = encoderPositions[msg.controller];
      client.send(
        JSON.stringify({
          requestType: "mouseEvent",
          posX: pos.x,
          posY: pos.y,
          eventType: "wheel",
          deltaX: 0,
          deltaY: delta,
          deltaZ: 0,
          deltaMode: 1,
          ctrlKey: false,
        })
      );
    }
  } else if (msg.controller == 118) {
    //GRANDMASTER

    if (msg.value == 1) {
      if (grandmaster < 100) {
        grandmaster++;
      }
    } else if (msg.value == 127) {
      if (grandmaster > 0) {
        grandmaster--;
      }
    }
    if (BO == 0) {
      udpPort.send(
        {
          address: "/cmd",
          args: [{ type: "s", value: "Master 2.1 At " + grandmaster }],
        },
        remoteip,
        remoteport
      );
    }
  }
});

input.on("noteon", function (msg) {
  if (msg.note == 33) {
    BO = 1;
    udpPort.send(
      {
        address: "/cmd",
        args: [
          {
            type: "s",
            value: "Master 2.1 At 0",
          },
        ],
      },
      remoteip,
      remoteport
    );
  } else if (msg.note == 36 || msg.note == 37 || msg.note == 38 || msg.note == 39) {
    //change_page(msg.note - 35);
    udpPort.send(
      {
        address: "/cmd",
        args: [
          {
            type: "s",
            value: "Page " + (msg.note - 35),
          },
        ],
      },
      remoteip,
      remoteport
    );
  } else if (msg.note >= 54 && msg.note <= 117) {
    if (msg.note >= 54 && msg.note <= 68) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 77),
          args: [
            {
              type: "i",
              value: 1,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 70 && msg.note <= 84) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 76),
          args: [
            {
              type: "i",
              value: 1,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 86 && msg.note <= 100) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 75),
          args: [
            {
              type: "i",
              value: 1,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 102 && msg.note <= 116) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 74),
          args: [
            {
              type: "i",
              value: 1,
            },
          ],
        },
        remoteip,
        remoteport
      );
    }
  }
});

input.on("noteoff", function (msg) {
  if (msg.note == 33) {
    //BO
    BO = 0;
    udpPort.send(
      {
        address: "/cmd",
        args: [
          {
            type: "s",
            value: "Master 2.1 At " + grandmaster,
          },
        ],
      },
      remoteip,
      remoteport
    );
  } else if (msg.note >= 54 && msg.note <= 117) {
    //Executors
    if (msg.note >= 54 && msg.note <= 68) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 77),
          args: [
            {
              type: "i",
              value: 0,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 70 && msg.note <= 84) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 76),
          args: [
            {
              type: "i",
              value: 0,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 86 && msg.note <= 100) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 75),
          args: [
            {
              type: "i",
              value: 0,
            },
          ],
        },
        remoteip,
        remoteport
      );
    } else if (msg.note >= 102 && msg.note <= 116) {
      udpPort.send(
        {
          address: "/Page" + Page + "/Key" + (msg.note + 74),
          args: [
            {
              type: "i",
              value: 0,
            },
          ],
        },
        remoteip,
        remoteport
      );
    }
  }
});

console.log("Connecting to MA3PC ...");
//WEBSOCKET-------------------
client.onerror = function () {
  console.log("Connection Error");
};

client.onopen = function () {
  console.log("WebSocket Client Connected");

  function sendNumber() {
    if (client.readyState === client.OPEN) {
      var number = Math.round(Math.random() * 0xffffff);
      client.send(number.toString());
      setTimeout(sendNumber, 1000);
    }
  }
  //sendNumber();
};

client.onclose = function () {
  console.log("Client Closed");
  midiclear();
  input.close();
  output.close();
  process.exit();
};

client.onmessage = function (e) {
  if (typeof e.data == "string") {
    //console.log("Received: '" + e.data + "'");
    //console.log(e.data);

    obj = JSON.parse(e.data);
    //console.log(obj);

    if (obj.status == "server ready") {
      console.log("SERVER READY");
      client.send('{"requestType":"remoteState"}');
    }

    if (obj.type == "remoteState") {
      console.log("Remote State");
      client.send('{"requestType":"resizeVideo","width":1920,"height":720}');
      client.send('{"requestType":"requestVideo"}');
    }

    if (obj.MA == "00") {
      console.log(obj);
      console.log("Please start the OSC plugin to receive LED feedback.");
      udpPort.send(
        {
          address: "/cmd",
          args: [{ type: "s", value: "Plugin 1 Execute"  }],
        },
        remoteip,
        remoteport
      );
      
      
      setInterval(() => {
        client.send('{"requestType":"nextFrame"}');
      }, 80);
    }
  }
};

function midiclear() {
  output.send("cc", { controller: 127, value: 0, channel: 0 }); //off all led
}

function change_page(page_new) {
  output.send("cc", { controller: 40, value: 2, channel: 0 });
  output.send("cc", { controller: 41, value: 2, channel: 0 });
  output.send("cc", { controller: 42, value: 2, channel: 0 });
  output.send("cc", { controller: 43, value: 2, channel: 0 });
  if (page_new < 5) {
    output.send("cc", { controller: 39 + page_new, value: 1, channel: 0 });

    Page = page_new;
  }
}

function light_executor(note, status, color) {
  //console.log(color);

  if (status == -1) {
    var r = 0;
    var g = 0;
    var b = 1;
  } else if (status == 0) {
    var r = 127;
    var g = 64;
    var b = 0;
  } else if (status == 1) {
    var r = 0;
    var g = 127;
    var b = 0;
  }

  setPadColor(note, r, g, b);

  /*
    channel = brightness;

  if (color == "#000000") {
    if (status == 1) {
      velocity = color_executor_on;
    } else if (status == 0) {
      velocity = color_executor_off;
    }
    else {
      velocity = color_executor_empty;
    }

  } else {
    if (status == 1) {
      channel = executor_fx;
    }
    velocity = getClosestVelocity(color);
  }


  output.send('noteon', { note: note, velocity: velocity, channel: channel });*/
  return;
}

function setPadColor(index, r, g, b) {
  const len = 4;
  const lenH = (len >> 7) & 0x7f;
  const lenL = len & 0x7f;

  const syx = [
    0xf0,
    0x47,
    0x7f,
    0x43,
    0x65,
    lenH,
    lenL,
    index & 0x7f,
    r & 0x7f,
    g & 0x7f,
    b & 0x7f,
    0xf7,
  ];
  output.send("sysex", syx);
}

process.on("SIGINT", () => {
  interval_on = 0;
  console.log("CTRL+C -> awaryjne wyjście");
  midiclear();
  client.close();
  input.close();
  output.close();
  process.exit(1); // kod błędu
});

process.on("SIGHUP", () => {
  interval_on = 0;
  console.log("CTRL+C -> awaryjne wyjście");
  midiclear();
  client.close();
  input.close();
  output.close();
  process.exit(1); // kod błędu
});

process.on("SIGTERM", () => {
  interval_on = 0;
  console.log("CTRL+C -> awaryjne wyjście");
  midiclear();
  client.close();
  input.close();
  output.close();
  process.exit(1); // kod błędu
});

process.on("uncaughtException", (err) => {
  console.error("Nieobsłużony wyjątek:", err.message);
  // Możesz tu np. spróbować ponownie połączyć z kontrolerem
});
