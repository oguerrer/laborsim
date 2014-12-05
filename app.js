require.config({
    baseUrl: 'js',
    paths: {
        underscore: 'lib/underscore',
        jquery:     'lib/jquery',
        random:     'lib/random',
        d3:         'lib/d3',
        chroma:     'lib/chroma'
    }
});

requirejs(['main']);