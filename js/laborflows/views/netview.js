define([
  "underscore",
  "jquery",
  "d3",
  "chroma",
  "laborflows/events",
  "laborflows/model/network"
], function(_, $, d3, chroma, events, Network) {

var vidMarker = 0;

function percSize (min, max, size, tot) {
  if ( tot === 0 ) {
    return min;
  } else {
    return min + ( size / tot * ( max - min ) );
  }
}

///// @todo: find a better home for color index generator
var colormap = chroma.scale(["red", "green", "blue"]).mode('lab');

var colorShift = 1;
var colorCount = 0;
var nextColor = function() {
  var color = (colorShift / 2) + (colorCount * colorShift);
  if (color < 1){
    colorCount++;
  } else {
    colorShift = colorShift / 2;
    colorCount = 1;
    color = colorShift / 2;
  }
  return color;
};
////////////////////////////////////////////////// TO BE REMOVED

function NetView (svg, network, config) {
  if (!(this instanceof NetView)) {return new NetView(svg, network, config);}

  if ( _(svg).isString() ) svg = d3.select(svg);

  var firmElems = {};

  var conf = _(config || {}).clone();
  _(conf).defaults({
    minFirmSize: 3,
    avgFirmSize: 20,
    animationDuration: 200
  });

  this.animationDuration = conf.animationDuration;

  var vid = "netview" + (vidMarker++);
  this.id = function() {return vid;};

  var netview = this;
  events(this, ["selectionChange"]);

  var container = svg;
  var width = container.attr("width"),
      height = container.attr("height");

  var focus = { x: 0, y:0 };
  this.focus = focus;

  svg = container.append("g");
  svg.attr("transform", "translate("+(width/2)+","+(height/2)+")");

  var zoom = d3.behavior.zoom()
      .scaleExtent([-10, 10])
      .translate([width/2 , height/2])
      .on("zoomstart", function() {
        this.zoomPerformed = false;
      })
      .on("zoom", function() {
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        this.zoomPerformed = true;
      })
      .on("zoomend", function() {
        if ( !this.zoomPerformed )
          netview.unselectAll();
      });
  container.call(zoom);

  var link     = svg.append("g").selectAll(".firmLink");
  var firmSel  = svg.append("g").selectAll(".firmSel");
  var firmNode = svg.append("g").selectAll(".firmNode");
  var firmEmpl = svg.append("g").selectAll(".firmEmpl");
  var meanSize = 0;

  var force = d3.layout.force()
      // .charge(-40*conf.avgFirmSize)
      .charge(function(d) {return percSize(-500, -1500, d.firm.numOfAffiliates(), meanSize);})
      .alpha(5)
      .linkStrength(0.1);
      // .friction(.8)
      // .linkDistance(200);
      // .size([width, height]);

  var drag = force.drag()
      .on("dragstart", function() {d3.event.sourceEvent.stopPropagation();});


  function nodekey (d) {
    return d.firm.id();
  }

  function refreshView () {

    var links = network.links(),
        firms = network.firms(),
        firmsNum = firms.length,
        selFirms;

    meanSize = network.numOfAffiliates() / firms.length;

    firms = _(firms).map(function(f, i) {
      if ( f.view[vid] === undefined ) {
        f.view[vid] = {
          firm: f,
          x: focus.x+200-Math.random()*400, y: focus.y+200-Math.random()*400,
          color: colormap(nextColor())
        };
      }
      // f.view[vid].color = colormap(i / firmsNum);

      return f.view[vid];
    });

    links = _(links).map(function(l) {
      return {source: l.source.view[vid], target: l.target.view[vid]};
    });


    link = link.data(links);
    link.exit().remove();
    link.enter().append("line")
        .attr("class", "firmLink");

    firmNode = firmNode.data(firms, nodekey);
    firmNode.exit().each(function(d) {
      delete firmElems[d.firm.id()];
      delete selectedFirms[d.firm.id()];
    }).remove();
    firmNode.enter().append("circle")
        .attr("class", "firmNode")
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .style("fill", function(d) {return chroma.interpolate(d.color, "white", 0.7, "lab");})
        .each(function(d) {firmElems[d.firm.id()] = {unemployed: this};})
        .call(drag)
        .append("title").text(function(d) { return d.firm.id(); });

    firmNode.attr("r", function(d){
      return percSize(conf.minFirmSize, conf.avgFirmSize,  d.firm.numOfAffiliates(), meanSize);
    });

    selFirms = _(selectedFirms).map(function(f, i) {
      return f.view[vid];
    });
    firmSel = firmSel.data(selFirms, nodekey);
    firmSel.exit().remove();

    firmEmpl = firmEmpl.data(firms, nodekey);
    firmEmpl.exit().remove();
    firmEmpl.enter().append("circle")
        .attr("class", "firmEmpl")
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .style("fill", function(d) {return d.color;})
        .on("click", function(d) {
          if ( d3.event.shiftKey )
            netview.toggleSelected(d.firm.id());
          else
            netview.select(d.firm.id());
        })
        .each(function(d) {
          firmElems[d.firm.id()].employed = this;
        })
        .call(drag)
        .append("title").text(function(d) { return d.firm.id(); });

    firmEmpl.attr("r", function(d){
      return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().employed, meanSize);
    });


    force.nodes(firms)
         .links(links)
         .start();

  }

  function updateView () {
    firmNode.transition().duration(netview.animationDuration)
      .attr("r", function(d){
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfAffiliates(), meanSize);
      });
    firmEmpl.transition().duration(netview.animationDuration)
      .attr("r", function(d){
        return percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfEmployees().employed, meanSize);
      });

    var selFirms = _(selectedFirms).map(function(f, i) {
      return f.view[vid];
    });
    firmSel = firmSel.data(selFirms, nodekey);
    firmSel.exit().remove();
    firmSel.enter().append("circle")
      .attr("class", "firmSel")
      .attr("cx", function(d){return d.x;})
      .attr("cy", function(d){return d.y;});

    firmSel.transition().duration(netview.animationDuration)
      .attr("r", function(d){
        return 5 + percSize(conf.minFirmSize, conf.avgFirmSize, d.firm.numOfAffiliates(), meanSize);
      });
  }

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    firmNode.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    firmEmpl.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    firmSel.attr("cx", function(d) { return d.x; })
           .attr("cy", function(d) { return d.y; });
  });


  // this.layout = force;

  this.model = function() { return network; };

  this.layout = function() {
    force.start();
  };

  this.firmView = function(id) {
    return _(firmElems[id]).clone();
  };

  var selectedFirms = {};

  function _selectionInfo (id) {
    return network.firm(id);
  }

  function _triggerSelChange (action, changed) {
    updateView();
    var sel = _(selectedFirms).values()[0];
    if ( sel ) {
      focus.x = sel.view[vid].x;
      focus.y = sel.view[vid].y;
    } else {
      focus.x = 0;
      focus.y = 0;
    }
    netview.trigger("selectionChange", {action: action, changed: changed});
  }

  this.select = function(ids) {
    if ( arguments.length !== 1 ) throw Error("select needs a FirmId");
    if ( ! _(ids).isArray() ) ids = [ids];
    selectedFirms = {};
    for (var i in ids) {
      selectedFirms[ids[i]] = _selectionInfo(ids[i]);
    }
    _triggerSelChange("select", ids);
    return this;
  };

  this.selected = function(ids, val) {
    if ( arguments.length === 0 ) {
      return _(selectedFirms).values();
    }
    if ( arguments.length === 1 )
      return _(selectedFirms).has(ids);
    if ( ! _(ids).isArray() ) ids = [ids];
    for (var i in ids) {
      if ( val === false )
        delete selectedFirms[ids[i]];
      else
        selectedFirms[ids[i]] = _selectionInfo(ids[i]);
    }
    _triggerSelChange(val ? "add" : "remove", ids);
    return this;
  };

  this.toggleSelected = function(id) {
    if ( arguments.length !== 1 ) throw Error("toggleSelected needs a FirmId");
    var val = _(selectedFirms).has(id);
    if ( val )
      delete selectedFirms[id];
    else
      selectedFirms[id] = _selectionInfo(id);
    _triggerSelChange(val ? "remove" : "add", [id]);
    return this;
  };

  this.unselectAll = function() {
    selectedFirms = {};
    _triggerSelChange("reset");
    return this;
  };

  this.network = function() {
    return network;
  };

  this.destroy = function() {
    _(network.firms()).each(function(f) {
      delete f.view[vid];
    });
    network.off("networkChange", refreshView);
    network.off("simulationStep", updateView);
    svg.remove();
  };

  refreshView();

  network.on("networkChange", refreshView);
  network.on("simulationStep", updateView);
}


return NetView;

});