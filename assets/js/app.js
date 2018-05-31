/**
 * Egan Price Update Automation - Backend Script
 * Jessica Hart
 */

//**** LOGGING ****//
function conlog(msg) {
  document.getElementById('console').value += msg + '\n';
  console.log("MSG: " + msg);
}

//**** ANGULAR ****//
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

//**** SHEETJS ****//

var bookfiles = [];
var books = [];

function handleDrop(e) {
  console.log('File(s) dropped');

  e.preventDefault();
  e.stopPropagation();

  var re = /(?:\.([^.]+))?$/;

  if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      //if not a file, ignore
      if (e.dataTransfer.items[i].kind === 'file') {
        var file = e.dataTransfer.items[i].getAsFile();
        console.log("...file["+i+"].name = " + file.name);
        var ext = re.exec(file.name)[1];
        if (ext == "csv" || ext == "xlsx" || ext == "xls") {
          console.log("...valid extension, loading...");
          conlog("Loading " + ext.toUpperCase() + ": " + file.name);
          bookfiles.push(file);
        }
      }
    }
  }
}
function handleDragover(e) {
  e.preventDefault();
}
var dropzone = document.getElementById("drop");
dropzone.addEventListener('drop', handleDrop, false);
dropzone.addEventListener('dragover', handleDragover, false);