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

var progbar = document.getElementById('progress');
function setProgress(lvl, max) {
  progbar.setAttribute('style', 'width: ' + (lvl/max*100) + '%');
}
function setProgStatus(msg) { document.getElementById('progdet').textContent = msg; }

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

  app.controller('PriceUpdateController', function($scope) {

    var vm = this;

    console.info("Enterprise Price Update Compiler");
    setProgress(0,1);
    setProgStatus("Drag and drop files...");

    var rABS = true;
    var reExtension = /(?:\.([^.]+))?$/; //regex to find extension
    var filestoload = 0;
    var filesloaded = 0;

    this.books = [];      // [ {filename, format, sheet, ... } , ... ]
    this.rowsfixed = [];  // [ [desc, date, unit, ...] , ... ]
    this.hideHowto = false;

    var detectFormat = function (fn, sht) {
      for (var f = 0; f < priceFormats.length; f++) {
        var fnmatch = (priceFormats[f].filename.exec(fn) != null);
        var headmatch = (JSON.stringify(priceFormats[f].headers) == JSON.stringify(sht[0]));
        if (fnmatch && headmatch) {
          console.log("...matched " + priceFormats[f].printname);
          return f;
        }
      }
      return null;
    }

    var updateLoadProgress = function () {
      filesloaded++;
      if (filesloaded < filestoload) {
        //setProgress(filesloaded,filestoload,true);
        setProgStatus("Loading files...");
      } else {
        setProgStatus("Ready.");
        setProgress(0,1);
      }
    }

    var loadBook = function (f) {
      var stLoad = new Date();
      var reader = new FileReader();
      reader.onload = function(e) {
        var data = e.target.result;
        if(!rABS) data = new Uint8Array(data);
        var workbook = XLSX.read(data, {type: rABS ? 'binary' : 'array', raw: true});
        var worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, blankrows: false, raw: true});
        for (var i = 0; i < worksheet.length; i++) {
          for (var j = 0; j < i.length; j++) {
            if (worksheet[i][j] == null) { worksheet[i][j] = ""; }
            worksheet[i][j] = worksheet[i][j].toString().replace(/,/g, '');
          }
        }

        var format = detectFormat(f.name, worksheet);

        var enLoad = new Date();
        if (format == null) {
          conlog("...file [ " + f.name + " ] does not match any known schema, skipped.");
        } else {
          var skip = false;
          for (var i = 0; i < vm.books.length; i++) {
            if (vm.books[i].format == format) {
              conlog("...already have a " + priceFormats[format].printname);
              skip = true;
            }
          }
          if (!skip) {
            vm.books.push({
              name: f.name,
              format: format,
              formatname: priceFormats[format].printname,
              sheet: worksheet
            });
            $scope.$apply();
            conlog("Read [ " + f.name + " ] in " + (enLoad - stLoad) + "ms.");
          }
        }
        updateLoadProgress();
      };
      if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
    }

    var dropzone = document.getElementById("wrapper");

    var handleDrop = function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.items) {
        filestoload = e.dataTransfer.items.length;
        filesloaded = 0;
        setProgStatus("Loading files...");
        setProgress(1,1);
        for (var i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            var file = e.dataTransfer.items[i].getAsFile();
            console.log("...["+i+"] " + file.name);
            var ext = reExtension.exec(file.name)[1];
            if (ext == "csv" || ext == "xlsx" || ext == "xls") {
              loadBook(file);
            } else {
              filestoload--;
              console.warn("..["+i+"] has invalid extension " + ext.toUpperCase() + ", skipped.");
            }
          }
        }
      }
    }
    var handleDragover = function (e) {
      e.preventDefault(); //keep chrome from trying to download files instead of loading
    }

    dropzone.addEventListener('drop', handleDrop, false);
    dropzone.addEventListener('dragover', handleDragover, false);

    this.startCompile = function () {

    }

    conlog("App loaded.");
  });
})();
