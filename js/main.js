define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview",
  "laborflows/views/firmview",
  "laborflows/controllers/simulation",
  "semanticui",
  "ui/probabilitybar"
], function(_, $, d3, Random, Network, NetView, FirmView, Simulation) {

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

$('#network-info .is-hiring-prob').probability({
  onUserSetValue: function(p) {
    network.isHiringProb(p);
  }
});

network.on("networkChange", updateNetworkInfo);
network.on("simulationStep", updateNetworkInfo);


function updateNetworkInfo (e) {
  var w = network.numOfEmployees();
  var tot = network.numOfAffiliates();
  $("#network-info .totals").text(network.numOfFirms() + " firms, " + tot + " workers");
  $("#network-info .employed").text(w.employed + " (" + Math.round(w.employed/tot * 100) + "%)");
  $("#network-info .unemployed").text(w.unemployed + " (" + Math.round(w.unemployed/tot * 100) + "%)");
  if (!e || e.eventType === "networkChange")
    $("#network-info .is-hiring-prob").probability("value", network.isHiringProb());
}
updateNetworkInfo();

new FirmView("#selected-firm", netview);

$(window).resize();

$(".with.popup").popup();

console.log("LaborFlows rocks");

return {net: network, netview: netview};

});