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
  } else {
    start.disabled = true;
  }
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
    this.books = [];      // [ {filename, format, sheet, ... } , ... ]

    this.rowsfixed = [];  // [ [cols] , ... ]
    this.dupes = []; // [ upc, upc, ... ]
    this.finalOutput = XLSX.utils.book_new();
    this.fnout = "";

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

    //**** COMPILER ****//
    this.startCompile = function () {
      setStart(2);
      hideHowto = true;
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
      var sTotal = new Date();

      //** STEP 1 - FORMAT FIXES **//
      setProgress(1,5);
      var sFixes = new Date();
      for (var bi = 0; bi < this.books.length; bi++) {
        var b = this.books[bi];
        var sFix = new Date();
        conlog("[" + bi + "] Fixing " + b.formatname + "(" + (b.sheet.length-1) + ")...");
        setProgStatus("Fixing " + b.formatname + "...");
        for (var ri = 1; ri < b.sheet.length; ri++) { //ri = 1, to skip headers
          this.rowsfixed.push(priceFormats[b.format].fix(b.sheet[ri], bi, ri));
        }
        var eFix = new Date();
        conlog("[" + bi + "] Fixed " + b.formatname + " in " + (eFix - sFix) + "ms.");
      }
      var eFixes = new Date();
      conlog("Fixed all items in " + (eFixes - sFixes) + "ms.");
      
      //** STEP 2 - IDENTIFY DUPLICATES **//
      setProgStatus("Identifying duplicates...");
      setProgress(2,5);
      conlog("");
      conlog("Identifying duplicates...");
      var sUniq = new Date();
      var upcs = this.rowsfixed.map(function(col, i) { return col[9] });
      var uniqUpcs = upcs
        .map((upc) => {
          return {count: 1, upc: upc};
        })
        .reduce((a,b) => {
          a[b.upc] = (a[b.upc] || 0) + b.count;
          return a;
        }, 
      {});
      this.dupes = Object.keys(uniqUpcs).filter((a) => uniqUpcs[a] > 1);

      var eUniq = new Date();
      conlog("Identified " + this.dupes.length + " duplicate UPCs, " + (this.rowsfixed.length - this.dupes.length) + " unique in " + (eUniq - sUniq) + "ms.");

      //** STEP 3 - DEDUPLICATE **//
      setProgStatus("Deduplicating...");
      setProgress(3,5);
      conlog("");
      conlog("Deduplicating...");
      var sDupe = new Date();
      var uniqrows = this.rowsfixed.filter(c => !this.dupes.includes(c[9]));
      var duperows = this.rowsfixed.filter(c => this.dupes.includes(c[9]));
      
      for (var di = 0; di < this.dupes.length; di++) {
        var thisupc = duperows.filter(c => (c[9] == this.dupes[di])); //get all items with this duped upc
        var bestPri = thisupc.reduce((max, b) => Math.max(max, b[27]), thisupc[0][27]); //find the highest priority in these items
        var thispri = thisupc.filter(c => (c[27] == bestPri)).sort((a,b) => (a[11] - b[11])); //get items with this priority and sort price ascending
        var winner = thispri[0]; //get the top item -- it will be highest priority for this duped upc, and lowest price within this priority
        var msg = "    " + this.dupes[di] + ": ";
        for(var item of thisupc) {
          msg += "[" + item[25] + ":" + item[26] + "]$" + item[11] + " ";
        }
        msg += "-- Picked [" + winner[25] + ":" + winner[26] + "]";
        conlog(msg);
        uniqrows.push(winner);
      }

      var eDupe = new Date();
      conlog("Finished deduplicating in " + (eDupe - sDupe) + "ms.");

      //** STEP 4 - BUILD OUTPUT **//
      setProgStatus("Building output file...");
      setProgress(4,5);
      conlog("");
      conlog("Building output file [Compiled Price List " + today + ".csv]...");
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
      XLSX.utils.book_append_sheet(this.finalOutput, XLSX.utils.aoa_to_sheet(uniqrows), "Compiled Output");
      this.fnout = "Compiled Price List " + today + ".csv";
      this.showDownload = true;
      document.getElementById('dlfn').innerHTML = this.fnout;

      //** STEP 5 - DONE **//
      var eTotal = new Date();
      setProgStatus("Done.");
      setProgress(5,5);
      document.getElementById('start').classList.remove('btn-success');
      document.getElementById('start').classList.add('btn-outline-light');
      conlog("Finished compilation in " + (eTotal - sTotal) + "ms.");
      conlog("Ready to download.");
    }

    this.downloadOutput = function () {
      XLSX.writeFile(this.finalOutput, this.fnout);
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
