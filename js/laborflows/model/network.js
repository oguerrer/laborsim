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

var _defaultFirmSpec = {
  hireProb: 0.8, fireProb: 0.1,
  isHiring: true,
};
var _defaultWorkerSpec = {
  searchingProb: 1,
  employed: true
};

function Network(networkSpec){
  if (!(this instanceof Network)) {return new Network(networkSpec);}

  // @todo logic to implement:
  //  - networkSpec is Network ⇒ deep copy
  //  - networkSpec is JSON obj ⇒ initialise accordingly

  var firms = {};
  var workforce = {}, workforceLen = 0;
  var workerMarker = 0;

  var isHiringProb = 0.5;

  var timesteps = 0;

  var net = this;

  // Firm Handle private class /////////////////////////////////////////////////

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

  ///////////////////////////////////////////////////////// End private class //

  // Worker Handle private class ///////////////////////////////////////////////

  function WorkerHandle (firmId, id) {
    this.id = function() {return id;};
    this.firm = function() {return _lookupFirm(firmId);};
    events(this, ["changed", "removed"]);
  }

  WorkerHandle.prototype.exists   = function() {return _(workforce).has(this.id());};
  WorkerHandle.prototype.network  = function() {return net;};
  WorkerHandle.prototype.toString = function() {return ""+this.id();};
  WorkerHandle.prototype.valueOf  = function() {return this.id();};
  WorkerHandle.prototype.prevFirm = function() {return workforce[this.id()].prevFirm.handle;};

  WorkerHandle.prototype.param = function(p, v) {
    var w = workforce[this.id()];
    if( arguments.length === 0 ){
      return _(w.param).clone();
    }
    if ( !(_(w.param).has(p)) ) throw Error("Unknown worker parameter '"+p+"'");
    if(arguments.length === 2){
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
    if( arguments.length === 0 ){
      return _(w.state).clone();
    }
    if ( !(_(w.state).has(s)) ) throw Error("Unknown worker state '"+s+"'");
    if(arguments.length === 2){
      if (w.state[s] !== v){
        w.state[s] = v;
        this.trigger("changed");
      }
      return this;
    }
    return w.state[s];
  };

  ///////////////////////////////////////////////////////// End private class //

  function append(a, b){
    a.push.apply(a, b);
  }

  function _initFromSpec (spec) {
    firms = {};
    workforce = {};
    workforceLen = 0;
    workerMarker = 0;
    timesteps = 0;

    if ( spec === undefined ) return;

    spec = _(spec)//.chain()
            // .pick("firms", "links", "isHiringProb", "firm_default", "worker_default")
            .defaults({
              "isHiringProb": 0.5,
              "firms": {},
              "links": {},
              "firm_default": _defaultFirmSpec,
              "worker_default": _defaultWorkerSpec
            });

    _( net.defaultFirmSpec ).extend(spec.firm_default);
    _( net.defaultWorkerSpec ).extend(spec.worker_default);

    isHiringProb = spec.isHiringProb;

    for( var f in spec.firms ){
      if( _unknownFirm(f) ){
        _createFirm(f, spec.firms[f]);
        if( _(spec.firms[f]).has('neighbors') ){
          if ( ! _(spec.links[f]).isArray() ){
            spec.links[f] = [];
          }
          append(spec.links[f], spec.firms[f].neighbors);
        }
      }
    }

    workforceLen = _(workforce).keys().length;

    for ( f in spec.links ){
      _addLinks(f, spec.links[f], true, true);
    }
  }

  function _getSpecs () {
    var spec = {};
    spec.isHiringProb = isHiringProb;
    spec.firm_default = net.defaultFirmSpec;
    spec.worker_default = net.defaultWorkerSpec;
    spec.firms = {};

    var x;
    for ( var f in firms ) {
      spec.firms[f] = {};
      if (firms[f].param.hireProb != spec.firm_default.hireProb)
        spec.firms[f].hireProb = firms[f].param.hireProb;
      if (firms[f].param.fireProb != spec.firm_default.fireProb)
        spec.firms[f].fireProb = firms[f].param.fireProb;
      if (firms[f].state.isHiring != spec.firm_default.isHiring)
        spec.firms[f].isHiring = firms[f].state.isHiring;
      x = _workersSpec(firms[f].workers, spec.worker_default);
      if (x.length > 0)
        spec.firms[f].workers = x;
      x = _(firms[f].neighbors).keys().filter(function(y) {return y < f;});
      if (x.length > 0)
        spec.firms[f].neighbors = x;
    }

    return spec;
  }

  function _workersSpec (workers, wdefault) {
    var wspec = {}, w;

    for ( var wid in workers ) {
      w = workforce[wid];
      wspec[w.searchingProb] = wspec[w.searchingProb] || {};
      wspec[w.searchingProb].searchingProb = w.searchingProb;
      if ( w.state.employed ) {
        wspec[w.searchingProb].employed = wspec[w.searchingProb].employed || 0;
        wspec[w.searchingProb].employed++;
      } else {
        wspec[w.searchingProb].unemployed = wspec[w.searchingProb].unemployed || 0;
        wspec[w.searchingProb].unemployed++;
      }
    }

    var spec = [];

    for ( var k in wspec ) {
      if ( _(wspec[k]).has("employed") ) {
        w = {num: wspec[k].employed, employed: true};
        if (wspec[k].searchingProb != wdefault.searchingProb)
          w.searchingProb = wspec[k].searchingProb;
        spec.push(w);
      }
      if ( _(wspec[k]).has("unemployed") ) {
        w = {num: wspec[k].unemployed, employed: false};
        if (wspec[k].searchingProb != wdefault.searchingProb)
          w.searchingProb = wspec[k].searchingProb;
        spec.push(w);
      }
    }

    return spec;
  }

  function _notifyChange (arg) {
    workforceLen = _(workforce).keys().length; // optimisation
    net.trigger("networkChange", arg);
  }

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
    _(firms[id].param).extend(_(spec).pick("hireProb", "fireProb"));
    // these probabilities can be generalised to functions from workers to bool
    // Add isHiringProb parameter to enable non uniform open probability

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

  function _firmParam (ids, k, v){
    if ( arguments.length < 1 || arguments.length > 3)
      throw Error("Wrong arguments to get/set firm parameters");

    if (!_(ids).isArray()) {
      if ( !k ) {
        // no param key: return all params
        return _(firms[ids].param).clone();
      } else if ( _(k).isString() && !v ) {
        // no param val: return param's current value
        _lookupFirm(ids); // make sure firm exists
        if ( _(firms[ids].param).has(k) ){
          return firms[ids].param[k];
        } else throw Error("Unknown firm parameter '"+k+"'");
      } else {
        // otherwise, it's a set-param operation, make sure ids is array
        ids = [ids];
      }
    }

    var param;
    if ( _(k).isString() ) {
      param = {};
      param[k] = v;
    } else param = k;

    var diff = {};
    for ( var i in ids ) {
      var id = ids[i];
      var firm = _lookupFirm(id);
      for ( k in param ) {
        v = param[k];
        if ( _(firms[id].param).has(k) ){
          var old = firms[id].param[k];
          if ( old != v ) {
            firms[id].param[k] = v;
            firm.trigger("changed", {param: k, from: old, to: v}); // deprecated
            diff[firm.id()] = firm;
          }
        } else throw Error("Unknown firm parameter '"+k+"'");
      }
    }
    _notifyChange({firmsChanged: diff});
    return this;
  }

  function _firmState (ids, k, v){
    if ( arguments.length < 1 || arguments.length > 3)
      throw Error("Wrong arguments to get/set firm state");
      if (!_(ids).isArray()) {
        if ( !k ) {
          // no param key: return all params
          return _(firms[ids].param).clone();
        } else if ( _(k).isString() && !v ) {
          // no param val: return param's current value
          _lookupFirm(ids); // make sure firm exists
          if ( _(firms[ids].state).has(k) ){
            return firms[ids].state[k];
          } else throw Error("Unknown firm state '"+k+"'");
        } else {
          // otherwise, it's a set-param operation, make sure ids is array
          ids = [ids];
        }
      }

      var param;
      if ( _(k).isString() ) {
        param = {};
        param[k] = v;
      } else param = k;

      var diff = {};
      for ( var i in ids ) {
        var id = ids[i];
        var firm = _lookupFirm(id);
        for ( k in param ) {
          v = param[k];
          if ( _(firms[id].state).has(k) ){
            var old = firms[id].state[k];
            if ( old != v ) {
              firms[id].state[k] = v;
              firm.trigger("changed", {state: k, from: old, to: v}); // deprecated
              diff[firm.id()] = firm;
            }
          } else throw Error("Unknown firm state '"+k+"'");
        }
      }
      _notifyChange({firmsChanged: diff});
      return this;
    }

  this.knowsFirm = _knownFirm;

  this.isHiringProb = function(p) {
    if ( arguments.length === 0 ) return isHiringProb;
    if ( p < 0 ) p = 0;
    if ( p > 1 ) p = 1;
    isHiringProb = p;
    _notifyChange({isHiringProb: isHiringProb});
    return net;
  };

  this.firms = function() {
    return _(firms).pluck("handle");
  };

  this.firm = function(id, spec) {
    if ( !id || arguments.length > 2 ) throw Error("Wrong parameters passed to `firm`");
    var firm = _lookupFirm(id);
    if ( arguments.length == 2 ) {
      _updateFirmFromSpec(id, spec);
      firm.trigger("changed", {newspec: true});
      var diff = {}; diff[firm.id()] = firm;
      _notifyChange({firmsChanged: diff});
    }
    return firm;
  };
  this.firmParam = _firmParam;
  this.firmState = _firmState;

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

    // Now that we added all the firms, we can add the links in the specs
    for( f in frms ){
      if (_(frms[f].neighbors).isArray()){
        _addLinks(f, frms[f].neighbors, true, true);
      }
    }

    if( !_(diff).isEmpty() ) _notifyChange({firmsAdded: diff});
    return this;
  };

  this.removeFirm = function(fs) {
    if ( !_(fs).isArray() ) fs = [fs];

    var diff = {};
    for ( var i in fs ){
      var f = fs[i];
      if ( _knownFirm(f) ) {
        var firm = _lookupFirm(f);
        for( var g in firms[f].neighbors ){
          delete firms[g].neighbors[f];
        }
        _removeWorkers(f);
        delete firms[f];
        _invalidateHandle(FirmHandle, firm);
        firm.trigger("removed");
        diff[firm.id()] = firm;
      } else {
        console.warn("Trying to remove unknown firm '"+f+"'");
      }
    }
    _notifyChange({firmsRemoved: diff});
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
      if( !(_(f2).isArray()) ) f2 = [f2];
      var diff = _addLinks(f1, f2, label);
      _notifyChange(diff);
      return this;
    }
    throw Error("Wrong arguments passed to 'link' method");
  }

  function _addLinks (f1, f2, label, avoidDiff) {
    f1 = _lookupFirm(f1);
    var diffAdd = [], diffDel = [];
    for( var i in f2 ){
      var fi = _lookupFirm(f2[i]);
      if(f1.id() == fi.id()) continue;
      if(label){
        var lbl = _(label).clone();
        firms[f1].neighbors[fi] = lbl;
        firms[fi].neighbors[f1] = lbl;
        if(!avoidDiff) diffAdd.push({source: f1, target: fi, label: label});
      } else {
        delete firms[f1].neighbors[fi];
        delete firms[fi].neighbors[f1];
        if(!avoidDiff) diffDel.push({source: f1, target: fi});
      }
    }
    return {addedLinks: diffAdd, removedLinks: diffDel};
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
    _notifyChange({firmsChanged: [firm]});
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
    var res = { employed: 0, unemployed: 0 };
    for ( var w in wrks ) {
      if ( wrks[w].state.employed )
        res.employed++;
      else
        res.unemployed++;
    }
    return res;
  }

  // faster then sum of _numOfEmployees
  function _numOfAffiliates (firm) {
    if(arguments.length === 0){
      return workforceLen;
    } else {
      _lookupFirm(firm);
      return _(firms[firm].workers).size();
    }
  }

  this.numOfEmployees = _numOfEmployees;
  this.numOfAffiliates = _numOfAffiliates;
  this.numOfFirms = function() { return _(firms).size(); };

  this.findWorker = function(w) {
    if( _(workforce).has(w.toString()) )
      return _lookupWorker(w);
    return false;
  };

  var _firmIsHiring = function(n) {return firms[n].state.isHiring;};

  this.step = function(num) {

    num = num || 1;

    var diff = {
      changedFirms: {},
      hiredWorkers: {},
      firedWorkers: {},
      employed: 0,
      unemployed: 0
    };
    var old;

    for ( var i=0; i < num; i++ ) {
      // update isHiring
      for ( var f in firms ) {
        var firm = firms[f];
        old = firm.state.isHiring;
        firm.state.isHiring = rand.bool(isHiringProb);
        if ( old !== firm.state.isHiring ) diff.changedFirms[f] = firm.handle;
      }

      for ( var w in workforce ) {
        var worker = workforce[w];
        if ( worker.state.employed ) {
          // Gets fired with prob fireProb
          if ( rand.bool( worker.firm.param.fireProb ) ){
            worker.state.employed = false;
            diff.firedWorkers[w] = worker.handle;
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
                diff.hiredWorkers[w] = worker.handle;
              }
            }
          }
        }
        if ( worker.state.employed ) diff.employed++; else diff.unemployed++;
      }
      timesteps++;
    }

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

  this.resetFromSpec = function(spec) {
    _initFromSpec(spec);
    this.trigger("networkReset");
  };

  this.getSpecs = _getSpecs;

  // add events handling code
  events(this, ["networkReset", "networkChange", "simulationStep"]);

  _initFromSpec(networkSpec);

}

Network.prototype.defaultFirmSpec = _defaultFirmSpec;
Network.prototype.defaultWorkerSpec = _defaultWorkerSpec;

return Network;
});