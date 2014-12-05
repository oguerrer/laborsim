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
var colormap = chroma.scale(["red", "green", "blue"]);

function NetView (svg, network, config) {

  var conf = _(config || {}).clone();
  _(conf).defaults({
    minFirmSize: 10,
    avgFirmSize: 20,
    animationDuration: 200
  });

  var vid = "netview" + (vidMarker++);
  this.id = function() {return vid;};
  this.c = chroma;

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


  var force = d3.layout.force()
      // .charge(-40*conf.avgFirmSize)
      .charge(function(d) {return -10*d.firm.numOfAffiliates();})
      .linkStrength(0.1);
      // .friction(.8)
      // .linkDistance(200);
      // .size([width, height]);


  var graph = {};
  var link = svg.append("g").selectAll(".link");
  var firmNode = svg.append("g").selectAll(".firmNode");
  var firmEmpl = svg.append("g").selectAll(".firmEmpl");


  function prepareGraph () {
    var links = network.links(),
        nodes = network.firms(),
        firmsNum = nodes.length;

    nodes = _(nodes).map(function(f, i) {
      f.view[vid] = f.view[vid] || {
        firm: f,
        r: 5+Math.random()*50,
        x: Math.random()*100, y: Math.random()*100,
        // color: colormap(i / firmsNum)
      };
      return f.view[vid];
    });

    _(nodes).each(function(f, i) {
      f.color = colormap(i / firmsNum);
    });

    links = _(links).map(function(l) {
      return {source: l.source.view[vid], target: l.target.view[vid]};
    });
    return {links: links, nodes: nodes};
  }

  function nodekey (d) {
    return d.firm.id();
  }

  function refreshView () {

    graph = prepareGraph();

    var avgEmpl = network.numOfAffiliates() / graph.nodes.length;

    link = link.data(graph.links);
    link.exit().remove();
    link.enter().append("line")
        .attr("class", "link");

    firmNode = firmNode.data(graph.nodes, nodekey);
    firmNode.exit().remove();
    firmNode.enter().append("circle")
        .attr("class", "firmNode")
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .on("click", function(d) {
          console.info(d.firm.id(), d.firm);
        })
        .style("stroke", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
        .style("fill", function(d) {return d.color;})
        .call(force.drag().on("dragstart", function() {d3.event.sourceEvent.stopPropagation();}));

    firmNode.attr("r", function(d){
      return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfAffiliates(), avgEmpl);
    });
    firmNode
      .style("stroke", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
      .style("fill", function(d) {return d.color;})
      .style("stroke-width", function(d) {
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().unemployed, avgEmpl);
      });

    firmNode.append("title")
        .text(function(d) { return d.firm.id(); });

    // firmEmpl = firmEmpl.data(graph.nodes, nodekey);
    // firmEmpl.exit().remove();
    // firmEmpl.enter().append("circle")
    //     .attr("class", "firmEmpl")
    //     .attr("cx", function(d){return d.x;})
    //     .attr("cy", function(d){return d.y;})
    //     .style("fill", function(d) {return d.color;})
    //     .call(force.drag);

    // firmEmpl.attr("r", function(d){
    //   return percSize(5, 100, d.firm.numOfEmployees().employed, totEmpl);
    // });


    force.nodes(graph.nodes)
         .links(graph.links)
         .start();

  }

  var smooth;
  function updateView () {
    var avgEmpl = network.numOfAffiliates() / graph.nodes.length;
    var nodes = smooth ? firmNode.transition().duration(conf.animationDuration) : firmNode;
    nodes
      .attr("r", function(d){
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfAffiliates(), avgEmpl);
      })
      .style("stroke-width", function(d) {
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().unemployed, avgEmpl);
      });
  }

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    firmNode.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
    // firmEmpl.attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; });
  });


  // this.layout = force;

  this.model = function() { return network; };

  // THIS IS TEMPORARY, JUST FOR DEMO --- will be refactored into a controller component
  var timer;
  this.start = function(interval) {
    if ( arguments.length === 0 ) interval = 300;
    smooth = (interval >= (conf.animationDuration + 75));
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