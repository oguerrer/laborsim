define([
  "underscore",
  "jquery",
  "d3",
  "chroma",
  "laborflows/model/network",
], function(_, $, d3, chroma, Network) {

var vidMarker = 0;

function percSize (min, max, size, tot) {
  if ( tot === 0 ) {
    return min;
  } else {
    return min + ( size / tot * ( max - min ) );
  }
}

var colormap = chroma.scale(["red", "green", "blue"]).mode('lab');

//* @todo: find a better home for color index generator
var colorShift = 1;
var colorCount = 0;
var nextColor = function() {
  var color = (colorShift / 2) + (colorCount * colorShift);
  if (color < 1){
    colorCount++;
  } else {
    colorShift = colorShift / 2;
    colorCount = 1;
    color = colorShift / 2;
  }
  return color;
};
////////

function NetView (svg, network, config) {

  var conf = _(config || {}).clone();
  _(conf).defaults({
    minFirmSize: 10,
    avgFirmSize: 20,
    animationDuration: 200
  });

  var vid = "netview" + (vidMarker++);
  this.id = function() {return vid;};

  var container = svg;
  var width = container.attr("width"),
      height = container.attr("height");

  svg = container.append("g");
  svg.attr("transform", "translate("+(width/2)+","+(height/2)+")");

  var zoom = d3.behavior.zoom()
      .scaleExtent([-10, 10])
      .translate([width/2 , height/2])
      .on("zoom", function() {
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      });
  container.call(zoom);

  var link = svg.append("g").selectAll(".link");
  var firmNode = svg.append("g").selectAll(".firmNode");
  var firmEmpl = svg.append("g").selectAll(".firmEmpl");
  var meanSize = 0;

  var force = d3.layout.force()
      // .charge(-40*conf.avgFirmSize)
      .charge(function(d) {return percSize(-500, -1000, d.firm.numOfAffiliates(), meanSize);})
      .linkStrength(0.1);
      // .friction(.8)
      // .linkDistance(200);
      // .size([width, height]);

  var drag = force.drag()
      .on("dragstart", function() {d3.event.sourceEvent.stopPropagation();})
      .on("dragend", function() {force.start();});


  function nodekey (d) {
    return d.firm.id();
  }

  function firmReport(d) {
    var e = d.firm.numOfEmployees();
    console.groupCollapsed("Firm %s (%s workers)", d.firm.id(), d.firm.numOfAffiliates());
    console.log(
      "Firm %s is %s hiring\n"+
      "\n       Employees: %s"+
      "\n      Unemployed: %s"+
      "\n       Neighbors: %s\n"+
      "\n    hiring prob.: %s %"+
      "\n    firing prob.: %s %"+
      "\n is hiring prob.: %s %\n",
      d.firm.id(),
      (d.firm.state("isHiring") ? "" : "not "),
      e.employed,
      e.unemployed,
      d.firm.neighbors(),
      (d.firm.param("hireProb")*100).toFixed(2),
      (d.firm.param("fireProb")*100).toFixed(2),
      (d.firm.param("isHiringProb")*100).toFixed(2)
    );
    console.groupEnd();
  }

  function refreshView () {

    var links = network.links(),
        nodes = network.firms(),
        firmsNum = nodes.length;

    meanSize = network.numOfAffiliates() / nodes.length;

    nodes = _(nodes).map(function(f, i) {
      if ( f.view[vid] === undefined ) {
        f.view[vid] = {
          firm: f,
          x: Math.random()*100, y: Math.random()*100,
          color: colormap(nextColor())
        };
      }
      // f.view[vid].color = colormap(i / firmsNum);

      return f.view[vid];
    });

    links = _(links).map(function(l) {
      return {source: l.source.view[vid], target: l.target.view[vid]};
    });

    link = link.data(links);
    link.exit().remove();
    link.enter().append("line")
        .attr("class", "link");

    firmNode = firmNode.data(nodes, nodekey);
    firmNode.exit().remove();
    firmNode.enter().append("circle")
        .attr("class", "firmNode")
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .on("click", firmReport)
        // .style("stroke", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
        // .style("fill", function(d) {return d.color;})
        .style("fill", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
        .call(drag);

    firmNode.attr("r", function(d){
      return percSize(conf.minFirmSize, conf.avgFirmSize,  d.firm.numOfAffiliates(), meanSize);
    });

    firmNode.append("title")
        .text(function(d) { return d.firm.id(); });

    firmEmpl = firmEmpl.data(nodes, nodekey);
    firmEmpl.exit().remove();
    firmEmpl.enter().append("circle")
        .attr("class", "firmEmpl")
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .style("fill", function(d) {return d.color;})
        .on("click", firmReport)
        .call(drag);

    firmEmpl.attr("r", function(d){
      return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().employed, meanSize);
    });


    force.nodes(nodes)
         .links(links)
         .start();

  }

  function updateView () {
    firmNode.transition().duration(interval)
      .attr("r", function(d){
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfAffiliates(), meanSize);
      });
    firmEmpl.transition().duration(interval)
      .attr("r", function(d){
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().employed, meanSize);
      });
  }

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    firmNode.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    firmEmpl.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
  });


  // this.layout = force;

  this.model = function() { return network; };

  // THIS IS TEMPORARY, JUST FOR DEMO --- will be refactored into a controller component
  var timer, interval = 300;
  this.start = function(interv) {
    if ( arguments.length === 0 )
      interval = 300;
    else
      interval = interv;
    if ( timer ) this.stop();
    timer = setInterval(this.step, interval);
  };

  this.stop = function() {
    clearInterval(timer);
    timer = undefined;
  };

  this.running = function() {return (timer !== undefined);};

  this.step = function(num) {
    network.step(num);
  };
  /////////////////

  this.layout = function() {
    force.start();
  };

  this.destroy = function() {
    _(network.firms()).each(function(f) {
      delete f.view[vid];
    });
    network.off("networkChange", refreshView);
    network.off("simulationStep", updateView);
    svg.remove();
  };

  refreshView();

  network.on("networkChange", refreshView);
  network.on("simulationStep", updateView);
}


return NetView;

});