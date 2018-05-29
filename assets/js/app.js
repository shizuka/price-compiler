/**
 * Egan Price Update Automation - Angular Module
 * Jessica Hart
 */

(function() {
  var app = angular.module('eganPriceUpdate', []).config(function($interpolateProvider){
    $interpolateProvider.startSymbol('{[{').endSymbol('}]}');
  });

  app.directive('selectOnClick', function() {
    return function (scope, element, attrs) {
      element.bind('click', function () {
        this.select();
      });
    };
  });

  app.controller('PriceUpdateController', function() {

    console.log("Enterprise Price Update Compiler");
    console.log("Initializing...");

  });
})();