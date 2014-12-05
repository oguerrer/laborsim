define([
  "underscore",
  "jquery",
  "d3",
  "laborflows/model/network",
  "laborflows/views/netview"
], function(_, $, d3, Network, NetView) {

  var svg = d3.select("svg#simulation-netview")
      .attr("width", $(window).width())
      .attr("height", $(window).height());

  var network = new Network();

  var firms = {};

  _(["B", "C", "D", "E"]).each(function(d) {
    firms[d] = {workers: [
        {num: Math.random()*10, employed: true},
        {num: Math.random()*10, employed: false}
      ]};
  });
  firms["A"] = {workers: [{num:10}, {num:10, employed:false}]};

  network.addFirm(firms);
  network.link("A", ["B", "C", "D"], true);
  network.link("E", ["D", "B"], true);

  var view = new NetView(svg, network);

  console.log("LaborFlows rocks");

  return {net: network, view: view};
//
// return network;
});