define([
  "underscore",
  "jquery",
  "d3",
  "random",
  "laborflows/model/network",
  "laborflows/views/netview",
  "semanticui"
], function(_, $, d3, Random, Network, NetView) {

$(window).resize(function() {
  $("svg").height(function() {return $(this).parent().height();})
          .width(function() {return $(this).parent().width();});
});

var rand = new Random(Random.engines.mt19937().autoSeed());


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

var svg = d3.select("svg#simulation-netview")
    .attr("width", $("#simulation").innerWidth())
    .attr("height",  $("#simulation").innerHeight());

var view = new NetView(svg, network);

var lastRandFirm = 0;
// $("#simulation").prepend('<div id="random-firms" class="ui right labeled icon button"><i class="wizard icon"></i>Insert 10 random firms</div>');
$(document).ready(function () {

$(window).resize();

$(".with.popup").popup();
// $("#speed-simulation").popup({on: 'click', inline:true, hoverable:true, position: "top center"});
$("#speed-simulation").dropdown({action: 'nothing'});

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

var speed = 200;
// $("#simulation").prepend('<div id="toggle-simulation" class="ui right labeled icon button"><i class="play icon"></i>Run</div>');
$("#toggle-simulation").on("click", function() {
  if(view.running()){
    view.stop();
  } else {
    view.start(speed);
  }
  $(this).children("i").toggleClass("play pause");
});

$("#layout-simulation").on("click", function() {
  view.layout();
});
$("#slower-speed").on("click", function() {
  speed+=20;
  if(view.running()) view.start(speed);
});
$("#faster-speed").on("click", function() {
  speed-=20; if(speed < 0) speed = 0;
  if(view.running()) view.start(speed);
});

$("#shutdown-firm").click(function(e){
  if (selectedFirm === null) return;
  selectedFirm.param('fireProb', 1);
  selectedFirm.param('hireProb', 0);
});

$('#firm-info .ui.progress').progress({
  performance: false, debug: false,
  autoSuccess: false,
  showActivity : false
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

// new NetView(d3.select("svg#chart"), network); // just for bunter

console.log("LaborFlows rocks");
});

return {net: network, view: view};

});