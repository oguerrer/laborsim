define([
  "underscore",
  "jquery",
  "laborflows/views/charts/timeseries"
], function(_, $, TimeSeries){

function UnemploymentChart (domNode, network, options) {

  if ( _(domNode).isString() ) domNode = d3.selectAll(domNode);

  var $domNode = $(domNode[0]);

  var chart = new TimeSeries(domNode.select("svg"), {
    minRange: [0,10],
    series: {UR: {label: "Unemployment rate"}}
  });

  $domNode.find(".recycle").click(function() {
    chart.reset();
  });

  $domNode.find(".history").click(function() {
    if (chart.timeFrame() !== undefined){
      chart.noTimeFrame();
      $(this).removeClass("blue");
    } else {
      chart.clipTimeFrame();
      $(this).addClass("blue");
    }
  });

  var _onStep = function(diff) {
    chart.addPoint({UR: diff.unemployed / (diff.unemployed + diff.employed) * 100});
  };

  this.destroy = function() {
    network.off("simulationStep", _onStep);
  };

  this.chart = function() {return chart;};

  network.on("simulationStep", _onStep);

}

return UnemploymentChart;

});