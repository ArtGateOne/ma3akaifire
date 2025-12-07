//MA3 Akai Fire control code beta 0.6 by ArtGateOne
var easymidi = require("easymidi");
var osc = require("osc");
var W3CWebSocket = require("websocket").w3cwebsocket;
var client = new W3CWebSocket("ws://127.0.0.1:8080?user=Encoder"); //U can change localhost(127.0.0.1) to Your console IP address

//config
midi_in = "FL STUDIO FIRE"; //set correct midi in device name
midi_out = "FL STUDIO FIRE"; //set correct midi in device name
color_mode = 1; // 0 standard, 1 multicolor, 2 - rainbow
feedback_mode = 0;  // 0 - light/dark, 1 - blink, 2 - pulse, 3 = rainbow
localip = "127.0.0.1";
localport = 8008;
remoteip = "127.0.0.1";
remoteport = 8000;

color_exec_empty = "#000001";
color_exec_off  = "#FF8000";
color_exec_on = "#00FF00";

if (color_mode == 2) {
  color_exec_empty = "#000000";
  color_exec_off = "#020202";
}

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

// tabela dla nut 0–63
const padTable = Array.from({ length: 64 }, () => ({
  status: -1,  // -1 brak, 0 obecny, 1 uruchomiony
  r: 0,
  g: 0,
  b: 0
}));

var grandmaster = 100;
var BO = 0; //Black Out 0 -off
var Page = 1;
var clear = 0;
let hueBase = 0;       // globalna faza
let hueStep = 2;       // szybkość przesuwania (° na krok)


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
    output.send("cc", { controller: 33, value: 1, channel: 0 });
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
    output.send("cc", { controller: 33, value: 2, channel: 0 });
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
    output.send("cc", { controller: 33, value: 1, channel: 0 });
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
  if (color_mode == 0) {
    if (status == -1) {
      color = color_exec_empty;
    } else if (status == 0) {
      color = color_exec_off;
    } else if (status == 1) {
      color = color_exec_on;
    }

    setPadColorHex(note, status, color);
  } else if (color_mode == 1) {
    if (color == "#000000") {
      if (status == -1) {
        color = color_exec_empty;
      } else if (status == 0) {
        color = color_exec_off;
      } else if (status == 1) {
        color = color_exec_on;
      }
    }

    setPadColorHex(note, status, color);
  } else if (color_mode == 2) {
    if (status == -1) {
      color = color_exec_empty;
    } else if (status == 0) {
      color = color_exec_off;
    } else if (status == 1) {
      const hue = (note * 360) / padTable.length; // równomierne rozłożenie 0–63
      color = hslToHex(hue, 100, 50); // pełna saturacja, 50% jasności
    }

    setPadColorHex(note, status, color);
  }
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

function setPadColorHex(index, status, hex) {
  hex = hex.replace(/^#/, "");

  // Parsowanie wartości R, G, B (0–255)
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Skalowanie do zakresu 0–127 (0x7F)
  r = Math.round(r * 127 / 255);
  g = Math.round(g * 127 / 255);
  b = Math.round(b * 127 / 255);

  if (status == 0 && color_mode == 1){
    r = r * 0.1;
    g = g * 0.1;
    b = b * 0.1;
  }

  // --- zapis do tabeli ---
  if (index >= 0 && index < padTable.length) {
    padTable[index].status = status;
    padTable[index].r = r;
    padTable[index].g = g;
    padTable[index].b = b;
  }

  // --- wysyłanie sysex ---
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

let pulseOn = true; // flaga przełączająca ON/OFF

function pulseExecutors() {
  for (let note = 0; note < padTable.length; note++) {
    if (padTable[note].status === 1) {
      if (pulseOn) {
        // wyślij kolor z tabeli
        setPadColor(note, padTable[note].r, padTable[note].g, padTable[note].b);
      } else {
        // wyślij czarny (OFF)
        setPadColor(note, 0, 0, 0);
      }
    }
  }
  // zmiana stanu na następne wywołanie
  pulseOn = !pulseOn;
}

//uruchomienie migania co 500 ms
if (feedback_mode == 1){
  setInterval(pulseExecutors, 250); //500
}



let fade = 1.0;       // aktualny współczynnik jasności (0–1)
let fadeStep = -0.1;  // krok zmiany (ujemny = ściemnianie, dodatni = rozjaśnianie)

function pulseExecutorsSmooth() {
  for (let note = 0; note < padTable.length; note++) {
    if (padTable[note].status === 1) {
      // oblicz aktualne wartości R/G/B z fade
      const r = Math.round(padTable[note].r * fade);
      const g = Math.round(padTable[note].g * fade);
      const b = Math.round(padTable[note].b * fade);

      setPadColor(note, r, g, b);
    }
  }

  // aktualizacja współczynnika fade
  fade += fadeStep;

  // zmiana kierunku gdy osiągniemy granice
  if (fade <= 0) {
    fade = 0;
    fadeStep = +0.1; // zaczynamy rozjaśniać
  } else if (fade >= 1) {
    fade = 1;
    fadeStep = -0.1; // zaczynamy ściemniać
  }
}

// uruchomienie płynnego pulsowania co 80 ms (ok. 12 FPS)
if (feedback_mode == 2){
setInterval(pulseExecutorsSmooth, 80);//80
}

function hslToRgb(h, s, l) {
  h = h % 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;

  let r=0, g=0, b=0;
  if (h < 60) { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }

  r = Math.round((r+m) * 127);
  g = Math.round((g+m) * 127);
  b = Math.round((b+m) * 127);

  return { r, g, b };
}

function cycleExecutorsColors() {
  for (let note = 0; note < padTable.length; note++) {
    if (padTable[note].status === 1) {
      // offset hue dla każdego executora
      const offset = (note * 360) / padTable.length;
      const { r, g, b } = hslToRgb(hueBase + offset, 100, 50);
      setPadColor(note, r, g, b);
    }
  }

  // przesuwamy globalny hue
  hueBase += hueStep;
  if (hueBase >= 360) hueBase = 0;
}


if (feedback_mode == 3){
  setInterval(cycleExecutorsColors, 100); // co 100 ms zmiana hue
}

function hslToHex(h, s, l) {
  h = h % 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;

  let r=0, g=0, b=0;
  if (h < 60) { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }

  r = Math.round((r+m) * 255);
  g = Math.round((g+m) * 255);
  b = Math.round((b+m) * 255);

  return "#" + 
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0");
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
