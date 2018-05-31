/**
 * Egan Price Update Automation - Backend Script
 * Jessica Hart
 */

//**** LOGGING ****//
function conlog(msg) {
  document.getElementById('console').value += msg + '\n';
  console.log(msg);
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
    conlog("App loaded.");

  });
})();

//**** SHEETJS ****//
var re = /(?:\.([^.]+))?$/;
var bookfiles = [];
var books = [];

var rABS = true;
function loadBook(f,num) {
  var startTime = new Date();
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = e.target.result;
    if(!rABS) data = new Uint8Array(data);
    var workbook = XLSX.read(data, {type: rABS ? 'binary' : 'array'});
    books.push(workbook);
    //books.push(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1}));
    var enLoad = new Date();
    conlog("Loaded " + re.exec(f.name)[1].toUpperCase() + " [" + f.name + "] in " + (enLoad - startTime) + "ms.");

    //<--chain to heuristics here
  };
  if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
}

function handleDrop(e) {
  console.log('File(s) dropped');

  e.preventDefault();
  e.stopPropagation();

  if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      //if not a file, ignore
      if (e.dataTransfer.items[i].kind === 'file') {
        var file = e.dataTransfer.items[i].getAsFile();
        console.log("...["+i+"] " + file.name);
        var ext = re.exec(file.name)[1];
        if (ext == "csv" || ext == "xlsx" || ext == "xls") {
          //conlog("Loading " + ext.toUpperCase() + ": " + file.name);
          loadBook(file,i);
        } else {
          console.warn("..["+i+"] has invalid extension " + ext.toUpperCase() + ", skipped.");
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