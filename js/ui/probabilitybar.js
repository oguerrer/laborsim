;(function ( $ ) {

  $.fn.probabilitybar = function(settings, p) {
    if ( arguments.length === 0 )
      return this.progress("percent");

    if ( arguments.length === 1 && typeof settings != "string" ) {

      if ( !settings ) settings = {};
      if ( !settings.value )
        settings.value = 0;
      else if (settings.value === 1)
        settings.value = 100;
      if ( !settings.setValue ) settings.setValue = function() {};

      this.addClass("ui progress");
      this.progress({
        performance: false, debug: false,
        autoSuccess: false,
        showActivity: false
      });
      this.progress("set percent", settings.value);

      this.on("mouseup", function(e) {
        var bar = $(this);
        if ( bar.hasClass("disable") ) return;
        var p = e.offsetX / bar.width();
        bar.find(".bar").removeClass("notransition");
        settings.setValue(p);
      });

      this.on("mousemove", function(e) {
        var bar = $(this);
        if ( e.which === 1 && !(bar.hasClass("disable")) ) {
          var p = Math.ceil(e.offsetX / bar.width() * 100) + "%";
          bar.find(".bar").addClass("notransition").css("width", p);
          bar.find(".progress").text(p);
        }
      });

    } else {
      if ( settings === "set percent" )
        this.progress("set percent", p<1?p:100);
      else
        this.progress.apply(this, arguments);
    }
  };

  $.fn.probability = function(p) {
    if ( arguments.length === 0 ) {
      var perc = this.progress("percent");
      if ( perc > 1 ) perc = perc / 100;
      return perc;
    }
    this.progress("set percent", p<1?p:100);
  };

}( jQuery ));

