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
  "random",
  "laborflows/events"
], function(_, Random, events){

var rand = new Random(Random.engines.mt19937().autoSeed());

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

function UnknownFirm (id) {
  return Error("Unknown firm '"+id+"'");
}

function UnknownWorker (id) {
  return Error("Unknown worker '"+id+"'");
}


function Network(networkSpec){
  // @todo logic to implement:
  //  - networkSpec is Network ⇒ deep copy
  //  - networkSpec is JSON obj ⇒ initialise accordingly

  var firms = {};
  var workforce = {};
  var workerMarker = 0;

  var timesteps = 0;

  var net = this;

  function FirmHandle (id) {
    this.id = function() {return id;};
    this.view = {};
    events(this, ["changed", "removed"]);
  }

  FirmHandle.prototype.exists    = function() {return _knownFirm(this.id());};
  FirmHandle.prototype.network   = function() {return net;};
  FirmHandle.prototype.toString  = function() {return ""+this.id();};
  FirmHandle.prototype.valueOf   = function() {return this.id();};
  FirmHandle.prototype.neighbors = function() {return _(firms[this.id()].neighbors).keys().map(_lookupFirm);};
  FirmHandle.prototype.workers   = function() {return _(firms[this.id()].workers).pluck('handle');};
  FirmHandle.prototype.param     = function(p, v) {return _firmParam.call(this, this.id(), p, v);};
  FirmHandle.prototype.state     = function(s, v) {return _firmState.call(this, this.id(), s, v);};
  FirmHandle.prototype.numOfEmployees = function() {return _numOfEmployees(this.id());};
  FirmHandle.prototype.numOfAffiliates = function() {return _numOfAffiliates(this.id());};

  function _invalidateHandle(cls, h) {
    var err = function() {throw Error("This element has been removed!");};
    for( var p in cls.prototype ){
      if( p !== "toString" && p !== "valueOf" && p !== "exists" ) h[p] = err;
    }
  }

  function WorkerHandle (firmId, id) {
    this.id = function() {return id;};
    this.firm = function() {return _lookupFirm(firmId);};
    events(this, ["changed", "removed", "hired", "fired"]);
  }

  WorkerHandle.prototype.exists   = function() {return _(workforce).has(this.id());};
  WorkerHandle.prototype.network  = function() {return net;};
  WorkerHandle.prototype.toString = function() {return ""+this.id();};
  WorkerHandle.prototype.valueOf  = function() {return this.id();};
  WorkerHandle.prototype.prevFirm = function() {return workforce[this.id()].prevFirm.handle;};

  WorkerHandle.prototype.param = function(p, v) {
    var w = workforce[this.id()];
    if(arguments.length === 2 && _(w.param).has(p)){
      if (w.param[s] !== v){
        w.param[p] = v;
        this.trigger("changed");
      }
      return this;
    }
    return w.param[p];
  };
  WorkerHandle.prototype.state = function(s, v) {
    var w = workforce[this.id()];
    if(arguments.length === 2 && _(w.state).has(s)){
      if (w.state[s] !== v){
        w.state[s] = v;
        this.trigger("changed");
      }
      return this;
    }
    return w.state[s];
  };

  function _lookupFirm (id) {
    if(_(firms).has(id))
      return firms[id].handle;
    throw UnknownFirm(id);
  }
  function _lookupWorker (id) {
    if(_(workforce).has(id))
      return workforce[id].handle;
    throw UnknownWorker(id);
  }

  function _knownFirm (id) {
    return _(firms).has(id);
  }

  function _unknownFirm (id) {
    return !(_(firms).has(id));
  }

  function _createFirm (id, spec) {
    handle = new FirmHandle(id);
    firms[id] = {
      handle: handle,
      state: {},
      param: {},
      neighbors: {},
      workers: {}
    };
    spec = _(spec || {}).defaults(net.defaultFirmSpec);
    _updateFirmFromSpec(id, spec);

    return handle;
  }

  function _updateFirmFromSpec (id, spec) {
    spec = spec || {};
    _(firms[id].state).extend(_(spec).pick("isHiring"));
    // if other state information is needed in the future, just add the relevant keys here
    // e.g. _(firmState[id]).extend(_(spec).pick("isHiring", "isBankrupt"));
    _(firms[id].param).extend(_(spec).pick("isHiringProb", "hireProb", "fireProb"));
    // these probabilities can be generalised to functions from workers to bool

    if ( _(firms[id].workers).size() > 0 )
      _removeWorkers(id);
    _addWorkers(id, spec.workers);
  }

  function _addWorkers (id, wspec) {
    var w = wspec || 0;
    if(_(w).isNumber())
      w = [{num: w}];
    else if(!(_(w).isArray()))
      w = [w];
    for(var i in w){
      for(var j = 0; j < w[i].num; j++){
        w[i] = _(w[i]).defaults(net.defaultWorkerSpec);
        _createWorker(id, w[i]);
      }
    }
  }

  function _createWorker (firmId, spec) {
    spec = spec || {};
    var id = workerMarker++;
    var handle = new WorkerHandle(firmId, id);
    var worker = {
      id: id,
      firm: firms[firmId],
      prevFirm: firms[firmId],
      handle: handle,
      state: _(spec).pick("employed"),
      param: _(spec).pick("searchingProb")
    };
    firms[firmId].workers[id] = worker;
    workforce[id] = worker;
  }

  function _firmParam (id, k, v){
    if ( !id || !k ) throw Error("Not enough arguments to get/set firm parameters");
    firm = _lookupFirm(id);
    if ( _(firms[id].param).has(k) ){
      var old = firms[id].param[k];
      if ( v !== undefined ){
        if ( old != v ) {
          firms[id].param[k] = v;
          firm.trigger("changed", {param: k, from: old, to: v});
        }
        return this;
      }
      return firms[id].param[k];
    }
  }

  function _firmState (id, k, v){
    if ( arguments.length < 2 || arguments.length > 3)
      throw Error("Not enough arguments to get/set firm state");
    firm = _lookupFirm(id);
    if ( _(firms[id].state).has(k) ){
      var old = firms[id].state[k];
      if ( v !== undefined ){
        if ( old != v ) {
          firms[id].state[k] = v;
          firm.trigger("changed", {state: k, from: old, to: v});
        }
        return this;
      }
      return firms[id].state[k];
    }
  }

  this.knowsFirm = _knownFirm;

  this.firms = function() {
    return _(firms).pluck("handle");
  };

  this.firm = function(id, spec) {
    if ( !id || arguments.length > 2 ) throw Error("Wrong parameters passed to `firm`");
    var firm = _lookupFirm(id);
    if ( arguments.length == 2 ) {
      _updateFirmFromSpec(id, spec);
      firm.trigger("changed", {newspec: true});
      this.trigger("networkChange", {firmsChanged: [firm]});
    }
    return firm;
  };

  this.addFirm = function(id, spec) {
    var frms = {};
    var diff = [];

    if ( arguments.length == 2 ) {
      frms[id] = spec;
    } else if ( arguments.length == 1 ){
      if(_(id).isArray()){
        for( var i in id ){
          frms[id[i]] = {};
        }
      } else if( _(id).isString() ) {
        frms = {};
        frms[id] = {};
      } else {
        frms = id;
      }
    } else if ( arguments.length > 2 ){
      throw Error("Wrong parameters passed to `firm`");
    }

    for( var f in frms ){
      if( _unknownFirm(f) ){
        var firm = _createFirm(f, frms[f]);
        diff.push(firm);
      }
    }
    if(!(_(diff).isEmpty())) this.trigger("networkChange", {firmsAdded: diff});
    return this;
  };

  this.removeFirm = function(f) {
    if ( _knownFirm(f) ) {
      var firm = _lookupFirm(f);
      for( var g in firms[f].neighbors ){
        delete firms[g].neighbors[f];
      }
      _removeWorkers(f);
      delete firms[f];
      _invalidateHandle(FirmHandle, firm);
      firm.trigger("removed");
      this.trigger("networkChange", {firmsRemoved: [f]});
    } else {
      console.warn("Trying to remove unknown firm '"+f+"'");
    }
    return this;
  };

  function _removeWorkers (f) {
    _(firms[f].workers).each(function(v,k) {
      _invalidateHandle(WorkerHandle, v.handle);
      v.handle.trigger("removed");
      delete workforce[k];
    });
    firms[f].workers = {};
  }

  function _link (f1, f2, label) {

    // link() -> [{source, target, label}]
    // link(id) -> [{source: id, target, label}]
    if( arguments.length < 2 ){
      var edges = [], firmsreq = firms;
      if( arguments.length == 1){
        firmsreq = {};
        firmsreq[f1] = _lookupFirm(f1);
      }
      for ( var x in firmsreq ) {
        for ( var y in firms[x].neighbors ){
          // break symmetry: only edges (x,y) with x<y are added
          if ( x < y )
            edges.push({
              source: firms[x].handle,
              target: firms[y].handle,
              label: firms[x].neighbors[y]
            });
        }
      }
      return edges;
    }

    // link(f1, f2) -> label
    if( arguments.length === 2 ){
      if( f2 in firms[f1].neighbors ){
        return firms[f1].neighbors[f2];
      }
      return false;
    }

    // link(f1, f2, label) -> net -- setting the link
    if( arguments.length === 3 ){
      f1 = _lookupFirm(f1);
      if( !(_(f2).isArray()) ) f2 = [f2];
      var diffAdd = [], diffDel = [];
      for( var i in f2 ){
        fi = _lookupFirm(f2[i]);
        if(f1.id() == fi.id()) continue;
        if(label){
          var lbl = _(label).clone();
          firms[f1].neighbors[fi] = lbl;
          firms[fi].neighbors[f1] = lbl;
          diffAdd.push({source: f1, target: fi, label: label});
        } else {
          delete firms[f1].neighbors[fi];
          delete firms[fi].neighbors[f1];
          diffDel.push({source: f1, target: fi});
        }
      }
      this.trigger("networkChange", {addedLinks: diffAdd, removedLinks: diffDel});
      return this;
    }
    throw Error("Wrong arguments passed to 'link' method");
  }

  this.link  = _link;
  this.links = _link;

  this.dirLinks = function() {
    for ( var x in neighbors ) {
      for ( var y in neighbors[x] ){
        edges.push({source: x, target: y});
      }
    }
    return edges;
  };

  this.workers = function(firm) {
    if(firm && _lookupFirm(firm))
      return _(firms[firm].workers).pluck("handle");
    return _(workforce).pluck("handle");
  };

  this.addWorkers = function(id, wspec) {
    var firm = _lookupFirm(id);
    var ws = _addWorkers(firm, wspec);
    firm.trigger("changed", {newspec: true});
    this.trigger("networkChange", {firmsChanged: [firm]});
    return this;
  };

  function _numOfEmployees (firm) {
    var wrks;
    if(arguments.length === 0){
      wrks = workforce;
    } else {
      _lookupFirm(firm);
      wrks = firms[firm].workers;
    }
    var p = _(wrks).partition(function(w) {return w.state.employed === true;});
    return {
      employed: _(p[0]).size(),
      unemployed: _(p[1]).size()
    };
  }

  // faster then sum of _numOfEmployees
  function _numOfAffiliates (firm) {
    var wrks;
    if(arguments.length === 0){
      wrks = workforce;
    } else {
      _lookupFirm(firm);
      wrks = firms[firm].workers;
    }
    return _(wrks).size();
  }

  this.numOfEmployees = _numOfEmployees;
  this.numOfAffiliates = _numOfAffiliates;

  this.findWorker = function(w) {
    if( _(workforce).has(w.toString()) )
      return _lookupWorker(w);
    return false;
  };

  var _firmIsHiring = function(n) {return firms[n].state.isHiring;};

  this.step = function(num) {

    num = num || 1;

    var diff = {changedFirms: [], hiredWorkers: [], firedWorkers: []};
    var old;

    for ( var i=0; i < num; i++ ) {
      // update isHiring
      for ( var f in firms ) {
        var firm = firms[f];
        old = firm.state.isHiring;
        firm.state.isHiring = rand.bool(firm.param.isHiringProb);
        if ( old !== firm.state.isHiring ) diff.changedFirms.push(firm.handle);
      }

      for ( var w in workforce ) {
        var worker = workforce[w];
        if ( worker.state.employed ) {
          // Gets fired with prob fireProb
          if ( rand.bool( worker.firm.param.fireProb ) ){
            worker.state.employed = false;
            diff.firedWorkers.push(worker.handle);
          }
        } else {
          // Searches for a new job with prob searchingProb
          if ( rand.bool( worker.param.searchingProb ) ){
            var hiringNeighbors = _( worker.firm.neighbors ).keys()
                  .filter(_firmIsHiring);
            if ( _(hiringNeighbors).size() > 0 ) {
              var newFirm = firms[ rand.pick( hiringNeighbors ) ];
              if ( rand.bool( newFirm.param.hireProb ) ) {
                _employWorkerAt(worker, newFirm);
                diff.hiredWorkers.push(worker.handle);
              }
            }
          }
        }
      }
      timesteps++;
    }

    for ( i in diff.changedFirms )
      diff.changedFirms[i].trigger("changed", {hiringStatus: true});

    for ( i in diff.hiredWorkers )
      diff.hiredWorkers[i].trigger("hired");

    for ( i in diff.findWorker )
      diff.findWorker[i].trigger("fired");


    this.trigger("simulationStep", diff);
    return this;
  };

  function _employWorkerAt (worker, newFirm) {
    delete worker.firm.workers[worker.id];
    newFirm.workers[worker.id] = worker;
    worker.prevFirm = worker.firm;
    worker.firm = newFirm;
    worker.state.employed = true;
  }

  this.time = function() {return timesteps;};

  // @todo init code following firmsSpec

  // add events handling code
  events(this, ["networkChange", "simulationStep"]);

}

Network.prototype.defaultFirmSpec = {
  isHiringProb: 0.5, hireProb: 0.5, fireProb: 0.5,
  isHiring: true,
};
Network.prototype.defaultWorkerSpec = {
  searchingProb: 0.5,
  employed: true
};

return Network;
});