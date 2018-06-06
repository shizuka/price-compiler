/**
 * Egan Price Update Automation - Backend Script
 * Jessica Hart
 */

//**** GLOBALS ****//
function conlog(msg) {
  var con = document.getElementById('console');
  con.value += msg + '\n';
  con.scrollTop = con.scrollHeight;
  console.log("> " + msg);
}

var bookraws = []; //XLSX format
var books = []; //just the sheets in foo[row][col] format

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
//(function() {
var rABS = true;
var reExtension = /(?:\.([^.]+))?$/; //regex to find extension

function loadBook(f) {
  var stLoad = new Date();
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = e.target.result;
    if(!rABS) data = new Uint8Array(data);
    var workbook = XLSX.read(data, {type: rABS ? 'binary' : 'array', raw: true});
    bookraws.push(workbook); //FOR DEBUGGING LATER
    var worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, blankrows: false, raw: true});
    for (var i = 0; i < worksheet.length; i++) {
      for (var j = 0; j < i.length; j++) {
        if (worksheet[i][j] == null) { worksheet[i][j] = ""; }
        worksheet[i][j] = worksheet[i][j].toString().replace(/,/g, '');
      }
    }
    books.push({
      name: f.name,
      schema: "unknown",
      sheet: worksheet
    });
    var enLoad = new Date();
    conlog("Read " + reExtension.exec(f.name)[1].toUpperCase() + " [" + f.name + "] in " + (enLoad - stLoad) + "ms.");

    //<--chain to heuristics here
  };
  if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
}

var dropzone = document.getElementById("wrapper");
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  if (e.dataTransfer.items) {
    if (e.dataTransfer.items.length > 1) {
      console.log("Incoming items (" + e.dataTransfer.items.length + ")...");
    } else {
      console.log("Incoming item...");
    }
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      if (e.dataTransfer.items[i].kind === 'file') {
        var file = e.dataTransfer.items[i].getAsFile();
        console.log("...["+i+"] " + file.name);
        var ext = reExtension.exec(file.name)[1];
        if (ext == "csv" || ext == "xlsx" || ext == "xls") {
          loadBook(file);
        } else {
          console.warn("..["+i+"] has invalid extension " + ext.toUpperCase() + ", skipped.");
        }
      }
    }
  }
}
function handleDragover(e) {
  e.preventDefault(); //keep chrome from trying to download files instead of loading
}

dropzone.addEventListener('drop', handleDrop, false);
dropzone.addEventListener('dragover', handleDragover, false);
//})();