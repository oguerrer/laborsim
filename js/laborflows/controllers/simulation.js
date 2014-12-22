define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/events",
  "semanticui"
], function(_, $, d3, Random, events) {

function Simulation (domNode, network, config) {
  if (!(this instanceof Simulation)) {return new Simulation(domNode, network, config);}

  var MIN_DELAY = 0, MAX_DELAY = 1000, DELAY_DELTA = 50;

  var $me  = $( domNode ),
      self = this,
      timer, delay = 0;


  self.main = $me;
  self.speedControl     = $me.children("#speed-control");
  self.playBtn          = $me.children("#toggle-simulation");
  self.playIcon         = self.playBtn.children("i");
  self.toggleSimulation = $me.children("#toggle-simulation");
  self.slowerSpeed      = $me.find("#slower-speed");
  self.fasterSpeed      = $me.find("#faster-speed");

  events(self, ["speedChange", "start", "stop"]);


  function restart () {
    if ( timer ) clearInterval(timer);
    timer = setInterval(self.step, delay);
    return true;
  }

  this.start = function() {
    restart();
    self.playIcon.removeClass("play").addClass("pause");
    self.trigger("start");
  };

  this.stop = function() {
    if ( timer ) clearInterval(timer);
    timer = undefined;
    self.playIcon.removeClass("pause").addClass("play");
    self.trigger("stop");
  };

  this.running = function() {return (timer !== undefined);};

  this.step = function(num) {
    network.step(num);
  };


  function stepDelay (s) {
    if ( arguments.length === 0 ) return delay;
    s = +s;
    if ( s < MIN_DELAY ) s = MIN_DELAY;
    if ( s > MAX_DELAY ) s = MAX_DELAY;
    if ( s !== delay ) {
      delay = s;
      if ( timer ) restart();
      self.trigger("speedChange", {delay: delay, perc: delay/(MAX_DELAY - MIN_DELAY)});
    }
    return this;
  }

  function increaseDelay (delta) {
    if ( arguments.length === 0 ) delta = DELAY_DELTA;
    if ( delta < 0 ) return decreaseDelay(-delta);
    if ( delay + delta > MAX_DELAY ) return false;
    stepDelay(delay + delta);
    return true;
  }

  function decreaseDelay (delta) {
    if ( arguments.length === 0 ) delta = DELAY_DELTA;
    if ( delta < 0 ) return increaseDelay(-delta);
    if ( delay - delta < MIN_DELAY ) return false;
    stepDelay(delay - delta);
    return true;
  }

  this.stepDelay     = stepDelay;
  this.increaseDelay = increaseDelay;
  this.decreaseDelay = decreaseDelay;

  this.speedControl.dropdown({action: 'nothing'});

  self.toggleSimulation.on("click", function() {
    if(self.running()){
      self.stop();
    } else {
      self.start();
    }
  });

  self.slowerSpeed.on("click", function() {
    self.increaseDelay();
  });
  self.fasterSpeed.on("click", function() {
    self.decreaseDelay();
  });

}

return Simulation;

});