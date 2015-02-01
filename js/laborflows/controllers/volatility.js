define([
  "underscore",
  "jquery",
  "laborflows/metrics/unemployment",
  "laborflows/views/charts/timeseries"
], function(_, $, UMetric, TimeSeries){

function VolatilityChart (domNode, network, steadystate, options) {

  if ( _(domNode).isString() ) domNode = d3.selectAll(domNode);
  var $domNode = $(domNode[0]);

  var chart = new TimeSeries(domNode.select("svg"), {
    series: {
      UV: {label: "Unemployment volatility"},
      // SS: {label: "Steady State"}
    },
    minRange: [0, 0.001],
    left: 40
  });

  var metric = new UMetric(network);

  $domNode.find(".recycle").click(function() {
    metric.reset();
  });

  $domNode.find(".history").click(function() {
    if (chart.timeFrame()){
      chart.noTimeFrame();
      $(this).removeClass("blue");
    } else {
      chart.clipTimeFrame();
      $(this).addClass("blue");
    }
  });

  metric.on("change", function(metric) {
    chart.addPoint({
      UV: metric.variance,
      // SS: steadystate.value().volatility
    });
    // chart.addPoint({UV: Math.sqrt(metric.variance)}); // alternative
  });

  metric.on("reset", function() {
    chart.reset();
  });

  this.metric = function() { return metric; };

  this.destroy = function() {
    metric.destroy();
    chart.destroy();
  };
}

return VolatilityChart;

});