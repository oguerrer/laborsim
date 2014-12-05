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
var colormap = chroma.scale("Set1");

function NetView (svg, network) {

  var vid = "netview" + (vidMarker++);
  this.id = function() {return vid;};
  this.c = chroma;

  // svg = d3.select(svg);
  var width = svg.attr("width"),
      height = svg.attr("height");

  svg = svg.append("g");
  svg.attr("transform", "translate("+(width/2)+","+(height/2)+")");

  var force = d3.layout.force()
      .charge(function(d){return -100*(d.r || 10);})
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
        color: colormap(i / firmsNum)
      };
      return f.view[vid];
    });

    links = _(links).map(function(l) {
      return {source: l.source.view[vid], target: l.target.view[vid]};
    });
    return {links: links, nodes: nodes};
  }

  function nodekey (d) {
    return d.firm.id();
  }

  function updateView () {

    graph = prepareGraph();

    var totEmpl = network.numOfAffiliates();

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
          console.info(d.firm);
        })
        .style("stroke", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
        .style("fill", function(d) {return d.color;})
        .call(force.drag);

    firmNode.attr("r", function(d){
      return percSize(1, 100, d.firm.numOfAffiliates(), totEmpl);
    });
    firmNode.style("stroke-width", function(d) {
      return percSize(1, 100, d.firm.numOfEmployees().unemployed, totEmpl);
    })

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


  this.layout = force;

  this.model = function() { return network; };

  this.destroy = function() {
    _(network.firms()).each(function(f) {
      delete f.view[vid];
    });
    network.off("network-change", updateView);
    svg.remove();
  };

  updateView();

  network.on("network-change", updateView);
}


return NetView;

});