define([
  "underscore",
  "jquery",
  "chroma",
  "laborflows/views/charts/scatterplot"
], function(_, $, chroma, ScatterPlot){

function Beveridge (domNode, network, options) {

  if ( _(domNode).isString() ) domNode = d3.selectAll(domNode);
  var $domNode = $(domNode[0]);

  options = options || {};
  _(options).defaults({samplingInterval: 10});

  var samplingInterval = options.samplingInterval;

  var chart = new ScatterPlot(domNode.select("svg"), {left: 30});

  var time = 0,
      series = -1,
      color = chroma.brewer.Set1,
      numOfColors = color.length;

  var _bvAddSeries = function() {
    series++;
    chart.addSeries(series, {color: color[series % numOfColors]});
  };
  _bvAddSeries();


  var _resetChart = function() {
    chart.removeSeries();
    chart.reset();
    series = -1;
    _bvAddSeries();
  }
  $domNode.find(".recycle").click(_resetChart);

  $domNode.find(".theme").click(function() {
    _bvAddSeries();
  });

  var _bvUpdate = function(diff) {
    if ( time === samplingInterval ) {
      chart.addPoint(series, {
        x: diff.unemployed,
        y: _(diff.hiredWorkers).size()
      });
      time = 0;
    } else time++;
  };

  $domNode.find(".sample").click(function() {
    var btn = $(this);
    if (btn.hasClass("play")) {
      network.on("simulationStep", _bvUpdate);
    } else {
      network.off("simulationStep", _bvUpdate);
    }
    btn.toggleClass("play pause");
  });

  this.chart = function() {return chart;};

  this.samplingInterval = function(i) {
    if (!i) return samplingInterval;
    samplingInterval = Math.abs(i);
    time = Math.min(time, samplingInterval);
    return this;
  };

  this.destroy = function() {
    network.off("simulationStep", _bvUpdate);
    network.off("networkChange", _bvAddSeries);
    network.off("networkReset", _resetChart);
    chart.destroy();
  };

  network.on("simulationStep", _bvUpdate);
  network.on("networkChange", _bvAddSeries);
  network.on("networkReset", _resetChart);

}

return Beveridge;

});