define([
  "underscore",
  "laborflows/events"
], function(_, events){

var DEFAULT_OPTIONS = {
  // tracking: true,
  timeWindow: 0 // val <= 1 -> no clipping
};

function UnemploymentMetrics (network, options) {
  if (!(this instanceof UnemploymentMetrics)) {return new UnemploymentMetrics(network, options);}

  var self = this;

  if (options === undefined) options = {};
  _(options).defaults(DEFAULT_OPTIONS);

  var timeWindow = options.timeWindow;

  var n, mean, M2, data;

  function _reset () {
    n = 0;
    mean = 0;
    M2 = 0;
    data = [];
  }

  function _addPoint(x){
      n = n + 1;
      var delta = x - mean;
      mean = mean + delta/n;
      M2 = M2 + delta*(x - mean);
  }

  function _removePoint(x){
      n = n - 1;
      var delta = x - mean;
      mean = mean - delta/n;
      M2 = M2 - delta*(x - mean);
  }

  function _updatePoint(oldX, newX){
      var delta = newX - oldX;
      var dold = oldX - mean;
      mean = mean + delta/n;
      var dnew = newX - mean;
      M2 = M2 + delta*(dold + dnew);
  }

  function _onStep (diff) {
    var u = diff.unemployed / (diff.employed + diff.unemployed);
    _addPoint(u);
    data.push(u);
    if ( timeWindow > 1 && n > timeWindow )
      _removePoint(data.shift());
    self.trigger("change", self.value());
  }

  this.value = function() {
    return {
      mean: mean,
      variance: n > 1 ? M2/(n-1) : 0
    };
  };

  this.network = function() {return network;};

  this.timeWindow = function(tw) {
    if ( tw === undefined ) return n;
    timeWindow = +tw;
    if ( timeWindow > 1 ) {
      while (data.length > tw) {
        _removePoint(data.shift());
      }
    }
    return this;
  };

  this.reset = function() {
    _reset();
    self.trigger("reset");
    return this;
  };

  this.destroy = function() {
    network.off("simulationStep", _onStep);
    network.off("networkReset", this.reset);
    network.off("networkChange", this.reset);
  };

  events(this, ["change", "reset"]);

  _reset();
  _onStep(network.numOfEmployees());

  network.on("simulationStep", _onStep);
  network.on(["networkReset", "networkChange"], this.reset);

}

return UnemploymentMetrics;

});