/**
 * @module laborflows/network
 * @author Emanuele D'Osualdo
 *
 * A model of the network of firms.
 * It stores an *undirected* graph of firms.
 *
 */

define([
  "underscore",
  "laborflows/events"
], function(_, events){

/**
 * A firm is identified by a string id
 *
 * @typedef {string} FirmId
 *
 * Undirected edges between firms can be labelled with arbitrary data
 * and are stored in a map from couples of firm ids to labels.
 *
 * Any falsey label is interpreted as absence of the edge.
 *
 * @typedef {Object.<FirmId, Object.<FirmId, *>>} AdjMap
 */

/**
 * @type {AdjMap}
 * US spelling to be consistent with `labor`
 */
var neighbors = {};

var net = {
  firms: function() {
    var fs = [];
    for(var f in neighbors){
      fs.push(f);
    }
    return fs;
  },

  addFirm: function(f) {
    if( !(f in neighbors) ) neighbors[f] = {};
    this.trigger("firms-add", {added: f});
    return this;
  },

  addFirms: function(fs) {
    var frms = fs;
    if ( arguments.length > 1 || !(_.isArray(fs)) ){
      frms = arguments;
    }
    for( var f in frms ){
      if( !(frms[f] in neighbors) ) neighbors[frms[f]] = {};
    }
    this.trigger("firms-add", {added: frms});
    return this;
  },

  removeFirm: function(f) {
    if ( f in neighbors ) {
      for( var g in neighbors[f] ){
        delete neighbors[g][f];
      }
      delete neighbors[f];
      this.trigger("firms-remove", {removed: [f]});
    } else {
      console.warn("Trying to remove unknown firm '"+f+"'");
    }
    return this;
  },

  link: function(f1, f2, label) {
    var edges = [];
    if( arguments.length === 0 ){
      for ( var x in neighbors ) {
        for ( var y in neighbors[x] ){
          // break symmetry: only edges (x,y) with x<y are added
          if ( x < y )
            edges.push({source: x, target: y});
        }
      }
      return edges;
    }

    if (! (f1 in neighbors) )
      throw Error("Unknown firm '"+f1+"'");

    if( arguments.length === 1 ){
      for( var z in neighbors[f1] ){
        edges.push(z);
      }
      return edges;
    }

    if( arguments.length === 2 ){
      if( f2 in neighbors[f1] ){
        return neighbors[f1][f2];
      }
      return false;
    }
    if( arguments.length === 3 ){
      if( !(_.isArray(f2)) ) f2 = [f2];
      for( var i in f2 ){
        if( !(f2[i] in neighbors) ) throw Error("Unknown firm '"+f2[i]+"'");
        if(label){
          neighbors[f1][f2[i]] = _.clone(label);
          neighbors[f2[i]][f1] = _.clone(label);
        } else {
          delete neighbors[f1][f2[i]];
          delete neighbors[f2[i]][f1];
        }
      }
      this.trigger("link-change", {source: f1, target: f2, label: _.clone(label)});
      return this;
    }
    throw Error("Wrong arguments passed to 'link' method");
  },

  links: function() {return this.link();},
  dirLinks: function() {
    for ( var x in neighbors ) {
      for ( var y in neighbors[x] ){
        edges.push({source: x, target: y});
      }
    }
    return edges;
  }

};

return events(net, ["link-change", "firms-add", "firms-remove"]);
});