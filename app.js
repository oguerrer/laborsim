require.config({
    baseUrl: 'js',
    paths: {
        underscore: 'lib/underscore',
        jquery:     'lib/jquery',
        random:     'lib/random',
        d3:         'lib/d3',
        chroma:     'lib/chroma',
        semanticui: '../semanticui/semantic'
    },
    shim: {
      'semanticui': {
        deps: ['jquery']
      },
      'ui/probabilitybar': {
        deps: ['jquery', 'lib/jquery-widget', 'semanticui']
      }
    }
});


var app; // For testing in the console

require(["jquery"], function($) {
  $(function() {
    require(["main"], function(m) { app = m; });
  });
});
// requirejs(['semanticui', 'main']);
