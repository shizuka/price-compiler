/**
 * Egan Price Update Automation - Angular Module
 * Jessica Hart
 */

(function() {
  var app = angular.module('eganPriceUpdate', []).config(function($interpolateProvider){
    $interpolateProvider.startSymbol('{[{').endSymbol('}]}');
  });

  app.directive('selectOnClick', function() {
    return function (scope, elem, attrs) {
      elem.bind('click', function () {
        this.select();
      });
    };
  });

  app.directive('showTail', function () {
    return function (scope, elem, attr) {
      scope.$watch(function () {
        return elem[0].value;
      },
      function (e) {
        elem[0].scrollTop = elem[0].scrollHeight;
      });
    }
  });

  app.controller('PriceUpdateController', function() {

    console.info("Enterprise Price Update Compiler");

  });
})();