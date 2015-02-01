;(function ( $ ) {

  $.widget( "laborflows.probability", {

    options: {
      value: 0,
      mixed: undefined,
      onUserSetValue: function() {}
    },

    mixed: function(m) {
      if ( m === undefined )
        return this.options.mixed;

      if (this._dragging) return this;

      this.options.mixed = m;
      this._update();
      return this;
    },

    value: function(p) {
      if ( p === undefined )
        return this.options.value;

      if ( this._dragging ) return this;

      this.options.mixed = false;
      if ( p > 1 ) p = 1;
      else if ( p < 0 ) p = 0;
      if ( this.options.value != p ) {
        this.options.value = p;
        this._update();
      }
      return this;
    },

    // _setOption: function( key, value ) {
    //   this.options[ key ] = value;
    //   this._update();
    // },

    _update: function() {
      var p = this.options.value;
      if ( this.options.mixed ) {
        this.element.addClass("mixed");
        this.element.progress("set percent", 100);
        this.element.find(".bar .progress").text("mixed");
      } else {
        this.element.removeClass("mixed");
        this.element.progress("set percent", p<1?p:100);
      }
    },

    _dragging: false,

    _create: function() {

        var settings = this.options;
        var self = this;

        this.element.addClass("ui progress");
        this.element.progress({
          performance: false, debug: false,
          autoSuccess: false,
          showActivity: false
        });

        if (this.options.mixed === undefined )
          this.options.mixed = this.element.hasClass("mixed");
        this._update();

        $("body").on("mouseup", function(e) {
          if (self._dragging === false) return;
          self._dragging = false;
          console.log(self._drag_elem);
          var bar = $(this);
          if ( bar.hasClass("disable") ) return;
          if ($(e.target).attr("class") ==  "progress") return;
          var p = self._calcProb(e, self._drag_elem);
          bar.find(".bar").removeClass("notransition");
          settings.onUserSetValue(p);
        });

        this.element.on("mousedown", function(e) {
          self._dragging = true;
          self._drag_elem = this;
          e.preventDefault();
        });

        this.element.on("mousemove", function(e) {
          var bar = $(this);
          if ( e.which === 1 && !(bar.hasClass("disable")) ) {
            if ($(e.target).attr("class") ==  "progress") return;
            var p = Math.ceil(self._calcProb(e, this) * 100) + "%";
            bar.find(".bar").addClass("notransition").css("width", p);
            bar.find(".progress").text(p);
          }
        });
      },

      _calcProb: function(event, elem) {
        var x = event.offsetX;
        // HORRIBLE HACK: when event.target is the blue bar, the offset is off by 3px (its padding)
        if (event.target === elem) {
          x = x - 2;
        }
        x = x / $(elem).width();
        if (x < 0) x=0;
        if (x > 1) x=1;
        return x;
      }
  });

}( jQuery ));

