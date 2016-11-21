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
 * Check if a row has errors.
 *
 * @param {Sheet} sheet The sheet to check.
 * @param {Array<string>} columns The columns in the spreadsheet.
 * @param {number} rowIndex The row index to check error for.
 *
 * @return {boolean} Whether there was an error or not.
 */
function hasError(sheet, columns, rowIndex) {
  if (isEmpty(columns) || isEmpty(rowIndex)) {
    throw 'Cannot detect an error in row. Please pass valid columns and a ' +
      'row index.';
  }

  var errorMessageCell = sheet.getRange(rowIndex,
    columns[ColumnNames.errorMessage].index + 1);
  return !isEmptyString(errorMessageCell.getValue());
}


/**
 * Mark row as staged after it was marked with an error.
 *
 * @param {Sheet} sheet The sheet to use.
 * @param {number} rowIndex The row index of which to mark as staged.
 */
function markRowAsStaged(sheet, rowIndex) {
  if (isEmpty(rowIndex)) {
    throw 'Cannot mark row as staged. Please pass a valid row index.';
  }

  var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  row.setBackground('#FFF3E0');
}


/**
 * Check whether active row / cell is read only.
 *
 * @param {Sheet} sheet Active sheet.
 * @param {Object} sheetConfig Active sheet configuration.
 * @param {number} rowIndex Active row index.
 * @param {string} columnName Active column name.
 * @param {string} oldValue Current cell previous value.
 *
 * @return {boolean} Whether in read only or not.
 */
function isReadOnly(sheet, sheetConfig, rowIndex, columnName, oldValue) {
  if (isEmpty(sheetConfig)) {
    throw 'Cannot detect read only columns. Please pass a valid sheet' +
        'configuration';
  }

  // Check explicit read only columns.
  if (!isEmpty(sheetConfig.readOnlyColumns) &&
      sheetConfig.readOnlyColumns.indexOf(columnName) !== -1) {
    return true;
  }

  // Check implicit read only columns.
  // If currently active cell is either STA Status or ETA Status and previous
  // value was `disabled`, mark it as read only.
  if (((columnName === ColumnNames.staStatus) ||
      (columnName === ColumnNames.etaStatus)) &&
      oldValue === AdStatus.disabled) {
    return true;
  }

  // All ETA fields become read only once its status changes to `disabled`.
  var etaStatusCell = sheet.getRange(rowIndex,
    sheetConfig.columns[ColumnNames.etaStatus].index + 1);
  if (etaStatusCell.getValue() === AdStatus.disabled) {
    return true;
  }

  // All ETA fields, besides status, become read only once the ETA has been
  // created.
  var etaIdCell = sheet.getRange(rowIndex,
    sheetConfig.columns[ColumnNames.etaId].index + 1);
  if (!isEmptyString(etaIdCell.getValue()) &&
      columnName !== ColumnNames.etaStatus &&
      columnName !== ColumnNames.staStatus) {
    return true;
  }

  return false;
}


/**
 * Create an identity mapping such that each object key maps to the key value.
 * For example: input: ['foo', 'bar'], output: {foo: 'foo', bar: 'bar'}.
 *
 * @param {Array<string>} values An array of strings used to create an identity
 *                               map.
 *
 * @return {Object} A mapping between each `key` in `values` to `key`.
 */
function createIdentityMap(values) {
  return values.reduce(function(cur, key) {
    cur[key] = key;
    return cur;
  }, {});
}


/**
 * Get a sheet configuration object.
 *
 * @param {string} sheetName The configuration sheet's name.
 *
 * @return {?Object} A configuration sheet, or `null` if not found.
 */
function getSheetConfig(sheetName) {
  if (isEmpty(CONFIG)) {
    throw 'Mising global CONFIG object.';
  }

  if (!isEmptyString(sheetName)) {
    for (var key in CONFIG.sheets) {
      var configSheet = CONFIG.sheets[key];
      if (configSheet && configSheet.name === sheetName) {
        return configSheet;
      }
    }
  }

  return null;
}


/**
 * Revert back to original value.
 *
 * @param {Sheet} sheet Sheet object.
 * @param {number} rowIndex The row index of selected cell to revert.
 * @param {number} colIndex The column index of selected cell to revert.
 * @param {string} columnName The column name.
 * @param {string} oldValue The previous value set on selected cell.
 */
function revertEdit(sheet, rowIndex, colIndex, columnName, oldValue) {
  if (isEmptyString(oldValue)) {
    showMessage('Failed to revert to old value - previous value not found.');
    return;
  }

  // Set old value.
  var cell = sheet.getRange(rowIndex, colIndex);
  cell.setValue(oldValue);

  // Notify the user that this field is read-only
  showMessage(columnName + ' is read-only (and may populate automatically).');
}


/**
 * Helper method to generate reference data to columns.
 *
 * @param {Array<string>} columns An array of column names, ordered by their
 *                        appearance in the sheet.
 *
 * @return {Object} The column reference data object.
 */
function generateColumnData(columns) {
  if (columns == null || !(columns instanceof Array)) {
    throw 'Columns must be a valid Array';
  }

  var result = {
    _order: columns
  };

  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    result[column] = {
      index: i,
      placeholder: '[' + column + ']'
    };
  }

  // Store the last column index for reference.
  result._lastIndex = columns.length - 1;
  return result;
}


/**
 * Helper method to easily include content within an HTML file.

 * @param {string} filename The filename to import.
 *
 * @return {string} The content within the <code>filename</code>.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/**
 * Replace a key string with a value string, if found.
 *
 * @param {string} content The content used to look for <code>key</code>.
 * @param {string} key A lookup key.
 * @param {string} value The value that replaces the <code>key</code>.
 *
 * @return {string} New string with replaced key->value, if existed.
 */
function replaceKeyWithValue(content, key, value) {
  if (!isEmptyString(value)) {
    content = content.replace(key, value);
  }

  return content;
}


/**
 * NOTE: This implementation does not mimic at 100% AdWords implementation.
 *
 * A very naive way to get the domain from the final URL.
 *
 * @param {string} finalUrl The final URL.
 *
 * @return {string} The domain used as the display URL.
 */
function getDisplayUrl(finalUrl) {
  if (!isEmptyString(finalUrl)) {
    var regex = /^(https?\:\/\/)?([^\/:?#]+)(?:[\/:?#]|$)/i;
    var matches = finalUrl.match(regex);
    finalUrl = matches && matches[matches.length - 1];
  }

  return finalUrl;
}


/**
 * Find a specific sheet by its name.
 *
 * @param {string|Object} name Sheet name, or object with a `name` attribute
 *                             that holds the sheet's name.
 *
 * @return {Sheet} The sheet if found, o/w 'undefined'.
 */
function getSheetByName(name) {
  // Support objects that hold the sheet name as a property.
  if (name instanceof Object && name.hasOwnProperty('name')) {
    name = name.name;
  }

  if (isEmptyString(name)) {
    return undefined;
  }

  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var sheet;
  sheets.every(function(currentSheet) {
    var sheetName = currentSheet.getSheetName();
    if (sheetName === name) {
      sheet = currentSheet;
    }

    return (sheet === undefined);
  });

  return sheet;
}


/**
 * Safely check if a string is empty.
 *
 * @param {string} str
 *
 * @return {boolean}
 */
function isEmptyString(str) {
  if (!str) {
    return true;
  }

  if (typeof str === 'string' || str instanceof String) {
    return str.trim() === '';
  }

  return false;
}


/**
 * Check if `obj` is null or undefined.
 *
 * @param {Object} obj
 *
 * @return {boolean}
 */
function isEmpty(obj) {
  return obj === null || obj === undefined;
}


/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 *
 * @return {boolean}
 */
function isObject(obj) {
  // Check if obj exists and has Object string value
  if (!obj ||
      toString.call(obj) !== '[object Object]') {
    return false;
  }
  // Check if constructor is owned
  if (obj.constructor &&
      !hasOwnProperty.call(obj, 'constructor') &&
      !hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf')) {
    return false;
  }
  // Empty if no properties OR
  // All properties are owned is last enum property is owned
  var key;
  for (key in obj) {}

  return key === undefined || hasOwnProperty.call(obj, key);
}


/**
 * Check if `obj` is a valid params object.
 *
 * @param {Object} obj
 * @param {Array<Object>} valueTypes A list of valid value types allowed as
 *                              parameters
 * @param {boolean} emptyIsInvalid A boolean defining if an empty object is
 *                                 invalid
 *
 * @return {Object} An object with { success: <boolean>, error: <string> },
 *                  where error is the reason for failure if success is
 *                  false.
 */
function isValidParamsObject(obj, valueTypes, emptyIsInvalid) {
  var result = {
    success: false,
    error: ''
  };
  if (obj === null) {
    result.error = 'params is null';
    return result;
  }
  if (obj === undefined) {
    result.error = 'params is undefined';
    return result;
  }
  if (!isObject(obj)) {
    result.error = 'params is not an object';
    return result;
  }
  if (!valueTypes || !Array.isArray(valueTypes)) {
    result.error = 'valueTypes is not a valid array';
    return result;
  }
  var keyCount = 0;
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var value = obj[key];
      if (valueTypes.indexOf(typeof value) === -1) {
        result.error = 'key `' + key + '` has an invalid type `' +
            typeof value + '`';
        return result;
      }
    }
    keyCount++;
  }
  if (emptyIsInvalid && keyCount === 0) {
    result.error = 'params is empty';
    return result;
  }
  result.success = true;
  return result;
}


/**
 * Present a message on screen to the client.
 *
 * @param {string} message
 */
function showMessage(message) {
  if (message) {
    SpreadsheetApp.getActiveSpreadsheet().toast(message);
  }
}


/**
 * Present a message on screen for debugging purposes.
 *
 * @param {string} message
 */
function showDebugMessage(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message);
}


/**
 * Similar to [].map(func), only for own properties of an object.
 *
 * @param {Object} obj The object on which to apply the mapping.
 * @param {function} func The function to apply on each property.
 *
 * @return {Object} The same object with `func` applied on each of its
 *                  properties.
 */
function mapInObj(obj, func) {
  var result = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = func(obj[key]);
    }
  }

  return result;
}


/**
 * Wrap `func` so that it may receive default input.
 * ```
 * For example:
 * function add(a, b) {
 *   return a + b;
 * }
 *
 * var add1 = compose(add, 1);
 * add1(2); // 3
 *
 * @param {function} func The function to wrap.
 *
 * @return {function} The composed function. (for lack of better name.)
 */
function compose(func) {
  var prevArgs = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    var args = prevArgs.concat(newArgs);
    return func.apply(this, args);
  }
}


/**
 * Recursively calls on `compose` for each property in `object`.
 *
 * @param {Object} object The object used.
 *
 * @return {Object} The `object` with each of its properties composed with
 *                  passed arguments.
 */
function composeRecursive(object) {
  var args = Array.prototype.slice.call(arguments, 1);
  return mapInObj(object, function(prop) {
    if (prop instanceof Function) {
      // Only compose functions.
      return compose.apply(object, [prop].concat(args));
    } else {
      // If it's not a function, return the value as is.
      return prop;
    }
  });
}


/**
 * Retrieves an array of values from object based on a list of keys.
 *
 * @param {Object} columns Object to retrieve values from.
 * @param {Array<string>} keys Array of keys to query object for.
 *
 * @return {Array<Object>}
 */
function getIndicesFromColumns(columns, keys) {
  var values = [];

  keys.forEach(function(key) {
    if (key in columns) {
      // Relative to 1.
      values.push(columns[key].index + 1);
    }
  });

  return values;
}



/**
 * An object representation of a row in a spreadsheet.
 *
 * @param {Sheet} sheet A Sheet in a spreadsheet.
 * @param {int} rowIndex Index to retrieve row from sheet.
 * @param {Object} columnNamesToIndices A mapping between a column header name
 *                 and its index.
 *
 * @constructor
 */
function SpreadsheetRow(sheet, rowIndex, columnNamesToIndices) {
  if (isEmpty(sheet) || isEmpty(columnNamesToIndices || rowIndex < 0)) {
    throw 'Invalid parameters.';
  }

  // The Range of the row in sheet.
  this.range_ = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  // The values of the row in sheet.
  this.values_ = this.range_.getValues()[0];

  this.rowIndex_ = rowIndex;
  this.columnNamesToIndices_ = columnNamesToIndices;
}


/**
 * Retrieve the column index of a column name.
 *
 * @private
 *
 * @param {string} columnName
 *
 * @return {int} The index of columnName.
 */
SpreadsheetRow.prototype.getColumnIndex_ = function(columnName) {
  if (!(columnName in this.columnNamesToIndices_)) {
    throw 'Column `' + columnName + '` does not exist.';
  } else {
    return this.columnNamesToIndices_[columnName].index;
  }
};


/**
 * Sets the value of a given column for this row.
 *
 * @param {string} columnName
 * @param {string|int} value
 *
 */
SpreadsheetRow.prototype.set = function(columnName, value) {
  var columnIndex = this.getColumnIndex_(columnName);
  // this.range_ indices are relative to 1.
  this.range_.getCell(1, columnIndex + 1).setValue(value);
  this.values_[columnIndex] = value;
};


/**
 * Sets the value of a given column for this row.
 *
 * @param {number} columnIndex
 * @param {string|number} value
 *
 */
SpreadsheetRow.prototype.setValueAt = function(columnIndex, value) {
  this.range_.getCell(1, columnIndex).setValue(value);
  // this.values_ array is relative to 0.
  this.values_[columnIndex - 1] = value;
};


/**
 * Gets the value at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {string|int}
 */
SpreadsheetRow.prototype.get = function(columnName) {
  var columnIndex = this.getColumnIndex_(columnName);
  return this.values_[columnIndex];
};


/**
 * Parse value as a JSON object. Value must be either string or an array.
 * Also handles the case where a value may be a string with out
 * quotations.
 *
 * @param {string} columnName
 *
 * @return {Array}
 */
SpreadsheetRow.prototype.getArray = function(columnName) {
  var columnIndex = this.getColumnIndex_(columnName);

  var values = [];

  if (isEmptyString(this.values_[columnIndex])) {
    return values;
  }

  try {
    values = JSON.parse(this.values_[columnIndex]);
  } catch (err) {
    // Maybe a valid string with no quotations is present.
    var valueWithQuotes = '"' + this.values_[columnIndex] + '"';

    try {
      values = JSON.parse(valueWithQuotes);
    } catch (err) {
      throw 'Incorrect JSON value stored in `' + columnName + '` column.';
    }
  }

  // Must be an array or string.
  if (!Array.isArray(values) && (typeof values !== 'string')) {
    throw 'Incorrect array value stored in `' + columnName + '` column.';
  }

  // At this point it must be an array or string. If it's a string,
  // keep return type consistent by always returning an array.
  if (!Array.isArray(values)) {
    values = [values];
  }

  return values;
};


/**
 * Gets the value at a given column for this row.
 *
 * @param {int} columnIndex
 *
 * @return {string|int}
 */
SpreadsheetRow.prototype.getValueAt = function(columnIndex) {
  // this.values_ array is relative to 0.
  return this.values_[columnIndex - 1];
};


/**
 * Clears the row.
 */
SpreadsheetRow.prototype.clear = function() {
  if (isEmpty(this.range_)) {
    throw 'Invalid range object.';
  }

  this.range_.clear();
  this.values_ = [];
};


/**
 * Retrieve the cell at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {Range} Range will always be one cell.
 */
SpreadsheetRow.prototype.getCell = function(columnName) {
  var columnIndex = this.getColumnIndex_(columnName);
  // this.range_ indices are relative to 1.
  return this.range_.getCell(1, columnIndex + 1);
};


/**
 * Retrieve the index of this row in spreadsheet.
 *
 * @return {int}
 */
SpreadsheetRow.prototype.getRowIndex = function() {
  return this.rowIndex_;
};


/**
 * Retrieves all non-empty rows, starting from config.startRowIndex.
 *
 * @param {Sheet} sheet A sheet in the spreadsheet.
 * @param {int} firstContentRow The index which content is expected to start.
 * @param {int} nonEmptyColumnCheck The column index to check and determine
 *                                  if row is considered empty.
 * @param {Object} columnNamesToIndices A mapping between column indices and
 *                 column names.
 *
 * @return {Array<SpreadSheetRow>} Rows containing the main content of the
 *                                 sheet.
 */
function getContentRows(sheet, firstContentRow, nonEmptyColumnCheck,
                        columnNamesToIndices) {
  // Make sure parameters are valid.
  if (isNaN(firstContentRow) ||
      firstContentRow <= 0 ||
      isEmptyString(nonEmptyColumnCheck) ||
      isEmptyString(columnNamesToIndices)) {
    throw 'Incorrect parameters.';
  }

  // Last row to retrieve.
  var endRowIndex = sheet.getLastRow();
  var spreadsheetRows = [];

  for (var startRowIndex = firstContentRow; startRowIndex <= endRowIndex;
       startRowIndex++) {
    var row = new SpreadsheetRow(sheet, startRowIndex, columnNamesToIndices);

    // Check against the nonEmptyColumnIndex, to make sure
    // this row contains values.
    if (!isEmptyString(row.get(nonEmptyColumnCheck))) {
      spreadsheetRows.push(row);
    }
  }

  return spreadsheetRows;
}


/**
 * Retrieves the domain portion of a URL. Strip leading protocol and `www`.
 *
 * @param {string} url
 *
 * @return {string}
 */
function getDomain(url) {
  if (isEmptyString(url) || (typeof url !== 'string')) {
    throw 'Invalid `url` parameter.';
  }

  // Avoiding the use of tricky regex.
  var httpPrefix = 'http://';
  var httpsPrefix = 'https://';
  var wwwPrefix = 'www.';

  var strippedUrl = url;

  var httpIndex = strippedUrl.indexOf(httpPrefix);
  if (httpIndex === 0) {
    strippedUrl = strippedUrl.substr(httpPrefix.length);
  }

  var httpsIndex = strippedUrl.indexOf(httpsPrefix);
  if (httpsIndex === 0) {
    strippedUrl = strippedUrl.substr(httpsPrefix.length);
  }

  var wwwIndex = strippedUrl.indexOf(wwwPrefix);
  if (wwwIndex === 0) {
    strippedUrl = strippedUrl.substr(wwwPrefix.length);
  }

  // Since 'http(s)://' was removed, we can now split with '/'
  // in order to retrieve domain.
  var domain = strippedUrl.split('/')[0];
  if (!isEmptyString(domain)) {
    domain = domain.toLowerCase();
  }

  return domain;
}


/**
 * Highlights all the cells in columnNames if any cell does not match the other.
 * Only works with URLs.
 *
 * @param {SpreadsheetRow} spreadsheetRow An instance of SpreadsheetRow,
 *                                        representing a sheet row.
 * @param {Array<string>} columnNames An array of columns to compare.
 * @param {string} color The color to set background to.
 */
function highlightMismatchFields(spreadsheetRow, columnNames, color) {
  var rowIndex = spreadsheetRow.getRowIndex();

  var init = true;
  var previousDomain = null;
  var highlightColor = null;

  // Check if all values match.
  var allMatch = columnNames.every(function(columnName) {
    var urls = spreadsheetRow.getArray(columnName);
    var domain = getDomain(urls[0]);

    if (init) {
      init = false;
    }
    else if (previousDomain !== domain) {
      return false;
    }

    previousDomain = domain;
    return true;

  });

  // If all values equivalent then set all backgrounds to null (clear
  // background).
  if (!allMatch) {
    highlightColor = color;
  }

  columnNames.forEach(function(columnName) {
    var cell = spreadsheetRow.getCell(columnName);
    cell.setBackground(highlightColor);
  });
}


/**
 * Determines if cell belongs to a cell in sheet identified by sheet name and
 * cell's A1 notation.
 *
 * @param {Range} cell
 * @param {string} sheetName
 * @param {string} cellA1Notation
 *
 * @return {boolean}
 */
function isCellEdit(cell, sheetName, cellA1Notation) {
  return (cell.getA1Notation() === cellA1Notation &&
          cell.getSheet().getName() === sheetName);
}


/*
 * Determines if a range is composed of at least 2 cells.
 *
 * @param {Range} range
 *
 * @return {boolean}
 */
function isMultiCell(range) {
  var numOfColumns = range.getNumRows();
  var numOfRows = range.getNumColumns();

  return (numOfColumns > 1 || numOfRows > 1);
}

//////////////////////////////////////////////////////////////////////////
//////////////////// MatchingColumnsBucket Structure /////////////////////
//////////////////////////////////////////////////////////////////////////



/**
 * Data structure used for grouping and bucketing matching cells.
 *
 * @param {Object} storage The object to use for storing values.
 * @param {string} storageKey The location where the cached value is located
 *                             in storage.
 *
 * @constructor
 */
function MatchingColumnsBucket(storage, storageKey) {
  if (!storage) {
    throw 'Invalid storage.';
  }

  this.matchingColumnsBuckets_ = {};
  this.storage_ = storage;
  this.storageKey_ = storageKey;

  // Load data from storage.
  this.load_();
}


/**
 * Loads data from storage.
 *
 * @private
 */
MatchingColumnsBucket.prototype.load_ = function() {
  var JSONString = this.storage_.get(this.storageKey_);

  if (!isEmptyString(JSONString)) {
    try {
      this.matchingColumnsBuckets_ = JSON.parse(JSONString);
    } catch (err) {
      throw 'Invalid JSON string stored in MatchingColumnsBucket\'s cache.';
    }
  }
};


/**
 * Hashing function.
 *
 * @private
 *
 * @param {string} str The string value to hash and create an index.
 *
 * @return {number}
 */
MatchingColumnsBucket.prototype.hashCode_ = function(str) {
  var hash = 0, i, chr, len;

  if (isEmptyString(str)) {
    return hash;
  }

  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    // Convert to 32bit integer
    hash |= 0;
  }

  return hash;
};


/**
 * Adds value in the appropriate column and bucket group.
 *
 * @param {string} columnKey The key used to create top level index.
 * @param {string} bucketKey The key used to hash and create second level index
 *                           under columnKey.
 * @param {string} value The value to append to bucket.
 */
MatchingColumnsBucket.prototype.addValue = function(columnKey, bucketKey,
                                                    value) {
  if (isEmptyString(columnKey) || isEmptyString(bucketKey) ||
      isEmptyString(value)) {
    throw 'columnKey, bucketKey, and value must have valid values.';
  }

  // If top level columnKey doesn't exist, create it.
  if (!(columnKey in this.matchingColumnsBuckets_)) {
    this.matchingColumnsBuckets_[columnKey] = {};
  }

  // Get hash of bucketKey.
  var bucketHash = this.hashCode_(bucketKey);

  // If bucket doesn't exist, create it.
  if (!(bucketHash in this.matchingColumnsBuckets_[columnKey])) {
    this.matchingColumnsBuckets_[columnKey][bucketHash] = [];
  }

  // Append value to bucket.
  this.matchingColumnsBuckets_[columnKey][bucketHash].push(value);
};


/**
 * Returns the value stored in a particular bucket. Bucket is defined by
 * its columnKey and hash of bucketKey.
 *
 * @param {string} columnKey The key used to find column.
 * @param {string} bucketKey The key used to hash and find bucket.
 *
 * @return {?Object}
 */
MatchingColumnsBucket.prototype.getValue = function(columnKey, bucketKey) {
  if (isEmptyString(columnKey) || isEmptyString(bucketKey)) {
    throw 'columnKey, and bucketKey must have valid values.';
  }

  if (this.matchingColumnsBuckets_[columnKey]) {
    var bucketHash = this.hashCode_(bucketKey);
    return this.matchingColumnsBuckets_[columnKey][bucketHash];
  } else {
    return null;
  }
};


/**
 * Creates a new bucket to transfer the bucket to.
 *
 * @param {string} columnKey The key used to find column.
 * @param {string} currentBucketKey The key used to hash and find bucket.
 * @param {string} newBucketKey The new bucket key to transfer to.
 */
MatchingColumnsBucket.prototype.transferBucket = function(columnKey,
                                                          currentBucketKey,
                                                          newBucketKey) {
  if (isEmptyString(columnKey) || isEmptyString(currentBucketKey) ||
      isEmptyString(newBucketKey)) {
    throw 'columnKey, bucketKey, and newBucketKey must have valid values.';
  }

  // Retrieve values.
  var valuesToTransfer = this.getValue(columnKey, currentBucketKey);
  var valuesInNewBucket = this.getValue(columnKey, newBucketKey);

  if (valuesInNewBucket) {
    valuesToTransfer = valuesToTransfer.concat(valuesInNewBucket);
  }

  var currentBucketHash = this.hashCode_(currentBucketKey);
  var newBucketHash = this.hashCode_(newBucketKey);

  this.matchingColumnsBuckets_[columnKey][newBucketHash] = valuesToTransfer;
  this.matchingColumnsBuckets_[columnKey][currentBucketHash] = null;
};


/**
 * Saves current matchingColumnsBuckets_ to storage.
 */
MatchingColumnsBucket.prototype.save = function() {
  // `21600` parameter is the longest values can be stored for (in seconds).
  this.storage_.put(this.storageKey_,
                    JSON.stringify(this.matchingColumnsBuckets_), 21600);
};


/**
 * Erases current matchingColumnsBuckets_ and storage.
 */
MatchingColumnsBucket.prototype.clear = function() {
  this.storage_.put(this.storageKey_, null);
  this.matchingColumnsBuckets_ = {};
};
