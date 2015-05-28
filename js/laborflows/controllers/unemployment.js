define([
  "underscore",
  "jquery",
  "laborflows/views/charts/timeseries",
  "laborflows/events",
], function(_, $, TimeSeries, events){

function UnemploymentChart (domNode, network, steadystate, options) {

  if ( _(domNode).isString() ) domNode = d3.selectAll(domNode);

  var $domNode = $(domNode[0]);

  var self = this;

  var chart = new TimeSeries(domNode.select("svg"), {
    minRange: [0,10],
    series: {
      UR: {label: "Unemployment rate"},
      // SS: {label: "Steady State"}
    }
  });

  // $domNode.find(".radio").click(function() {
  //   $(this).toggleClass("selected");
  //   $domNode.find(".SS").css("display", $(this).hasClass("selected") ? '' : 'none');
  // });

  var _reset = function() {
    chart.reset();
  }
  $domNode.find(".recycle").click(_reset);

  $domNode.find(".history").click(function() {
    if (chart.timeFrame() !== undefined){
      chart.noTimeFrame();
      $(this).removeClass("blue");
    } else {
      chart.clipTimeFrame();
      $(this).addClass("blue");
    }
  });

  /* TIME WINDOW WIDGET */
  var timeRect = chart.chart().append("rect");
  timeRect._timeWin = undefined;
  timeRect._dragging = false;
  timeRect.enabled = function(v) {
    if (arguments.length === 0)
      return timeRect.classed("enabled");
    timeRect.classed("enabled", v);
    if (timeRect._timeWin === undefined) timeRect._timeWin = chart.domain().xmax - chart.domain().xmin;
    timeRect.update();
    self.trigger("timeWindowChange", {timeWindow: v ? timeRect._timeWin : false});
  };
  timeRect.update = function(v) {
    v = v || timeRect._timeWin;
    if ( ! (timeRect.validTimeWindow(v) && timeRect.enabled()) ) return;
    var start = {x: chart.time() - v, y: chart.domain().ymax},
        end   = {x: chart.time(), y: chart.domain().ymin};
    start = chart.localCoord(start);
    end   = chart.localCoord(end);
    timeRect.attr("x", start.x).attr("y", start.y)
            .attr("width", Math.abs(end.x - start.x))
            .attr("height", Math.abs(end.y - start.y));
  };
  timeRect.winFromOffset = function(offset) {
    var newx = chart.globalCoord({x: offset - chart.margins().left, y: 0}).x;
    return Math.floor(chart.time() - newx);
  };
  timeRect.setTimeWindow = function(v) {
    if ( ! (timeRect.validTimeWindow(v) && timeRect.enabled()) ) return;
    timeRect._timeWin = v;
    timeRect.update();
    self.trigger("timeWindowChange", {timeWindow: v});
  };
  timeRect.validTimeWindow = function(v) {
    return (v && v > 1 && v <= chart.domain().xmax - chart.domain().xmin);
  };

  timeRect.classed("timeFrame", true);
  chart.svg()
    .on("mousedown", function() {
      if ( !timeRect.enabled() ) return;
      d3.event.preventDefault();
      $(this).css("cursor", 'w-resize');
      timeRect._dragging = true;
    })
    .on("mousemove", function() {
      if(d3.event.which === 1){
        var newTimeWin = timeRect.winFromOffset(d3.event.offsetX);
        timeRect.update(newTimeWin);
      }
    })
    .on("mouseup", function() {
      if ( !timeRect.enabled() ) return;
      timeRect._dragging = false;
      $(this).css("cursor", 'auto');
      var newTimeWin = timeRect.winFromOffset(d3.event.offsetX);
      timeRect.setTimeWindow(newTimeWin);
    });
  //////////////////////

  this.timeWindowEnabled = timeRect.enabled;

  var _onStep = function(diff) {
    chart.addPoint({
      UR: diff.unemployed / (diff.unemployed + diff.employed) * 100,
      // SS: steadystate.value().unemployment
    });
    if (timeRect._dragging === false){
      timeRect.update();
    }
  };

  this.destroy = function() {
    network.off("simulationStep", _onStep);
    steadystate.off("reset", _reset);
    chart.destroy();
  };

  this.chart = function() {return chart;};

  events(this, ["timeWindowChange"]);

  network.on("simulationStep", _onStep);
  steadystate.on("reset", _reset);

}

return UnemploymentChart;

});