/**
 * @module laborflows/events
 * @author Emanuele D'Osualdo
 *
 * A decorator adding publish/subscribe facilities to an object.
 *
 */

define(["underscore"], function(_){

  /**
   * @name events
   * @function
   * @param   {object}         obj   The object to be extended with pub/sub facilities
   * @param   {Array.<string>} types A list of events types
   * @returns {object}         The input object
   *
   * Example:
   *
   * ```js
   * var myObj = {myField: 1};
   * events(myObj, ["start", "stop"]);
   * myObj.on("start", function (e) { console.log("it started!") });
   * var l = myObj.on("start", function (e) { console.log("again!") });
   * myObj.trigger("start");
   * myObj.off("start", l);
   * ```
   *
   * These methods can be chained
   *
   * @todo: document chaining and return types
   *
   */
  function addEvents (obj, types) {
    ;(function () {

      /**
       * @callback events~Listener
       * @param   {{type: string}} event
       * @returns {boolean}        if `true` is returned the callback will be removed from the event listeners
       */

      var listeners = {};

      function eventInt (i) {
        this.stillAlive = i;
      }

      eventInt.prototype.valueOf = function(){ return this.stillAlive; };
      eventInt.prototype.on      = subscribe;
      eventInt.prototype.off     = unsubscribe;
      eventInt.prototype.trigger = publish;


      function addApi (obj) {
        obj.on      = subscribe;
        obj.off     = unsubscribe;
        obj.trigger = publish;
        return obj;
      }

      /**
       * subscribe a listener of an event type
       *
       * @param  {string}           type     The type of event
       * @param  {?events~Listener} callback The callback
       * @return {(number|events~Listener)}  If `callback` is specified, returns it, otherwise returns the number of listeners registered for `type`.
       *
       * @throws Error when `type` is not among the defined event types
       */
      var subscribe = function( type, callback ) {

        if( arguments.length === 0){
          var len = 0;
          for(var l in listeners)
            len += listeners[l].length;
          return new eventInt(len);
        }

        if ( !listeners[type] ) {
          throw Error("Trying to subscribe to undefined event type '"+type+"'.");
        }
        if ( callback ){
          listeners[type].unshift(callback);
          return addApi(callback);
        }

        return new eventInt(listeners[type].length);
      };

      /**
       * publish an event
       *
       * When an  event is published, all the listeners' callbacks are called.
       * If a callback returns `false` it will be removed from the listeners.
       *
       * @param  {string} type The name of the event
       * @param  {object} args An object with data to be passed to the handlers (its `type` property will be overwritten with the contents of the `type` argument)
       * @return {int}    how many listeners are still listening
       *
       * @throws Error when `type` is not among the defined event types
       */
      var publish = function( type, args ) {

        if ( !(_(listeners).has(type)) ) {
          throw Error("Undefined event type '"+type+"' triggered.");
        }

        var queue = listeners[type],
            len = queue ? queue.length : 0;

        args = args || {};
        if ( _(args).has("type") ) console.warn("Overwriting 'type' property of an event");
        args.type = type;
        if ( _(args).has("eventSource") ) console.warn("Overwriting 'eventSource' property of an event");
        args.eventSource = this;
        // console.log("EVENT", type, args.eventSource);

        // going backwards, removing an item does not alter the index of the ones coming before it
        while (len--) {
          if ( queue[len]( args ) )
            queue.splice(len, 1);
        }

        return new eventInt(queue.length);
      };

      var unsubscribe = function( type, listener ) {

        if ( arguments.length < 1 ){
          for ( var t in listeners ) {
            listeners[t] = [];
          }
          return new eventInt(0);
        }

        if ( listeners[type] ) {
          if ( arguments.length == 1 ){
            var len = listeners[type].length;
            listeners[type] = [];
            return new eventInt(len);
          } else {
            var queue = listeners[type];
            for ( var i in queue ) {
              if ( queue[i] === listener ) {
                queue.splice( i, 1 );
                return new eventInt(queue.length);
              }
            }
            return new eventInt(queue.length);
          }
        } else throw Error("Trying to unsubscribe from unknown type '"+ type + "'.");

      };


      obj.events = {};
      obj.events.types = types;
      for ( var i in types ) {
        listeners[types[i]] = [];
        obj.events[types[i]] = _.partial(publish, types[i]);
      }

      addApi(obj);

    }());

    return obj;
  }

  return addEvents;
});