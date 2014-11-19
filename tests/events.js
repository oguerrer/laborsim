
define([
  "chai",
  "laborflows/events"
], function (chai, events) {

var expect = chai.expect;

function rand ( a, b ) {
  var r = Math.floor(a + (Math.random() * (b-a)));
  return r;
}
function randBool () {
  return Math.random() < 0.5;
}

function gen_callback (s, r) {
  return function(e) { s.count++; return r; };
}

var maxEvents = 4,
    maxCallbacks = 10;

var types = [];
for(var n = maxEvents; n > 0; n-- ){
  types.push("event"+n);
}


describe("Events", function() {

  it("should init correctly events and callbacks", function() {
    var eventsNum = maxEvents;
    while(--eventsNum){
      var callbacksNum = maxCallbacks;
      while(--callbacksNum){
        var l = {};

        var obj = {test: "test"};
        events(obj, types.slice(0, eventsNum));

        expect(obj).to.have.property("test", "test");
        expect(obj).to.have.property("on").that.is.a("function");
        expect(obj).to.have.property("off").that.is.a("function");
        expect(obj).to.have.property("trigger").that.is.a("function");
        expect(obj).to.have.property("events").that.is.an("object");
        for(var n = eventsNum-1; n > 0; n-- ){
          expect(obj.events).that.has.property(types[n]);
        }

        var i = callbacksNum;
        while(--i){
          l[i] = function(){};
          var t = types[rand(0, eventsNum)];
          var r = obj.on(t, l[i]);
          expect(r).to.be.equal(l[i]);
        }
      }
    }
  });

  it("should call callbacks", function() {
    var eventsNum = maxEvents;
    while(--eventsNum){
      var callbacksNum = maxCallbacks;
      while(--callbacksNum){
        var l = {}, s = {}, ty = {};

        var obj = {test: "test"};
        events(obj, types.slice(0, eventsNum));
        for(var n = eventsNum-1; n >= 0; n-- ){
          ty[n] = 0;
        }
        var i = callbacksNum;
        while(--i){
          var t = rand(0, eventsNum);
          var once = randBool();
          s[i] = {count: 0, type: types[t]};
          l[i] = gen_callback(s[i], once);
          obj.on(types[t], l[i]);
          if(!once) ty[t]++;
        }
        for(n = eventsNum-1; n >= 0; n-- ){
          i = obj.trigger(types[n]);
          expect(ty[n]).to.be.equal(+i);
        }
        i = callbacksNum;
        while(--i){
          expect(s[i].count).to.be.a("number").eql(1);
        }
      }
    }
  });

});

});