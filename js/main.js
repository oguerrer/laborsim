define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview",
  "laborflows/controllers/simulation",
  "semanticui"
], function(_, $, d3, Random, Network, NetView, Simulation) {

$(window).resize(function() {
  $("svg").height(function() {return $(this).parent().height();})
          .width(function() {return $(this).parent().width();});
});

var rand = new Random(Random.engines.mt19937().autoSeed());


var network = new Network();

// SETUP SOME DUMMY FIRMS
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
////////////////////////////


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

var lastRandFirm = 0;
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

$("#layout-simulation").on("click", function() {
  view.layout();
});

$("#shutdown-firm").click(function(e){
  if (selectedFirm === null) return;
  selectedFirm.param('fireProb', 1);
  selectedFirm.param('hireProb', 0);
});

$('#firm-info .ui.progress').progress({
  performance: false, debug: false,
  autoSuccess: false,
  showActivity: false
});

$("#firm-info .fire-prob").click(function(e){
  if (selectedFirm === null) return;
  var bar = $(this);
  var p = e.offsetX / bar.width();
  selectedFirm.param("fireProb", p);
});
$("#firm-info .hire-prob").click(function(e){
  if (selectedFirm === null) return;
  var bar = $(this);
  var p = e.offsetX / bar.width();
  selectedFirm.param("hireProb", p);
});

var selectedFirm = null;

network.on("networkChange", function(diff) {
  if (selectedFirm !== null && _(diff.firmsChanged).has(selectedFirm.id())) {
    updateFirmInfo();
  }
});
network.on("simulationStep", function() {
  updateFirmInfo();
});

function updateFirmInfo () {
  var f = selectedFirm, p;
  if (f === null) return;
  var w = f.numOfEmployees();
  $("#firm-info .name").text("Firm "+f.id());
  $("#firm-info .employed").text(w.employed);
  $("#firm-info .unemployed").text(w.unemployed);
  $("#firm-info .fire-prob").removeClass('disabled');
  p = f.param("fireProb");
  $("#firm-info .fire-prob").progress('set percent',(p<1?p:100));
  $("#firm-info .hire-prob").removeClass('disabled');
  p = f.param("hireProb");
  $("#firm-info .hire-prob").progress('set percent',(p<1?p:100));
}

view.on("firmSelected", function(e){
  selectedFirm = e.firm;
  $("#firm-info").css("border-color", e.firmView.color);
  updateFirmInfo();
});
view.on("firmUnselected", function(e){
  selectedFirm = null;
  $("#firm-info").css("border-color", "black");
  $("#firm-info .name").text('---');
  $("#firm-info .name").text('---');
  $("#firm-info .employed").text('---');
  $("#firm-info .unemployed").text('---');
  $("#firm-info .ui.progress").addClass('disabled').progress('set percent',0);
  // $("#firm-info .hire-prob").addClass('disabled');
});


$(window).resize();

$(".with.popup").popup();

console.log("LaborFlows rocks");

return {net: network, view: view};

});