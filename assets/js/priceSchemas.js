/**
 * Egan Price Update Automation - Known Price List Schemas
 * Jessica Hart - 2018-06-01
 */

export default {
  default: {
    fix: function (col) {
      //De-zero List Price (3) and Net Price (11)
      if (col[3] == 0)  { col[3] = col[11] };
      if (col[11] == 0) { col[11] = col[3] };
      //Truncate Catalogue Number (6) at 29 chars
      col[6] = col[6].substring(0,29);
      return col;
    }
  },

  GraybarDayna: {
    // Dayna Asche - everything
    // NOTE: Dayna's is the standard grid format we send to Item Update
    print: "Graybar - Dayna",
    filename: /EGAN COMPANY ACCUBID \d{2}\d{2}\d{4}\.csv/,
    headers: [
      "Price Update Description",
      "Price Date",
      "Price Unit",     //E, C, M
      "List Price",
      "Price Code",
      "Manufacturer Name",
      "Catalogue Number",
      "Reference Number",
      "Supplier Name",
      "Supplier Code",  //UPC
      "Discount",
      "Net Price",
      "Comments",
      "Column 1 Price",
      "Column 2 Price",
      "Column 3 Price",
      "Resale Price",
      "New Price Code",
      "New Price Update Description",
      "New Manufacturer Name",
      "New Catalogue Number",
      "New Reference Number",
      "New Supplier Name",
      "New Supplier Code",
      "Item Status"
    ],
    fix: function (col) {
      /**
         * Nonstandard Count
         * Item is a pack of 15 widgets, marked/priced E for the pack
         * Increase marker to next standard unit (C, M) and price accordingly
         * 
         * Dayna indicates these items with a prefix in description:
         *    (15CT)Widgets n Things    20180531    E   ...
         */
      if (col[0].indexOf("CT)") && col[2] == "E") { //0 Description, 2 Unit
        var count = col[0].substring(1, col[0].indexOf("CT)")); //0 Description
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
      };
      //no other fixes needed
    }
  },

  GraybarDan: {
    //Dan Pritchard - pipe and wire
    print: "Graybar - Dan",
    filename: /ACCUBID \d{1,2}-\d{1,2}-\d{2}\.xlsx/,
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
    fix: function (col) {
      //Format date and add 1
      col[1] = ( parseInt((new Date(col[1])) //1 Document Date
        .toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'})
        .replace(/(\d+)\/(\d+)\/(\d+)/, '$3$1$2'))
         + 1)
         .toString();
      //This item appears a few times as x1, priced as x10, needs to be x100
      if (col[0].indexOf("SS GALV CONDUIT W/COUP 10FT TYPE 304")) {
        col[2] = 100;   //2  Pricing unit
        col[10] *= 10;  //10 Net Price
      }
      //Convert price units from numeric to ECM
      if (col[2] == 1) {
        col[2] = "E";
      } else if (col[2] == 100) {
        col[2] = "C";
      } else if (col[2] == 1000) {
        col[2] = "M";
      }

      //Convert to standard format (Dayna)
      return [
        col[0],   //Description
        col[1],   //Date
        col[2],   //Unit
        col[3],   //List Price
        col[4],   //Price Code
        col[5],   //Manufacturer Name <- Vendor Name
        col[6],   //Catalog Number <- Description
        col[7],   //Ref Number <- Material
        col[8],   //Supplier Name
        (col[9] == "" ? col[7]:col[9]), //Supplier Code (DB Vendor Code) <- EAN/UPC or Material if blank
        null,     //Discount
        col[10],  //Net Price
        null,     //Comments
        null,     //Col 1 Price
        null,     //Col 2 Price
        col[10],  //Col 3 Price <- Net Price
        null,     //Resale Price
        null,     //New Price Code
        null,     //New Description
        null,     //New Mfr Name
        null,     //New Cat Num
        null,     //New Ref Num
        null,     //New Supplier Name
        null,     //New Supplier Code (New Vendor Code)
        "A3"      //Item Status
      ];
    }
  }
  //other schemas
};