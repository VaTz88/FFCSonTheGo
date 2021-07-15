/*
 *  This file if for attaching variables to the DOM window object
 *  so that the same instance can be accessed by the entire application.
 */
const jQuery = require('jquery');
const bootstrap = require('bootstrap');

window.$ = window.jQuery = jQuery;
window.bootstrap = bootstrap;

export default { $, bootstrap };
