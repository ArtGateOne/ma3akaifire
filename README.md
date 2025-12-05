# ma3akaifire
Code to cotrol MA3 via Akai Fire


This is another version of my Node.js code for controlling MA3 – this time for the Akai Fire controller.

Compared to the Akai Mini version, the Action Buttons view has been changed.

Now they are numbered the same way as in MA2 – starting from 131 up to 190.

The code has gained the ability to control 4 encoders for selected attributes.

The current version automatically lights up the keys in 3 colors:

dark blue – empty executor

amber – executor turned off

green – executor turned on

How to run it?
If you already have one of my earlier solutions, simply download the entire archive, then copy my demo show and load it into MA3 along with all the settings. After loading the show, restart MA3 so that the OSC settings are properly applied.

If you already have Node.js (v14.17), click on the ma3akaifire icon.

The program will automatically connect to the MIDI controller and to MA3, and it will also remotely launch the plugin responsible for feedback communication.

Enjoy testing – the RGB version is on the way!
