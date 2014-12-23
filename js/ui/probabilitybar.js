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

      this.options.mixed = m;
      this._update();
    },

    value: function(p) {
      if ( p === undefined )
        return this.options.value;

      if ( this._dragging ) return;

      this.options.value = p;
      this.options.mixed = false;
      this._update();
    },

    // _setOption: function( key, value ) {
    //   this.options[ key ] = value;
    //   this._update();
    // },

    _update: function() {
      var p = this.options.value;
      if ( p > 1 ) p = 1;
      else if ( p < 0 ) p = 0;
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

        this.element.on("mouseup", function(e) {
          self._dragging = false;
          var bar = $(this);
          if ( bar.hasClass("disable") ) return;
          var p = e.offsetX / bar.width();
          bar.find(".bar").removeClass("notransition");
          settings.onUserSetValue(p);
        });

        this.element.on("mousedown", function(e) {
          self._dragging = true;
        });

        this.element.on("mousemove", function(e) {
          var bar = $(this);
          if ( e.which === 1 && !(bar.hasClass("disable")) ) {
            var p = Math.ceil(e.offsetX / bar.width() * 100) + "%";
            bar.find(".bar").addClass("notransition").css("width", p);
            bar.find(".progress").text(p);
          }
        });
      }
  });

}( jQuery ));

