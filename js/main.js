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
  "laborflows/controllers/unemployment",
  "laborflows/controllers/volatility",
  "laborflows/controllers/beveridge",
  "semanticui"
], function(_, $, d3, Random, Network, NetView, FirmView, NetInfo, Simulation, UnemploymentChart, VolatilityChart, Beveridge) {

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
    hireProb: rand.real(0,1),
    fireProb: rand.real(0,1),
    isHiringProb: rand.real(0,1),
    neighbors: netview.selected(),
    workers: [
      {num: rand.integer(10,100), employed: true},
      {num: rand.integer(10,100), employed: false}
    ]
  });
  netview.select(id);
  lastRandFirm++;
});


var uchart = new UnemploymentChart(".unemployment-rate", network);

var vchart = new VolatilityChart(".unemployment-volatility", network);

$(".unemployment-volatility .lock").click(function() {
  var btn = $(this);
  btn.toggleClass("black");
  if ( btn.hasClass("black") ) {
    vchart.metric().timeWindow(uchart.chart().timeFrame());
  } else {
    vchart.metric().timeWindow(100);
  }
}).click();

var bvchart = new Beveridge(".beveridge", network);

$(".with.popup").popup();

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
    }
});

console.log("LaborFlows rocks");

return {net: network, netview: netview};

});