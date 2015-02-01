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
  "laborflows/metrics/steadystate",
  "laborflows/controllers/unemployment",
  "laborflows/controllers/volatility",
  "laborflows/controllers/beveridge",
  "semanticui"
], function(_, $, d3, Random, Network, NetView, FirmView, NetInfo, Simulation, SteadyStateMetrics, UnemploymentChart, VolatilityChart, Beveridge) {

$(window).resize(function() {
  $("svg")
    .height(function() {return $(this).parent().innerHeight();})
    .width(function() {return $(this).parent().innerWidth();})
    .attr("width", function() {return $(this).width();})
    .attr("height", function() {return $(this).height();});
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
      // hireProb: rand.real(0,1),
      // fireProb: rand.real(0,1),
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

$(window).resize();

var svg = d3.select("svg#simulation-netview");

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

$("#network-info .add-firm").click(function() {
  var id = "F"+lastRandFirm;
  network.addFirm(id, {
    // hireProb: rand.real(0,1),
    // fireProb: rand.real(0,1),
    neighbors: netview.selected(),
    workers: [
      {num: rand.integer(10,100), employed: true},
      {num: rand.integer(10,100), employed: false}
    ]
  });
  netview.select(id);
  lastRandFirm++;
});


var steady = new SteadyStateMetrics(network);

var uchart = new UnemploymentChart(".unemployment-rate", network, steady);

var vchart = new VolatilityChart(".unemployment-volatility", network, steady);

$(".unemployment-volatility .crop").click(function() {
  var btn = $(this);
  btn.toggleClass("black");
  uchart.timeWindowEnabled(btn.hasClass("black"));
});
uchart.on("timeWindowChange", function(e) {
  vchart.metric().timeWindow(e.timeWindow);
});

var bvchart = new Beveridge(".beveridge", network);

$(".card .extra .header").click(function() {
  $(this).parent().parent().toggleClass("collapsed");
  $(window).resize();
});

$(".with.popup").popup();

$("#search-bar")
  .on("focusin", function() {$(this).width(200).addClass("focus");})
  .on("mouseenter", function() {$(this).width(200);})
  .on("mouseout", function() {$(this).width($(this).hasClass("focus") ? 200 : 100);})
  .on("focusout", function() {$(this).width(100).removeClass("focus error").find("input").val("");});
$("#search-bar input").on("keydown", function( event ) {
  $(this).parent().removeClass("error");
  event.stopPropagation();
  if (event.keyCode == 27) { // ESC
    this.blur();
  } else if (event.keyCode == 13) { // ENTER
    event.preventDefault();
    var sel = [];
    var query = $(this).val();
    var firms = network.firms();
    for(var i in firms){
      if (firms[i].id().search(query) != -1) {
        sel.push(firms[i].id());
      }
    }
    if ( sel.length == 0 ) $(this).parent().addClass("error");
    netview.select(sel);
  }
});

$(window).keydown(function( event ) {
  // console.log(event, event.keyCode);
  switch (event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        network.removeFirm(netview.selected());
        break;
      }
      case 65: { // delete
        if (event.ctrlKey) {
          if (event.shiftKey)
            netview.unselectAll();
          else
            netview.select(network.firms());
          event.preventDefault();
        }
        break;
      }
      case 70: { // find
        if (event.ctrlKey) {
          event.preventDefault();
          $("#search-bar input").focus();
        }
        break;
      }
    }
});

console.log("LaborFlows rocks");

return {net: network, netview: netview};

});