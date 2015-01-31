define([
  "underscore",
  "laborflows/events"
], function(_, events){

function SteadyStateMetrics (network) {
  if (!(this instanceof SteadyStateMetrics)) {return new SteadyStateMetrics(network);}
  var self = this;
  var U = 0,
      V = 0;

  function _onChange () {
    var firm = network.firms(),
        H = network.numOfAffiliates(),
        v = network.isHiringProb(),
        i;
    var rchi = 0;
    for ( i in firm ) {
      var neighbors = firm[i].neighbors();
      var hi = firm[i].param("hireProb"),
          ki = neighbors.length,
          li = firm[i].param("fireProb"),
          h = 0;
      for ( var j in neighbors ) {
        h += neighbors[j].param("hireProb");
      }
      h = h / ki;
      rchi += (hi * h * ki *(1/li + 1/(h*(1-Math.pow(1-v, ki)))));
    }
    var u = 0;
    for ( i in firm ) {
      var hi = firm[i].param("hireProb"),
          ki = firm[i].neighbors().length,
          li = firm[i].param("fireProb"),
          psi = (1 - Math.pow(1 - v, ki)),
          si = (hi * ki) / (psi * rchi);
      u += (H * si);
      // u += (H * hi * ki) / (psi * rchi);
      // varUi = (H * si * (1-si));
    }
    U = u / firm.length;
    V = undefined;
    self.trigger("change", self.value());
  }

  this.reset = function() {
    // nothing to do
    self.trigger("reset");
    return this;
  };

  this.value = function() {return {unemployment: U, volatility: V};};

  this.destroy = function() {
    network.off("networkChange", _onChange);
  };

  this.network = function() {return network;};

  events(this, ["change", "reset"]);

  network.on("networkChange", _onChange);

  _onChange();
}


return SteadyStateMetrics;

});