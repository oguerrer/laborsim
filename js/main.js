define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview",
  "laborflows/views/firmview",
  "laborflows/views/netinfo",
  "laborflows/controllers/simulation",
  "semanticui",
  "ui/probabilitybar"
], function(_, $, d3, Random, Network, NetView, FirmView, NetInfo, Simulation) {

$(window).resize(function() {
  $("svg").height(function() {return $(this).parent().height();})
          .width(function() {return $(this).parent().width();});
});

var rand = new Random(Random.engines.mt19937().autoSeed());


var network = new Network();

var lastRandFirm = 0;
var addRandomFirms = function() {
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
};
addRandomFirms();

$("#random-firms").on("click", addRandomFirms);


var svg = d3.select("svg#simulation-netview")
    .attr("width", $("#simulation").innerWidth())
    .attr("height",  $("#simulation").innerHeight());

var netview = new NetView(svg, network);

var sim = new Simulation("#simulator-controls", network);

sim.on("speedChange", function(e) {
  netview.animationDuration = e.delay;
  $("#speed-val").text(Math.ceil((1 - e.perc) * 100)+"%");
});
sim.stepDelay(300);

$("#layout-simulation").on("click", function() {
  netview.layout();
});

new FirmView("#selected-firm", netview);
new NetInfo("#network-info", network);

$(window).resize();

$(".with.popup").popup();

console.log("LaborFlows rocks");

return {net: network, netview: netview};

});