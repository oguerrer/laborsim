define([
  "underscore",
  "laborflows/events"
], function(_, events){

var DEFAULT_OPTIONS = {
  // tracking: true,
  timeWindow: 100
};

function UnemploymentMetrics (network, options) {
  if (!(this instanceof UnemploymentMetrics)) {return new UnemploymentMetrics(network, options);}

  var self = this;

  if (options === undefined) options = {};
  _(options).defaults(DEFAULT_OPTIONS);

  var timeWindow = options.timeWindow;

  var n, mean, M2, data;

  _reset();

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
    if ( n > timeWindow )
      _removePoint(data.shift());
    self.trigger("change", self.value());
  }

  this.value = function() {
    return {
      mean: mean,
      variance: M2/(n-1)
    };
  };

  this.network = function() {return network;};

  this.timeWindow = function(tw) {
    if ( tw === undefined ) return n;
    if ( tw > 0 ) {
      timeWindow = tw;
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
    network.off("networkChange", _reset);
  };

  network.on("simulationStep", _onStep);
  network.on("networkChange", _reset);

  events(this, ["change", "reset"]);

}

return UnemploymentMetrics;

});