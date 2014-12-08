define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview"
], function(_, $, d3, Random, Network, NetView) {

var rand = new Random(Random.engines.mt19937().autoSeed());

var svg = d3.select("svg#simulation-netview")
    .attr("width", $("#simulation-view").innerWidth())
    .attr("height",  $("#simulation-view").innerHeight()-50);

var network = new Network();

var firms = {};

_(["A", "B", "C", "D", "E"]).each(function(d) {
  firms[d] = {workers: [
      {num: rand.integer(10,100), employed: true},
      {num: rand.integer(10,100), employed: false}
    ]};
});

network.addFirm(firms);
network.link("A", ["B", "C", "D"], true);
network.link("E", ["D", "B"], true);

var view = new NetView(svg, network);

var lastRandFirm = 0;
$("#simulation-view").prepend('<button id="random-firms">Insert 10 random firms</button>');
$("#random-firms").on("click", function() {
  var rfirms = {}, i, N = 10;
  var all = _(network.firms()).values();
  for( i=0; i < N; i++ ) all.push("F"+(lastRandFirm+i));

  for( i=0; i < N; i++ ){
    rfirms["F"+lastRandFirm] = {
      hireProb: rand.real(0,1),
      fireProb: rand.real(0,1),
      isHiringProb: rand.real(0,1),
      neighbors: rand.sample(all, rand.integer(1, Math.min(3, all.length))),
      workers: [
        {num: rand.integer(10,100), employed: true},
        {num: rand.integer(10,100), employed: false}
      ]
    };
    lastRandFirm++;
  }
  network.addFirm(rfirms);
});

$("#simulation-view").prepend('<button id="toggle-simulation">Start/stop</button>');
$("#toggle-simulation").on("click", function() {
  if(view.running())
    view.stop();
  else
    view.start(200);
});

console.log("LaborFlows rocks");

return {net: network, view: view};

});