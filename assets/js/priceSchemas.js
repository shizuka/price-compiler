/**
 * Egan Price Update Automation - Known Price List Schemas
 * Jessica Hart - 2018-06-01
 */

var priceFormats = [
  {
    // Dayna Asche - everything
    // NOTE: Dayna's is the standard grid format we send to Item Update
    printname: "Graybar-Dayna",
    filename: /EGAN COMPANY ACCUBID \d{2}\d{2}\d{4}\.csv/i,
    headers: [
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
    ],
    fix: function (row) {
      var col = row.map(String);
      for (var i = 0; i < col.length; i++) {
        if (col[i] == undefined) {col[i] = ''}
        col[i] = col[i].toString().replace(/,/g, '');
      }

      /**
         * Nonstandard Count
         * Item is a pack of 15 widgets, marked/priced E for the pack
         * Increase marker to next standard unit (C, M) and price accordingly
         * 
         * Dayna indicates these items with a prefix in description:
         *    (15CT)Widgets n Things    20180531    E   ...
         */
      if (col[0].includes("CT)") && col[2] == "E") { //0 Description, 2 Unit
        var count = parseInt(col[0].substring(1, col[0].indexOf("CT)"))); //0 Description
        if (count < 2) {
          col[2] = "E";
        } else if (count <= 100) {
          col[2] = "C";         // 2 Price Unit
          col[3]  *= 100/count; // 3 List Price
          col[11] *= 100/count; //11 Net Price
        } else if (count <= 1000) {
          col[2] = "M";
          col[3]  *= 1000/count;
          col[11] *= 1000/count;
        } else { //over 1000, no items do this yet
          col[2] = "M";
          col[3]  *= count/1000;
          col[11] *= count/1000;
        };
        col[3] = col[3].toFixed(2);
        col[11] = col[11].toFixed(2);
        conlog(col[7] + ": " + col[0] + " -- was E -- now " + col[2]);
      };

      col[15] = col[11];  //Col 3 Price == Net Price

      //De-zero and truncate catalog number
      col[6] = col[6].substring(0,29);
      if (col[3] == 0) { col[3] = col[11] }
      if (col[11] == 0) { col[11] = col[3] }
      return col;
    }
  },

  {
    //Dan Pritchard - pipe and wire
    printname: "Graybar-Dan",
    filename: /ACCUBID \d{1,2}-\d{1,2}-\d{2}\.xlsx/i,
    headers: [
      "Alternate Description",
      "Document Date",
      "Pricing unit", //1, 100, 1000
      "List Price",
      "Price Code",
      "Vendor Name",
      "Description",
      "Material",
      "Suplier Name",
      "EAN/UPC",      //UPC
      "Net price"
    ],
    fix: function (row) {
      var col = row.map(String);
      for (var i = 0; i < col.length; i++) {
        if (col[i] == undefined) {col[i] = ''}
        col[i] = col[i].toString().replace(/,/g, '');
      }

      //Format date and add 1
      col[1] = ( parseInt((new Date((col[1] - (25567 + 1))*86400*1000)) //1 Document Date
        .toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'})
        .replace(/(\d+)\/(\d+)\/(\d+)/, '$3$1$2')) + 1)
         .toString();
      //This item appears a few times as x1, priced as x10, needs to be x100
      if (col[0].includes("SS GALV CONDUIT W/COUP 10FT TYPE 304")) {
        col[2] = "100";   //2  Pricing unit
        col[10] *= 10;  //10 Net Price
        conlog((col[9]?col[9]:col[7]) + ": " + col[0]);
        col[10].toFixed(2).toString();
      }
      //Convert price units from numeric to ECM
      if (col[2] == "1") {
        col[2] = "E";
      } else if (col[2] == "100") {
        col[2] = "C";
      } else if (col[2] == "1000") {
        col[2] = "M";
      }

      if (col[9] == undefined) {
        col[9] = col[7];
      }

      //De-zero and truncate catalog number
      col[6] = col[6].substring(0,29);
      if (col[3] == 0) { col[3] = col[10] }
      if (col[10] == 0) { col[10] = col[3] }
      //Convert to standard format (Dayna)
      return [
        col[0],  //Description
        col[1],  //Date
        col[2],  //Unit
        col[3],  //List Price
        col[4],  //Price Code
        col[5],  //Manufacturer Name <- Vendor Name
        col[6],  //Catalog Number <- Description
        col[7],  //Ref Number <- Material
        col[8],  //Supplier Name
        col[9],  //Supplier Code (DB Vendor Code) <- EAN/UPC or Material if blank
        "",      //Discount
        col[10], //Net Price
        "",      //Comments
        "",      //Col 1 Price
        "",      //Col 2 Price
        col[10], //Col 3 Price <- Net Price
        "",      //Resale Price
        "",      //New Price Code
        "",      //New Description
        "",      //New Mfr Name
        "",      //New Cat Num
        "",      //New Ref Num
        "",      //New Supplier Name
        "",      //New Supplier Code (New Vendor Code)
        "A3"     //Item Status
      ];
    }
  }
  //other schemas
];