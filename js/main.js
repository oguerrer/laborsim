define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview",
  "laborflows/controllers/simulation",
  "semanticui",
  "ui/probabilitybar"
], function(_, $, d3, Random, Network, NetView, Simulation) {

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

var view = new NetView(svg, network);

var sim = new Simulation("#simulator-controls", network);

sim.on("speedChange", function(e) {
  view.animationDuration = e.delay;
  $("#speed-val").text(Math.ceil((1 - e.perc) * 100)+"%");
});
sim.stepDelay(300);

$("#layout-simulation").on("click", function() {
  view.layout();
});

$("#shutdown-firm").click(function(e){
  if (selectedFirm === null) return;
  selectedFirm.param('fireProb', 1);
  selectedFirm.param('hireProb', 0);
});
$("#remove-firm").click(function(e){
  if (selectedFirm === null) return;
  network.removeFirm(selectedFirm);
});

$('#selected-firm .fire-prob').probabilitybar({
  setValue: function(p) {
    selectedFirm.param("fireProb", p);
  }
});
$('#selected-firm .hire-prob').probabilitybar({
  setValue: function(p) {
    selectedFirm.param("hireProb", p);
  }
});

$('#network-info .is-hiring-prob').probabilitybar({
  setValue: function(p) {
    network.isHiringProb(p);
  }
});

var selectedFirm = null;

network.on("networkChange", function(diff) {
  if (selectedFirm !== null && _(diff.firmsChanged).has(selectedFirm.id())) {
    updateFirmInfo();
  }
  updateNetworkInfo();
  $("#network-info .is-hiring-prob").probability(network.isHiringProb());
});
network.on("simulationStep", function() {
  updateFirmInfo();
  updateNetworkInfo();
});

function updateNetworkInfo () {
  var w = network.numOfEmployees();
  var tot = network.numOfAffiliates();
  $("#network-info .totals").text(network.numOfFirms() + " firms, " + tot + " workers");
  $("#network-info .employed").text(w.employed + " (" + Math.round(w.employed/tot * 100) + "%)");
  $("#network-info .unemployed").text(w.unemployed + " (" + Math.round(w.unemployed/tot * 100) + "%)");
}
updateNetworkInfo();
$("#network-info .ui.progress").progress('set percent', network.isHiringProb());

function unsetFirmInfo (e) {
  selectedFirm = null;
  $("#selected-firm").css("border-color", "black");
  $("#selected-firm .name").text('---');
  $("#selected-firm .name").text('---');
  $("#selected-firm .employed").text('---');
  $("#selected-firm .unemployed").text('---');
  $("#selected-firm .ui.progress").addClass('disabled').probability(0);
  // $("#selected-firm .hire-prob").addClass('disabled');
}
unsetFirmInfo();

function updateFirmInfo () {
  var f = selectedFirm, p;
  if (f === null) return;
  if (!f.exists()) {
    selectedFirm = null;
    unsetFirmInfo();
    return;
  }
  var w = f.numOfEmployees();
  $("#selected-firm .name").text("Firm "+f.id());
  $("#selected-firm .employed").text(w.employed);
  $("#selected-firm .unemployed").text(w.unemployed);
  $("#selected-firm .fire-prob").removeClass('disabled');
  p = f.param("fireProb");
  $("#selected-firm .fire-prob").probability(p);
  $("#selected-firm .hire-prob").removeClass('disabled');
  p = f.param("hireProb");
  $("#selected-firm .hire-prob").probability(p);
}

view.on("firmSelected", function(e){
  selectedFirm = e.firm;
  $("#selected-firm").css("border-color", e.firmView.color);
  updateFirmInfo();
});
view.on("firmUnselected", unsetFirmInfo);


$(window).resize();

$(".with.popup").popup();

console.log("LaborFlows rocks");

return {net: network, view: view};

});