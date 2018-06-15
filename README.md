# Accubid Enterprise Price Update Compiler

## Built for Egan Company

**TEST PRICE FILES NOT INCLUDED FOR CONFIDENTIALITY**

* * * * *

### The Problem
  - We get multiple price lists from vendors each month
  - Prices are processed as a CSV into Enterprise Item Update
  - We prefer one update to the database to note big changes
  - The price lists have certain quirks that ruin the update
  - Some items are duplicated, which *really* breaks the update
  - The manual correction method takes three hours to explain
  - and five different Excel files

### The Solution
  - AngularJS app to process the price lists at once
  - Detect format of file based on filename and column headers
  - Apply row-by-row corrections to file
  - Deduplicate
  - Provide clean CSV output

* * * * *

### Procedure
  1. Drag and drop files onto window
  2. Sanity check - is the file an XLSX or CSV?
  3. Heuristics - does the file match a known schema?
  4. Convert to SheetJS array-of-arrays
  5. For each row of each imported file, run `priceFormats[].fix()`
  6. Combine outputs of fixes
  7. Identify duplicated UPCs in combined list
  8. Filter - unique items, duplicated items
  9. For each duplicated UPC, find lowest price of highest priority
  10. If lowest absolute price is not highest priority, raise flag
  11. Combine back into unique items
  12. Output file

* * * * *

### Libraries
  - AngularJS
  - Bootstrap
  - SheetJS