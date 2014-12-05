LaborFlows
==========

Welcome to the LaborFlows Simulator Web App.
LaborFlows is an agent based model of the labor market; this simulator allows you to play with the model by creating the setting, letting it evolve, change the parameters and observe the evolution of relevant metrics.

This repository contains the source code of the simulator:

* for the documentation see the [wiki],
* for more about the model, see the paper (add link!)

[wiki]: https://github.com/bordaigorl/laborflows/wiki


## Requirements

To run the app a recent web browser is the only requirement.
The code will be tested for Firefox 30+ and Chrome 38+.
For maximum performance, Chrome is recommended.

For the moment, the website will consist of a bunch of static files so hosting it on a server will have very minimal requirements.

To build the code and generate a production-ready version, or to test it without a browser, [NodeJS] and [Grunt] are required.

[nodejs]: http://nodejs.org/
[grunt]:  http://gruntjs.com/


## Structure of the project

The main entry-point for the webapp is `index.html`, just open it in a web browser to preview the app. Its companion `app.js` is the file bootstrapping the application, loading all the necessary JavaScript modules and launching the application's code. 

Compiling the project in an optimised self-contained version with `grunt` will generate the final website structure in the `dist` directory.
The `grunt` rules to produce this will be added once the project reaches a minimum degree of stability.

The project is structured in the following directories:

* `js/`: contains all the javascript code
    - `main.js` is the script setting up the application
    - `lib/` contains all the third-party JavaScript libraries
    - `laborflows/` contains all the modules implementing the simulation and its visualisation; its internal structure reflects the module structure of the code.
* `css/`: contains all the style sheets; modify these files to change the appearance of elements in the app
* `img/`: contains all the graphical assets
* `pages/`: will eventually contain Markdown files to be compiled into static web pages complementing the webapp page
* `docs/`: will eventually contain all the documentation generated from the comments in the code
* `tests/`: unit testing modules
* `dist/`: will host the optimised self-contained version of the application


## Libraries

This project makes use of the following libraries

 * [`require.js`](http://requirejs.org)
     – module system
 * [`underscore.js`](http://underscorejs.org/)
     – functional utilities
 * [`jquery`](https://jquery.com/)
     – manipulation of the DOM
 * [`random.js`](https://github.com/ckknight/random-js)
     – mathematically correct random number generator
 * [`chroma.js`](https://github.com/gka/chroma.js)
     – color manipulations
 * [`d3.js`](http://d3js.org/)
     – visualisation library
 * [Semantic UI](http://semantic-ui.com/)
     – user interface


## Coding Style

Indentation: 2 spaces, no tabs. Lines max 80 chars long. Use `"` and not `'`.
See https://github.com/rwaldron/idiomatic.js for reference.

Where possible, use underscore's object oriented style, e.g. `_(a).map(...)` instead of `_map(a, ...)`.

All JavaScript code should pass [JSHint](http://www.jshint.com/docs/)'s check.

Documentation will be written using [Markdown](https://help.github.com/articles/markdown-basics/) and [JsDoc](http://usejsdoc.org) in sourcecode.


## Testing

Testing is performed by the [`mocha`][mocha] library and the [`chai`][chai] assertion language.

The tests can be automated. For the moment, to run the test suites you can just open `tests/tests.html` in a browser; the tests will be run and you will be presented with a nice report of the results. 

[mocha]: http://mochajs.org
[chai]:  http://chaijs.com


## License

Copyright (C) 2014 LaborFlows group
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
