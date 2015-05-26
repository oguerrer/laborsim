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

  network.on(["networkReset", "networkChange"], initNetworkInfo);
  network.on("simulationStep", updateNetworkInfo);

  function updateNetworkInfo (diff) {
    var tot = diff.employed + diff.unemployed;
    employed.text(diff.employed + " (" + Math.round(diff.employed/tot * 100) + "%)");
    unemployed.text(diff.unemployed + " (" + Math.round(diff.unemployed/tot * 100) + "%)");
  }

  function initNetworkInfo () {
    var w = network.numOfEmployees();
    var tot = network.numOfAffiliates();
    totals.text(network.numOfFirms() + " firms, " + tot + " workers");
    employed.text(w.employed + " (" + perc(w.employed, tot) + ")");
    unemployed.text(w.unemployed + " (" + perc(w.unemployed, tot) + ")");
    isHiringProb.probability("value", network.isHiringProb());
  }

  function perc(x, tot) {
    if (tot > 0) {
      return Math.round(x/tot * 100) + "%";
    } else {
      return "– %";
    }
  }

  initNetworkInfo();

  this.destroy = function() {
    netinfo.remove();
    network.off("networkReset", initNetworkInfo);
    network.off("networkChange", initNetworkInfo);
    network.off("simulationStep", updateNetworkInfo);
  };
}

return NetInfo;
});