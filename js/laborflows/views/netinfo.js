define([
  "underscore",
  "jquery",
  "d3",
  "semanticui",
  "ui/probabilitybar"
], function(_, $, d3) {

function NetInfo(domNode, network) {
  if (!(this instanceof NetInfo)) {return new NetInfo(network);}

  var netinfo = $( domNode ),
      isHiringProb = netinfo.find('.is-hiring-prob'),
      totals = netinfo.find('.totals'),
      employed = netinfo.find('.employed'),
      unemployed = netinfo.find('.unemployed');


  isHiringProb.probability({
    onUserSetValue: function(p) {
      network.isHiringProb(p);
    }
  });

  network.on("networkChange", updateNetworkInfo);
  network.on("simulationStep", updateNetworkInfo);

  function updateNetworkInfo (e) {
    var w = network.numOfEmployees();
    var tot = network.numOfAffiliates();
    totals.text(network.numOfFirms() + " firms, " + tot + " workers");
    employed.text(w.employed + " (" + Math.round(w.employed/tot * 100) + "%)");
    unemployed.text(w.unemployed + " (" + Math.round(w.unemployed/tot * 100) + "%)");
    if (!e || e.eventType === "networkChange")
      isHiringProb.probability("value", network.isHiringProb());
  }
  updateNetworkInfo();

  this.destroy = function() {
    netinfo.remove();
    network.off("networkChange", updateNetworkInfo);
    network.off("simulationStep", updateNetworkInfo);
  };
}

return NetInfo;
});