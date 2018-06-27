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
var pn = 0; //progress now
var pt = 1; //progress total
function setProgress(lvl, max) {
  progbar.setAttribute('style', 'width: ' + (lvl/max*100) + '%');
}
function setProgStatus(msg) { document.getElementById('progdet').textContent = msg; }
function setStart(state) {
  var start = document.getElementById('start');
  if (state == 1) {
    start.disabled = false;
    start.classList.add('btn-success');
  } else if (state == 0) {
    start.disabled = true;
  } else { //started compile
    start.classList.remove('btn-success');
    start.classList.add('btn-success-outline');
    start.disabled = true;
  }
}

//**** BOOK PROCESSING ****//
var books = [];      // [ {filename, format, sheet, ... } , ... ]
var rowsfixed = [];  // [ [cols] , ... ]
var dupeUpcs = []; // [ upc, upc, ... ]
var uniqrows = [];
var duperows = [];
var errlog = [];
var sTotal = new Date();
var finalOutput = XLSX.utils.book_new();
var fnout = "";

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
    var today = (new Date()).toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');

    this.books = [];

    this.hideHowto = false;
    this.showDownload = false;

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
        setStart(0);
      } else {
        setProgStatus("Ready.");
        progbar.classList.remove('progress-bar-striped');
        setProgress(0,1);
        setStart(1);
      }
      $scope.$apply();
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
          conlog("[!] File [" + f.name + "] does not match any known schema, skipped.");
        } else {
          var skip = false;
          for (var i = 0; i < vm.books.length; i++) {
            if (vm.books[i].format == format) {
              conlog("[_] Already have a " + priceFormats[format].printname + ", skipped.");
              skip = true;
            }
          }
          if (!skip) {
            vm.hideHowto = true;
            vm.books.push({
              name: f.name,
              format: format,
              formatname: priceFormats[format].printname,
              sheet: worksheet
            });
            $scope.$apply();
            conlog("Read [" + f.name + "] in " + (enLoad - stLoad) + "ms.");
          }
        }
        updateLoadProgress();
      };
      if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
    }

    var handleDrop = function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.items) {
        filestoload = e.dataTransfer.items.length;
        filesloaded = 0;
        progbar.classList.add('bg-warning');
        progbar.classList.add('progress-bar-striped');
        setProgStatus("Loading files...");
        setProgress(1,1);
        document.getElementById('start').classList.remove('btn-outline-light');
        setStart(0);
        for (var i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            var file = e.dataTransfer.items[i].getAsFile();
            console.log("...["+i+"] " + file.name);
            var ext = reExtension.exec(file.name)[1];
            if (ext == "csv" || ext == "xlsx" || ext == "xls") {
              loadBook(file);
            } else {
              filestoload--;
              console.warn("... ["+i+"] has invalid extension " + ext.toUpperCase() + ", skipped.");
            }
          }
        }
      }
    }
    var handleDragover = function (e) {
      e.preventDefault(); //keep chrome from trying to download files instead of loading
    }

    window.addEventListener('drop', handleDrop, false);
    window.addEventListener('dragover', handleDragover, false);

    //**** DATA PROCESSING ****//
    //Sorry about this Future Me, figure out how to clean this up yeah?

    this.doBook = function (bi) {
      var b = vm.books[bi];
      var s = b.sheet;
      var sFix = new Date();
      conlog("[" + bi + "] Fixing " + b.formatname + "(" + (s.length-1) + ")...");

      var ri = 1, max = s.length, batch = 50;
      (function nextBatch() {
        setProgStatus("Fixing " + b.formatname + " (" + ri + "/" + s.length + ")...");
        for (var i = 0; i < batch && ri < max; ++i, ++ri) {
          rowsfixed.push(priceFormats[b.format].fix({bi: bi, ri: ri, row: s[ri]}));
        }
        if (ri < max) {
          setTimeout(nextBatch, 0);
        } else { 
          var eFix = new Date();
          conlog("[" + bi + "] Fixed " + vm.books[bi].formatname + " in " + (eFix - sFix) + "ms.");
          setTimeout(vm.finishBook.bind(null, bi), 0);
        }
      })();
    }

    this.finishBook = function (bi) {
      if (bi < (vm.books.length-1)) {
        setTimeout(vm.doBook.bind(null, ++bi),0);
      } else {
        conlog("Finished all fixes.");
        setTimeout(vm.identifyDupes,0);
      }
    }

    this.identifyDupes = function () {
      setProgStatus("Identifying duplicates...");
      setProgress(2,5);
      conlog("");
      conlog("Identifying duplicates...");
      var sUniq = new Date();
      var upcs = rowsfixed.map(function(col, i) { return col[9] });
      var uniqUpcs = upcs
        .map((upc) => {
          return {count: 1, upc: upc};
        })
        .reduce((a,b) => {
          a[b.upc] = (a[b.upc] || 0) + b.count;
          return a;
        }, 
      {});
      dupeUpcs = Object.keys(uniqUpcs).filter((a) => uniqUpcs[a] > 1);

      var eUniq = new Date();
      conlog("Identified " + dupeUpcs.length + " duplicate UPCs, " + (rowsfixed.length - dupeUpcs.length) + " unique in " + (eUniq - sUniq) + "ms.");
      setTimeout(vm.doDedupe, 0);
    }

    this.doDedupe = function () {
      setProgress(3,5);
      conlog("");
      conlog("Deduplicating...");
      var sDupe = new Date();
      uniqrows = rowsfixed.filter(c => !dupeUpcs.includes(c[9]));
      duperows = rowsfixed.filter(c => dupeUpcs.includes(c[9]));
      
      var di = 0, max = dupeUpcs.length, batch = 10;
      (function nextBatch(){
        setProgStatus("Deduplicating " + di + "/" + max + "...");
        for (var i = 0; i < batch && di < max; ++i, ++di) {
          vm.dedupeUpc(di);
        }
        if (di < max) {
          setTimeout(nextBatch, 0);
        } else { setTimeout(vm.finishDedupe.bind(null, sDupe)) }
      })();
      
    }

    this.dedupeUpc = function (di) {
      var thisUpc = duperows.filter(c => (c[9] == dupeUpcs[di])); //get all items with this duped upc
      var bestPriority = thisUpc.reduce((max, b) => Math.max(max, b[27]), thisUpc[0][27]); //find the highest priority in these items
      var bestPrice = thisUpc.reduce((min, b) => Math.min(min, b[11]), thisUpc[0][11]); //find the lowest price
      var thisPriorityItems = thisUpc.filter(c => (c[27] == bestPriority)).sort((a,b) => (a[11] - b[11])); //get items with this priority and sort price ascending
      var lowestPrice = thisUpc.filter(c => (c[11] == bestPrice))[0];
      var winner = thisPriorityItems[0]; //get the top item -- it will be highest priority for this duped upc, and lowest price within this priority
      var msg = "    " + dupeUpcs[di] + ": ";
      for(var item of thisUpc) {
        msg += "[" + item[25] + ":" + item[26] + "]$" + item[11] + " ";
      }
      msg += "-- > [" + winner[25] + ":" + winner[26] + "]";
      if (lowestPrice[27] != winner[27]) {
        msg += " ===!> [" + lowestPrice[25] + ":" + lowestPrice[26] + "]";
        errlog.push("Dupe UPC " + dupeUpcs[di] + " picked [" + winner[25] + ":" + winner[26] + "]$" + winner[11] + " -- but [" + lowestPrice[25] + ":" + lowestPrice[26] + "]$" + lowestPrice[11] + " is cheaper!");
      }
      conlog(msg);
      uniqrows.push(winner);
    }

    this.finishDedupe = function (sDupe) {
      var eDupe = new Date();
      conlog("Finished deduplicating in " + (eDupe - sDupe) + "ms.");
      setProgStatus("Building output file...");
      setProgress(4,5);
      conlog("");
      conlog("Building output file [Compiled Price List " + today + ".csv]...");
      setTimeout(vm.buildOutput, 0);
    }

    this.buildOutput = function () {
      uniqrows.unshift([
        "Price Update Description",     //  0
        "Price Date",                   //  1
        "Price Unit",                   //  2
        "List Price",                   //  3
        "Price Code",                   //  4
        "Manufacturer Name",            //  5
        "Catalogue Number",             //  6
        "Reference Number",             //  7
        "Supplier Name",                //  8
        "Supplier Code",                //  9 (UPC)
        "Discount",                     // 10
        "Net Price",                    // 11
        "Comments",                     // 12
        "Column 1 Price",               // 13
        "Column 2 Price",               // 14 
        "Column 3 Price",               // 15
        "Resale Price",                 // 16
        "New Price Code",               // 17
        "New Price Update Description", // 18
        "New Manufacturer Name",        // 19
        "New Catalogue Number",         // 20
        "New Reference Number",         // 21
        "New Supplier Name",            // 22
        "New Supplier Code",            // 23
        "Item Status"                   // 24
      ]);
      uniqrows = uniqrows.map(function(v) { return v.slice(0, 25); }); //drop index, linenum, priority columns 25-27
      XLSX.utils.book_append_sheet(finalOutput, XLSX.utils.aoa_to_sheet(uniqrows), "Compiled Output");
      vm.fnout = "Compiled Price List " + today + ".csv";
      vm.showDownload = true;
      document.getElementById('dlfn').innerHTML = vm.fnout;
      setTimeout(vm.allDone, 0);
    }

    this.allDone = function () {
      var eTotal = new Date();
      setProgStatus("Done.");
      setProgress(5,5);
      document.getElementById('start').classList.add('btn-outline-light');
      conlog("Finished compilation in " + (eTotal - sTotal) + "ms.");
      conlog("");
      conlog(errlog.length + " flags raised...");  
      for (var msg of errlog) { 
        conlog("    " + msg);
      }
      conlog("");
      conlog("Ready to download.");
      $scope.$apply();
    }

    //**** COMPILER ****//
    this.startCompile = function () {
      document.getElementById('start').classList.remove('btn-success');
      document.getElementById('start').classList.add('btn-success-outline');
      document.getElementById('start').disabled = true;
      document.getElementById('console').classList.add('expand');
      
      setProgStatus("Compiling...");
      setProgress(0,5);
      progbar.classList.remove('bg-warning');
      progbar.classList.add('bg-success');
      conlog("");
      conlog("Starting compile...");
      var sheetlen = 0;
      for (var i = 0; i < vm.books.length; i++) {
        sheetlen += vm.books[i].sheet.length - 1; //-1 to skip headers
      }
      conlog("...total lines to process: " + sheetlen + ".");
      conlog("");
      sTotal = new Date();

      //** STEP 1 - FORMAT FIXES **//
      setProgress(1,5);
      setTimeout(vm.doBook.bind(null, 0), 1000);

    } //end startCompile

    this.downloadOutput = function () {
      XLSX.writeFile(finalOutput, vm.fnout);
    }

    conlog("Enterprise Price Update Compiler");
    conlog(
      (new Date())
      .toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})
      .replace(/,/, '')
      .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2')
    );
  });
})();
