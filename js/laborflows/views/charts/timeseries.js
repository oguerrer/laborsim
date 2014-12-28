define([
  "underscore",
  "jquery",
  "d3"
], function(_, $, d3){

var AUTO_RANGE = 1, FIXED_RANGE = 2;

var DEFAULT_OPTIONS = {
      series: {},
      xTicks: 5,
      yTicks: 5,
      top: 10,
      right: 10,
      bottom: 20,
      left: 20,
      range: "auto",
      timeFrame: undefined
    };

var DEFAULT_COLOR = "#4682B4";

function TimeSeries (svg, options) {
  if (!(this instanceof TimeSeries)) {return new TimeSeries(svg, options);}

  if ( _(svg).isString() ) svg = d3.select(svg);

  if (options === undefined) options = {};
  _(options).defaults(DEFAULT_OPTIONS);

  var time = 0;

  var width, height,
      margin = {
        top: options.top,
        right: options.right,
        bottom: options.bottom,
        left: options.left
      };

  var timeFrame = options.timeFrame,
      rangeMode = options.range === "auto" ? AUTO_RANGE : FIXED_RANGE,
      range;
  if (rangeMode === AUTO_RANGE) {
    range = [0,0];
  } else {
    range = d3.extent(options.range);
  }
  var yDomain = [undefined, undefined];

  var chart = svg
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var series = {}, data = [];

  if (_(options.series).isArray()) {
    for (var i in series)
      _addSeries(series[i], {});
  } else {
    for (var s in options.series)
      _addSeries(s, _(options.series[s]).clone());
  }

  var x = d3.scale.linear(),
      y = d3.scale.linear();

  function _ptx(d, i) {
    return x(time - data.length + i);
  }

  var xAxis = d3.svg.axis()
      // .scale(x)
      .ticks(options.xTicks)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      // .scale(y)
      .ticks(options.yTicks)
      .orient("left");


  var xAxisEl = chart.append("g").attr("class", "x axis"),
      yAxisEl = chart.append("g").attr("class", "y axis");

  _updateChart();

  var container = $(svg).parent();
  function _unsetTitle () {
    container.attr("title","");
  }
  function _setTitle (name) {
    return function() {container.attr("title", series[name].label);};
  }

  function _addSeries (name, opt) {
    if (_(series).has(name)) throw Error("Series '"+name+"' exists already!");

    opt = opt || {};
    opt.label = opt.label || (name+"");
    opt.color = opt.color || DEFAULT_COLOR;
    opt.data = opt.data || [];

    var i = data.length, j = opt.data.length;

    while( --i >= 0 && --j >= 0 ) {
      data[i][name] = opt.data[j];
    }

    delete opt.data;

    opt.path = chart
         .append("path")
         .on("mouseover", _setTitle(name))
         .on("mouseout", _unsetTitle)
         .attr("class", "chart-line")
         .style("stroke", opt.color);

    opt.line = d3.svg.line()
      .x(_ptx)
      .y(function(d) { return y(d[name] || 0); });

    series[name] = opt;

    var exty = d3.extent(data, function(d) {return d[name];});
    if ( exty[0] !== undefined && yDomain[0] !== undefined )
      yDomain[0] = Math.min(exty[0], yDomain[0]);
    if ( exty[1] !== undefined && yDomain[1] !== undefined )
      yDomain[1] = Math.max(exty[1], yDomain[1]);
  }

  function _updateChart () {

    width = svg.attr("width") - margin.left - margin.right;
    height = svg.attr("height") - margin.top - margin.bottom;

    var len = timeFrame || data.length;

    x.range([0,  width]).domain( [time - len, time] );
    y.range([height, 0]).domain( rangeMode === AUTO_RANGE ? yDomain : range );

    xAxis.scale(x);
    yAxis.scale(y);

    xAxisEl
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    yAxisEl
      .call(yAxis);

    for ( var s in series ) {
      series[s].path.datum(data).attr("d", series[s].line);
    }
  }


  function _crop () {
    if ( timeFrame && data.length > timeFrame ) {
      data.splice(0,data.length - timeFrame);
      return true;
    }
    return false;
  }

  this.refresh = _updateChart;

  this.clipTimeFrame = function() {
    timeFrame = data.length;
    return this;
  };

  this.noTimeFrame = function() {
    this.timeFrame(undefined);
  };

  this.timeFrame = function(delta) {
    if (arguments.length === 0) return timeFrame;
    timeFrame = delta;
    if (_crop()) _updateChart();
    return this;
  };

  this.series = function() {
    return _(series).keys();
  };

  this.addSeries = function(name, opt) {
    _addSeries(name, opt);
    _updateChart();
    return this;
  };

  this.removeSeries = function(name) {
    delete series[name];
    for ( var i in data )
      delete data[i][name];
    return this;
  };

  this.showSeries = function(name) {
    series[name].path.attr("visibility", "visible");
    return this;
  };

  this.hideSeries = function(name) {
    series[name].path.attr("visibility", "hidden");
    return this;
  };

  this.addPoint = function(pts) {
    var last = data.length - 1;
    data.push({});
    for ( var s in series ){
      pt = pts[s] || (last > 0 ? data[last][s] : 0);
      yDomain[0] = yDomain[0] === undefined ? pt : Math.min(yDomain[0], pt);
      yDomain[1] = yDomain[1] === undefined ? pt : Math.max(yDomain[1], pt);
      data[last+1][s] = pt;
    }
    time++;
    _crop();
    _updateChart();
    return this;
  };

  this.currPoint = function(name, pt) {
    if (!_(series).has(name)) throw Error("Series '"+name+"' unknown!");

    var last = data.length - 1;
    if ( pt === undefined )
      return (last > 0 ? data[last][name] : 0);

    data[last][name] = pt;
    _updateChart();
    return this;
  };

  this.reset = function() {
    time = 0;
    yDomain = [0,0];
    data.splice(0);
    _updateChart();
    return this;
  };

  this.chart = function() {return chart;};


  $(window).resize(function() {
    _updateChart();
  });
}

return TimeSeries;

});