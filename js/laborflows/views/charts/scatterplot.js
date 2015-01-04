define([
  "underscore",
  "jquery",
  "d3"
], function(_, $, d3){

var AUTO_RANGE = 1, FIXED_RANGE = 2;

var DEFAULT_OPTIONS = {
      series: {},
      dotSize: 2,
      xTicks: 5,
      yTicks: 5,
      top: 10,
      right: 10,
      bottom: 20,
      left: 20,
      xMinRange: [undefined, undefined],
      yMinRange: [undefined, undefined],
      xRange: "auto",
      yRange: "auto"
    };

var DEFAULT_COLOR = "#4682B4";
var DEFAULT_RADIUS = 2;

function _min (a, b) {
  var m = _.min([a, b]);
  return  ( m === Infinity ) ? undefined : m;
}
function _max (a, b) {
  var m = _.max([a, b]);
  return  ( m === -Infinity ) ? undefined : m;
}

function ScatterPlot (svg, options) {
  if (!(this instanceof ScatterPlot)) {return new ScatterPlot(svg, options);}

  if ( _(svg).isString() ) svg = d3.select(svg);

  if (options === undefined) options = {};
  _(options).defaults(DEFAULT_OPTIONS);

  var width, height,
      margin = {
        top: options.top,
        right: options.right,
        bottom: options.bottom,
        left: options.left
      };

  var radius = options.dotSize;

  var xRangeMode = options.xRange === "auto" ? AUTO_RANGE : FIXED_RANGE, xRange,
      yRangeMode = options.yRange === "auto" ? AUTO_RANGE : FIXED_RANGE, yRange;
  xRange = xRangeMode === AUTO_RANGE ? [0,1] : d3.extent(options.xRange);
  xRange = xRangeMode === AUTO_RANGE ? [0,1] : d3.extent(options.yRange);

  var xMinRange = options.xMinRange || [undefined, undefined],
      yMinRange = options.yMinRange || [undefined, undefined],
      xDomain = _(xMinRange).clone(),
      yDomain = _(yMinRange).clone();

  var chart = svg
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var series = {}, data = [];

  if (_(options.series).isArray()) {
    for (var i in options.series)
      _addSeries(series[i], {});
  } else {
    for (var s in options.series)
      _addSeries(s, _(options.series[s]).clone());
  }

  var x = d3.scale.linear(),
      y = d3.scale.linear();

  var cx = function(d){return x(d.x);},
      cy = function(d){return y(d.y);};

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
    _(opt).defaults({
      label: (name+""),
      color: DEFAULT_COLOR,
      data: []
    });

    opt.dotsGroup = chart.append("g");
    opt.dots = opt.dotsGroup.selectAll(".chart-dot");

    series[name] = opt;

    _updateDomains(opt.data);
  }

  function _updateDomains (data) {
    var extx = d3.extent(data, function(d) {return d.x;}),
        exty = d3.extent(data, function(d) {return d.y;});
    xDomain[0] = _min(extx[0], xDomain[0]);
    xDomain[1] = _max(extx[1], xDomain[1]);
    yDomain[0] = _min(exty[0], yDomain[0]);
    yDomain[1] = _max(exty[1], yDomain[1]);
  }

  function _updateChart () {

    width = svg.attr("width") - margin.left - margin.right;
    height = svg.attr("height") - margin.top - margin.bottom;

    x.range([0,  width]).domain( xRangeMode === AUTO_RANGE ? xDomain : xRange );
    y.range([height, 0]).domain( yRangeMode === AUTO_RANGE ? yDomain : yRange );

    xAxis.scale(x);
    yAxis.scale(y);

    xAxisEl
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    yAxisEl
      .call(yAxis);

    for ( var s in series ) {
      series[s].dots = series[s].dots.data(series[s].data);
      series[s].dots.exit().remove();
      series[s].dots.enter()
        .append("circle")
        .attr("class", "chart-dot")
        .attr("r", radius)
        .attr("fill", series[s].color)
        .append("title").text(series[s].label);

      series[s].dots
        .attr("cx", cx)
        .attr("cy", cy);
    }
  }

  this.refresh = _updateChart;


  this.series = function() {
    return _(series).keys();
  };

  this.addSeries = function(name, opt) {
    _addSeries(name, opt);
    _updateChart();
    return this;
  };

  this.removeSeries = function(names) {
    if ( !names ) names = _(series).keys();
    if ( !_(names).isArray() ) names = [names];
    for ( var i in names ){
      var name = names[i];
      series[name].dotsGroup.remove();
      delete series[name];
    }
    _updateChart();
    return this;
  };

  this.showSeries = function(name) {
    series[name].dotsGroup.attr("visibility", "visible");
    return this;
  };

  this.hideSeries = function(name) {
    series[name].dotsGroup.attr("visibility", "hidden");
    return this;
  };

  this.addPoint = function(name, pts) {
    if ( !_(series).has(name) ) throw Error("Series '"+name+"' unknown!");
    if ( !_(pts).isArray() ) pts = [pts];

    _updateDomains(pts);

    series[name].data.push.apply(series[name].data, pts);

    _updateChart();
    return this;
  };

  this.reset = function() {
    xDomain = _(xMinRange).clone();
    yDomain = _(yMinRange).clone();
    for ( var s in series )
      series[s].data.splice(0);
    _updateChart();
    return this;
  };

  this.chart = function() {return chart;};

  function _xRange (b) {
    if ( b === undefined )
      return _.clone(xRangeMode === AUTO_RANGE ? xDomain : xRange);
    xRangeMode = b === "auto" ? AUTO_RANGE : FIXED_RANGE;
    if ( b !== "auto" ) xRange = b;
    _updateChart();
    return this;
  }
  this.xRange = _xRange;

  function _yRange (b) {
    if ( b === undefined )
      return _.clone(yRangeMode === AUTO_RANGE ? yDomain : yRange);
    yRangeMode = b === "auto" ? AUTO_RANGE : FIXED_RANGE;
    if ( b !== "auto" ) yRange = b;
    _updateChart();
    return this;
  }
  this.yRange = _yRange;

  this.localCoord = function(pt) {return {x: x(pt.x), y: y(pt.y)};};

  this.destroy = function() {
    $(window).off("resize", _updateChart);
    chart.remove();
  };

  $(window).resize(_updateChart);
}

return ScatterPlot;

});