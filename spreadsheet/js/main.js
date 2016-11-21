// Copyright 2016, Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * Called everytime the spreadsheet is opened.
 */
function onOpen() {
  // Initialize dynamic config variables.
  initConfig();

  linkMatchingColumns(CONFIG.sheets.main);

  SpreadsheetApp.getUi()
      .createMenu('Preview')
      .addItem('Show ETA Preview', 'showSidebar')
      .addToUi();

  // Ensure all cell format is set to `text`.
  // This will ensure that the old value passed to the event object for triggers
  // will not be formatted.
  var sheetConfig = getSheetConfig('main');
  var mainSheet = getSheetByName(sheetConfig);
  var allRange = mainSheet.getRange(1, 1, mainSheet.getLastRow(),
                                    mainSheet.getLastColumn());
  allRange.setNumberFormat('0');
}


/**
 * For a set of columns (defined by CONFIG.sheets.main.columnsToLinks),
 * cells that are equal to each other within
 * the same column will be linked. Linked means
 * that any changes to any linked cell will cause the other cells to
 * change as well.
 *
 * @param {Object} mainConfig Contains sheet related properties. Expected
 *                            attributes to be found in mainConfig are the
 *                            following, `sheet`, `storageKey`,
 *                            `linkedCellsCacheKey`, `columnsToLink`,
 *                            `columns`, and `mismatchColumns`.
 */
function linkMatchingColumns(mainConfig)  {
  var sheet = mainConfig.sheet;

  // Get all non-empty rows.
  var nonEmptyRows = getContentRows(sheet,
                                    mainConfig.firstContentRow,
                                    mainConfig.nonEmptyColumnCheck,
                                    mainConfig.columns);

  // Storage used to store the linking data structure (MatchingColumnsBucket).
  var storage = CacheService.getPublicCache();

  // The data structure used to keep track of linked cells.
  var matchingColumnsBuckets = new MatchingColumnsBucket(storage,
                                                         mainConfig.storageKey);

  // Clear cache for both.
  matchingColumnsBuckets.clear();

  // Traverse each row.
  nonEmptyRows.forEach(function(nonEmptyRow) {

    var rowIndex = nonEmptyRow.getRowIndex();

    // Get every field that needs to be matched against.
    // And create a bucket within matchingColumnsBuckets.
    mainConfig.columnsToLink.names.forEach(function(columnName) {

      var value = nonEmptyRow.get(columnName);

      // matchingColumnsBuckets will take care of properly storing each cell
      // with its appropriate grouping.
      if (!isEmptyString(columnName) && !isEmptyString(value) &&
          !isEmpty(rowIndex)) {
        // Add 1 to keep offsets consistent with spreadsheet.
        var columnIndex = mainConfig.columns[columnName].index + 1;
        matchingColumnsBuckets.addValue(columnIndex, value, rowIndex);
      }
    });

    // Highlight any mismatching fields.
    highlightMismatchFields(nonEmptyRow, mainConfig.mismatchColumns.names,
                            mainConfig.mismatchColumns.color);
  });

  // Save matchingColumnsBuckets future retrieval.
  matchingColumnsBuckets.save();
}


/**
 * Refresh Cache if no data is present.
 *
 * @param {Object} mainConfig
 */
function refreshCache(mainConfig) {
  var storage = CacheService.getPublicCache();

  // Check if one of our cache keys have any values in them.
  var JSONString = storage.get(mainConfig.columnsToLink.storageKey);

  if (isEmptyString(JSONString)) {
    linkMatchingColumns(mainConfig);
  }
}


/**
 * A callback for an "on edit" trigger.
 *
 * @param {EventObject} event The trigger's event.
 */
function onEdit(event) {
  var sheet = event.source.getActiveSheet();
  var sheetName = sheet.getSheetName();
  var sheetConfig = getSheetConfig(sheetName);

  if (isEmpty(sheetConfig)) {
    // Only listen to events coming from known sheets.
    return;
  }

  // If working on main sheet, make sure multiple cells aren't being edited.
  if (sheetName === CONFIG.sheets.main.name && isMultiCell(event.range)) {
    showMessage('You have edited multiple cells simultaneously,' +
                ' please undo(ctrl-z) in order for sheet to function' +
                ' properly.');
    return;
  }

  // Initialize dynamic config variables.
  initConfig();
  var mainConfig = CONFIG.sheets.main;
  var settingsConfig = CONFIG.sheets.settings;

  // Handle changes in a linked toggle cell.
  if (isCellEdit(event.range, settingsConfig.name,
                 settingsConfig.enableMatchingColumnsLinkingCell)) {
    // If set to on, trigger linkMatchingColumns.
    if (!isEmpty(event.value) && event.value.trim().toLowerCase() === 'on') {
      linkMatchingColumns(mainConfig);
    }
    return;
  }

  onCellEdit(event.range, mainConfig, settingsConfig, event);
}


/**
 * Handle a single cell edit event.
 *
 * @param {Range} cell Active cell.
 * @param {Object} sheetConfig Active sheet's configuration.
 * @param {Object} settingsConfig Setting's sheet configuration.
 * @param {EventObject} event The trigger's event.
 */
function onCellEdit(cell, sheetConfig, settingsConfig, event) {
  var sheet = cell.getSheet();
  var rowIndex = cell.getRow();
  if (rowIndex < sheetConfig.firstContentRow) {
    // Only listen to events coming from the content of the list.
    return;
  }

  // Keep track of linked rows.
  var linkedRows = [];

  // Handle each column differently.
  var colIndex = cell.getColumn();

  // Offset column index.
  var columnName = sheetConfig.columns._order[colIndex - 1];

  // Handle changes to read only cells.
  if (isReadOnly(sheet, sheetConfig, rowIndex, columnName, event.oldValue)) {
    revertEdit(sheet, rowIndex, colIndex, columnName, event.oldValue);
    return;
  }

  // If this row has errors, and the user has edited any field - mark
  // it as `staged`.
  if (hasError(sheet, sheetConfig.columns, rowIndex)) {
    markRowAsStaged(sheet, rowIndex);
  }

  // Handle changes to linked cells.
  if (sheetConfig.columnsToLink.names.indexOf(columnName) !== -1) {

    // Retrieve linkedColumns enable flag.
    var enableMatchingColumnsLinking = settingsConfig.sheet.getRange(
        settingsConfig.enableMatchingColumnsLinkingCell);

    enableMatchingColumnsLinking = enableMatchingColumnsLinking.getValue().
        trim().toLowerCase();

    if (enableMatchingColumnsLinking === 'on') {
      // Cache clears every 6 hours.
      // Refresh in case it's empty
      refreshCache(sheetConfig);

      linkedRows = handleLinkedRangeEdit(sheet,
                                         event,
                                         sheetConfig.columnsToLink.storageKey,
                                         sheetConfig.columns);
    }
  }

  // Handle changes to mismatch cells.
  if (sheetConfig.mismatchColumns.names.indexOf(columnName) !== -1) {
    handleMismatchRangeEdit(sheet,
                            event,
                            linkedRows,
                            sheetConfig.mismatchColumns,
                            sheetConfig.columns);
  }
}


/**
 * For cell modified, sync linked cells with the modified cell's value.
 *
 * @param {Sheet} sheet A sheet in the spreadsheet.
 * @param {Event} event
 * @param {Array<Range>} storageKey Key where linked cells are stored.
 * @param {Object} columns A mapping between column names and column indices.
 *
 * @return {Array<SpreadSheetRow>} An array of linked rows.
 */
function handleLinkedRangeEdit(sheet, event, storageKey, columns) {
  // Initialize MatchingColumnsBucket and linkedCellsCache.
  var storage = CacheService.getPublicCache();
  var matchingColumnsBuckets = new MatchingColumnsBucket(storage, storageKey);

  var cell = event.range;
  var linkedRows = [];

  var columnIndex = cell.getColumn();
  var rowIndex = cell.getRow();

  // Retrieve cell value from cache, which is now old.
  var oldValue = event.oldValue;
  var newValue = event.value;

  // If the old value is empty or it's the same value as new
  // no need to proceed.
  if (isEmptyString(oldValue) || newValue === oldValue) {
    return false;
  }

  // Retrieve rows linked with this cell.
  var rowsToChange = matchingColumnsBuckets.getValue(columnIndex, oldValue);
  rowsToChange.forEach(function(rowIndex) {
    var row = new SpreadsheetRow(sheet, rowIndex, columns);

    // Set cell value according to it's index.
    row.setValueAt(columnIndex, newValue);

    linkedRows.push(row);
  });

  // Transfer bucket to new value, since edit triggered a change.
  matchingColumnsBuckets.transferBucket(columnIndex, oldValue, newValue);

  // Save changes made.
  matchingColumnsBuckets.save();

  return linkedRows;
}


/**
 * For every row modifed, highlight any mismatching cells.
 *
 * @param {Sheet} sheet A sheet in the spreadsheet.
 * @param {Event} event
 * @param {Array<SpreadsheetRow>} linkedRows An array of rows affected by linked
 *                                      cells. Because of the nature of linked
 *                                      cells, a change in one linked cell
 *                                      results in a change in other cells(same
 *                                      column different row). Therefore, such a
 *                                      change can potentially result in a
 *                                      mismatch in other rows.
 * @param {Object} mismatchColumns An object with `names` and `color` attributes
 *                                 indicating the names of columns to compare
 *                                 with and and color to highlight mismatch rows
 *                                 with.
 * @param {Object} columns A mapping between column names and column indices.
 */
function handleMismatchRangeEdit(sheet, event, linkedRows, mismatchColumns,
                                 columns) {
  var modifiedRow = new SpreadsheetRow(sheet, event.range.getRow(), columns);
  var modifiedRows = [modifiedRow];

  // Combine linkedRows with modifiedRows.
  if (linkedRows.length > 0) {
    modifiedRows = linkedRows.concat(modifiedRows);
  }

  modifiedRows.forEach(function(row) {
    var highlightColor = mismatchColumns.color;
    highlightMismatchFields(row, mismatchColumns.names, highlightColor);
  });
}


/**
 * Open a sidebar and load the ETA preview html file.
 */
function showSidebar() {
  // Get active row.
  var sheet = SpreadsheetApp.getActiveSheet();
  var activeCell = sheet.getActiveCell();
  var activeRowIndex = activeCell.getRowIndex();
  var sheetConfig = getSheetConfig(sheet.getName());

  // Validate selected row is within content range.
  if (activeRowIndex < sheetConfig.firstContentRow) {
    return;
  }

  // Prepare the sidebar.
  var html = HtmlService.createTemplateFromFile('preview')
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  // Get the content of the active row.
  var columns = sheetConfig.columns;
  var activeRow = sheet.getRange(activeRowIndex, 1, 1, columns._lastIndex + 1);
  var values = activeRow.getValues()[0];

  // Set sidebar title.
  html.setTitle('ETA Preview (row ' + activeRowIndex + ')');

  // Get HTML content.
  var content = html.getContent();

  // Replace placeholders with real values, if found.
  content = replaceKeyWithValue(content, columns.headline1.placeholder,
                                values[columns.headline1.index]);
  content = replaceKeyWithValue(content, columns.headline2.placeholder,
                                values[columns.headline2.index]);
  content = replaceKeyWithValue(content, columns.description.placeholder,
                                values[columns.description.index]);

  // If we have multiple final urls, select the first one.
  var finalUrl = values[columns.finalUrl.index];
  if (!isEmptyString(finalUrl)) {
    finalUrl = finalUrl.replace(/\[\"(.*)\"\]/, '$1').split(',')[0];
  }

  content = replaceKeyWithValue(content, columns.finalUrl.placeholder,
                                finalUrl);
  content = replaceKeyWithValue(content, columns.displayUrl.placeholder,
                                values[columns.displayUrl.index]);

  // Update HTML content.
  html.setContent(content);

  // Display HTML in a sidebar.
  SpreadsheetApp.getUi().showSidebar(html);
}
