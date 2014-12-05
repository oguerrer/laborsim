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
   * These methods cannot be chained
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


      function getQueue ( type ) {
        if (_(listeners).has(type))
          return listeners[type];
        else throw Error("Unknown event type '"+type+"'");
      }

      function stillOn ( type ) {
        if( arguments.length === 0 || type === undefined || _(type).isArray() ){
          var len = 0;
          var keys = type || _(listeners).keys();
          for(var l in keys)
            len += listeners[l].length;
          return len;
        }
        return getQueue(type).length;
      }

      /**
       * subscribe a listener of an event type
       *
       * @param  {string|[string]}  type     The type of event
       * @param  {?events~Listener} callback The callback
       * @return {(number|events~Listener)}  If `callback` is specified, returns it, otherwise returns the number of listeners registered for `type`.
       *
       * @throws Error when `type` is not among the defined event types
       */
      function subscribe ( ts, callback ) {

        // subscribe() / subscribe(type) -> num of listeners on type
        if ( arguments.length < 2 ){
          return stillOn(ts);
        }
        if ( !(_(ts).isArray()) ) ts = [ts];

        // subscribe(type, callback) -> insert callback and return listener
        _(ts).each(function(type) {
          getQueue(type).unshift(callback);
        });
        return callback;

      }

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
      function publish ( type, args ) {

        var queue = getQueue(type),
            len = queue.length;

        // efficient return if empty
        if ( len === 0 ) return 0;

        args = args || {};
        if ( _(args).has("eventType") ) console.warn("Overwriting 'eventType' property of an event");
        args.eventType = type;
        if ( _(args).has("eventSource") ) console.warn("Overwriting 'eventSource' property of an event");
        args.eventSource = this;
        // console.log("EVENT", type, args.eventSource);

        // going backwards, removing an item does not alter the index of the ones coming before it
        while (len--) {
          if ( queue[len]( args ) )
            queue.splice(len, 1);
        }

        return queue.length;
      }

      function unsubscribe ( ts, listener ) {

        if ( arguments.length < 1 ){
          for ( var t in listeners ) {
            listeners[t] = [];
          }
          return this;
        }

        if ( !(_(ts).isArray()) ) ts = [ts];

        _(ts).each(function(el) {
          var queue = getQueue(type);
          if ( arguments.length == 1 ){
            queue = [];
          } else {
            for ( var i in queue ) {
              if ( queue[i] === listener ) {
                queue.splice( i, 1 );
                return;
              }
            }
          }
        });
        return this;

      }


      obj.events = {};
      obj.events.types = types;
      for ( var i in types ) {
        listeners[types[i]] = [];
        obj.events[types[i]] = _(publish).partial(types[i]);
      }

      obj.on      = subscribe;
      obj.off     = unsubscribe;
      obj.trigger = publish;
      obj.stillOn = stillOn;

    }());

    return obj;
  }

  return addEvents;
});