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

//////////////////////////////////////////////////////////////////////////
//////////////////////////////// UTILS ///////////////////////////////////
//////////////////////////////////////////////////////////////////////////

/**
 * Get a unique file tag that be used to locate the file.
 *
 * @param {string} seed A seed string used to generate a unique tag.
 *
 * @return {string} A unique string associated with the current account and
 *                  the seed used.
 */
function getUniqueFileTag(seed) {
  // Use the account ID as an additional identifier.
  var currentAccount = AdWordsApp.currentAccount();
  return seed + '-' + currentAccount.getCustomerId();
}


/**
 * Compare two arrays. Nested objects within the array will be compared
 * by reference. Therefore, an identical objects but of two different
 * instances will be considered not equal.
 *
 * For example:
 * isArrayShallowEquals([1, {a: 1}], [1, {a: 1}]) // false.
 * var obj = {a: 1};
 * isArrayShallowEquals([1, obj], [1, obj]) // true.
 *
 * @param {Array} a Array A.
 * @param {Array} b Array B.
 *
 * @return {boolean} Whether both arrays are shallowly equal or not.
 */
function isArrayShallowEquals(a, b) {
  // Condition 1: one of the arrays is empty.
  if ((!a && b) || (!b && a)) {
    return false;
  }

  // Condition 2: both arrays are null or undefined.
  if (a == null && a == b) {
    return true;
  }

  // Condition 3: either one of the arguments is not an array.
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }

  // Condition 4: arrays of different length.
  if (a.length !== b.length) {
    return false;
  }

  // Condition 5: compare each element in the arrays.
  for (var i = 0; i < a.length; i++) {
    // Shallow compare.
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}


/**
 * Get the first element in an array.
 *
 * @param {Array} arr The array from which to get the first element.
 *
 * @return {Object} The first element in the array or `null` if empty. If
 *                   `arr` is not an array, return it as is.
 */
function getFirstElementInArray(arr) {
  if (!arr || !Array.isArray(arr)) {
    return arr;
  }

  if (arr.length === 0) {
    return null;
  }

  return arr[0];
}


/**
 * Check if given string is empty.
 *
 * @param {string} str Empty string candidate.
 *
 * @return {boolean} True if string is empty, o/w false.
 */
function isEmptyString(str) {
  if (str == null) {
    return true;
  }

  if (isString(str)) {
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
  // Check is constructor is owned
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
 * @param {Array} valueTypes A list of valid value types allowed as parameters
 * @param {boolean} emptyIsInvalid A boolean defining if an empty object is
 *                                 invalid
 *
 * @return {Object} An object with { success: <boolean>, message: <string> },
 *                   where message is the reason for failure if success is
 *                   false.
 */
function isValidParamsObject(obj, valueTypes, emptyIsInvalid) {
  var result = {
    success: false,
    message: ''
  };

  if (!emptyIsInvalid && (isEmpty(obj) || isEmptyString(obj))) {
    result.success = true;
    return result;
  }

  if (obj === null) {
    result.message = 'params is null';
    return result;
  }
  if (obj === undefined) {
    result.message = 'params is undefined';
    return result;
  }
  if (!isObject(obj)) {
    result.message = 'params is not an object';
    return result;
  }
  if (!valueTypes || !Array.isArray(valueTypes)) {
    result.message = 'valueTypes is not a valid array';
    return result;
  }
  var keyCount = 0;
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var value = obj[key];
      if (valueTypes.indexOf(typeof value) === -1) {
        result.message = 'key `' + key + '` has an invalid type `' +
            typeof value + '`';
        return result;
      }
    }
    keyCount++;
  }
  if (emptyIsInvalid && keyCount === 0) {
    result.message = 'params is empty';
    return result;
  }
  result.success = true;
  return result;
}


/**
 * Print to logger if in DEBUG mode.
 *
 * @param {string} msg The message to print with Logger.
 * @param {?Array} arr An array of strings to print.
 */
function print(msg, arr) {
  if (CONFIG.debug) {
    if (arr) {
      Logger.log(msg + ' ' + arr.join(', '));
    } else {
      Logger.log(msg);
    }
  }
}


/**
 * Check if `str` is a string.
 *
 * @param {string} str Questionable string.
 *
 * @return {boolean} Whether `str` is indeed a string.
 */
function isString(str) {
  return typeof str === 'string' || str instanceof String;
}


/**
 * Compares the performance between two ads.
 *
 * @param {Ad} a Ad a.
 * @param {Ad} b Ad b.
 *
 * @return {number} +1 if Ad a has better performance, -1 if Ad b has better
 *         performance, and 0 if equal.
 */
function comparePerformance(a, b) {
  var impressionsDiff = a.row.impressions - b.row.impressions;
  var ctrDiff = parseFloat(a.row.ctr) - parseFloat(b.row.ctr);

  var absImpressionsDiff = Math.abs(impressionsDiff);
  var absCtrDiff = Math.abs(ctrDiff);

  /**
   * Helper function to compare impressions and CTR.
   *
   * @param {number} impressionDiff The difference between both impressions.
   * @param {number} ctrDiff The difference between both CTRs.
   *
   * @return {number} +1 if impressionDiff is > 0, or if impressionDiff === 0
   *                  and ctrDiff > 0. -1 if impressionDiff is < 0, or if
   *                  impressionDiff === 0 and ctrDiff < 0. Otherwise, returns
   *                  0.
   */
  function _compare(impressionDiff, ctrDiff) {
    // Choose the ad with the most impressions.
    if (impressionsDiff > 0) {
      return 1;
    } else if (impressionsDiff < 0) {
      return -1;
    } else {
      // Both ads have equal impressions, choose highest CTR.
      if (ctrDiff > 0) {
        return 1;
      } else if (ctrDiff < 0) {
        return -1;
      } else {
        return 0;
      }
    }
  }

  if (absImpressionsDiff < CONFIG.performance.impressionsThreshold) {
    // The difference in impressions is insignificant, gauge at CTR.
    if (absCtrDiff < CONFIG.performance.ctrThreshold) {
      // The difference in CTR is insignificant, choose the highest impresssion,
      // or the highest CTR in case impressions are equal.
      return _compare(impressionsDiff, ctrDiff);
    } else if (ctrDiff > 0) {
      // The difference in CTR is significant, therefore if it's positive it
      // should be in favor of *this* ad.
      return 1;
    } else {
      // The difference in CTR is significant, therefore if it's negative it
      // should be in favor of *compared* ad.
      return -1;
    }
  } else if (impressionsDiff > 0) {
    // The difference in impressions is significant, therefore if it's positive
    // it should be in favor of *this* ad.
    return 1;
  } else {
    // The difference in impressions is significant, therefore if it's negative
    // it should be in favor of *compared* ad.
    return -1;
  }
}


/**
 * Composite to reverse ad compare in order to have the most perfoming ad at
 * index 0.
 *
 * @param {function (number, number) : boolean} compareFunc The original compare
 *                                                          function.
 *
 * @return {function (number, number) : boolean} A reverse version of
 *                                               compareFunc.
 */
function reverseCompare(compareFunc) {
  return function(a, b) {
    return -compareFunc(a, b);
  };
}


/**
 * Traverse the report and keep the top most NUM_OF_ADS that
 * are considered most performing based on the configuration given.
 *
 * @param {AdWordsApp.Report} report The report from which we want to
 *                                   extrapolate the most performing ads.
 * @param {{reportFields: Array<string>,
 *          numOfAds: number}} config The configuration used to define which
 *                                    ads to consider most performing.
 *
 * @return {Array<Ad>} A sorted array of Ads by performance
 */
function getMostPerformingAds(report, config) {
  if (report === null) {
    throw 'Failed to find most performing ads: Report used for retrieving ' +
          'top performing ads is empty';
  }

  // Traverse all rows.
  var currentAccount = AdWordsApp.currentAccount();
  var result = [];
  var rows = report.rows();
  while (rows.hasNext()) {
    var ad = new Ad(rows.next(), config.reportFields, null, currentAccount);
    result.push(ad);
  }

  // Sort by performance.
  result.sort(reverseCompare(comparePerformance));
  return result;
}


/**
 * Retrieve ETA reports.
 *
 * @param {{etaReportStartDate: string,
 *          reportFields: Array<string>,
 *          apiVersion: string}} config The configuration used to select and
 *                                      parse ETA reports. `etaReportStartDate`
 *                                      should be formatted as YYYYMMDD.
 *
 * @return {Array<Ad>} A sorted array of ETAs.
 */
function getETAReports(config) {
  var report = AdWordsApp.report(
      'SELECT ' + config.reportFields.join(',') + ' ' +
      'FROM     AD_PERFORMANCE_REPORT ' +
      'WHERE    AdType = "EXPANDED_TEXT_AD" ' +
      'AND Date >= "' + config.etaReportStartDate + '"', {
        apiVersion: config.apiVersion
      });

  if (report === null) {
    return null;
  }

  // Traverse all rows.
  var currentAccount = AdWordsApp.currentAccount();
  var result = [];
  var rows = report.rows();
  while (rows.hasNext()) {
    var ad = new Ad(rows.next(), config.reportFields, null, currentAccount);
    result.push(ad);
  }

  return result;
}


/**
 * Attempt to open an existing spreadsheet with description containing
 * `config.templateId`. If not found, copy template spreadsheet with id
 * `config.templateId` and return its handle.
 *
 * @param {{templateId: string,
 *          targetName: string}} config A configuration object with meta-data
 *                                      about the target spreadsheet.
 * @param {?string} emailToNotify An email address to send out notification
 *                                when creating a new spreadsheet. If none is
 *                                given, will use the email address of the
 *                                owner of the spreadsheet.
 *
 * @return {Spreadsheet} Selected spreadsheet.
 */
function getSpreadsheet(config, emailToNotify) {
  if (isEmpty(config)) {
    throw 'Config is missing. Cannot get spreadsheet';
  }

  if (isEmptyString(config.templateId) || isEmptyString(config.targetName)) {
    throw 'Config must include both `templateId` and `targetName` fields.';
  }

  var spreadsheetFile;
  // Attempt to locate the spreadsheet.
  // Throws an exception when spreadsheet not found.
  var files = DriveApp.searchFiles('fullText contains "' +
                                   getUniqueFileTag(config.templateId) + '"');
  if (files.hasNext()) {
    spreadsheetFile = files.next();
    if (files.hasNext()) {
      print('WARNING: more than one file with \'' + config.templateId +
                 '\' detected.');
    }
  } else {
    // Create a copy of the template spreadsheet.
    spreadsheetFile = copyFile(config.templateId, config.targetName);
    if (spreadsheetFile) {
      // Notify via email.
      if (isEmptyString(emailToNotify)) {
        // Set the default email address to owner's email address.
        emailToNotify = getFileOwnerEmail(spreadsheetFile);
      }

      notify(emailToNotify, SPREADSHEET_CREATED, spreadsheetFile.getUrl());
    }
  }

  // Get spreadsheet by ID.
  var spreadsheet = null;
  try {
    spreadsheet = !!spreadsheetFile &&
      SpreadsheetApp.openById(spreadsheetFile.getId());
  } catch (err) {
    print(err);
  }

  if (!spreadsheet) {
    throw 'Spreadsheet is missing or unavailable. Please ensure the URL is ' +
          'correct and that you have permission to edit';
  } else {
    return spreadsheet;
  }
}


/**
 * Open spreadsheet with name `config.targetName` and select its sheet with
 * name `config.sheetName`.
 *
 * @param {{sheetName: string,
 *          templateId: string,
 *          targetName: string}} config Containing sheet meta-data.
 * @param {?string} emailToNotify An email address to send out notification
 *                                when creating a new spreadsheet. If none is
 *                                given, will use the email address of the
 *                                owner of the spreadsheet.
 *
 * @return {Sheet} Selected sheet.
 */
function getSheet(config, emailToNotify) {
  if (isEmptyString(config.sheetName)) {
    throw 'Config must include `sheetName` field. Please set to the name of ' +
          'sheet within the spreadsheet e.g. main';
  }

  var spreadsheet = getSpreadsheet(config, emailToNotify);
  var sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) {
    throw 'Spreadsheet is missing a sheet named: ' + config.sheetName +
          '. Please ensure the sheet exists in the spreadsheet';
  }

  return sheet;
}


/**
 * Retrieves cached sheet.
 *
 * @param {{sheet: Sheet,
 *          sheetName: string,
 *          templateId: string,
 *          targetName: string}} config An object to retrieve cached sheet from.
 * @param {?string} emailToNotify An email address to send out notification
 *                                when creating a new spreadsheet. If none is
 *                                given, will use the email address of the
 *                                owner of the spreadsheet.
 *
 * @return {?Sheet} Selected sheet.
 */
function getCachedSheet(config, emailToNotify) {
  // If sheet already present.
  if (!isEmpty(config.sheet)) {
    return config.sheet;
  // Else, cache and return.
  } else {
    var sheet = getSheet(config, emailToNotify);
    config.sheet = sheet;
    return sheet;
  }
}


/**
 * Returns a boolean if the current user is able to edit the specified
 * spreadsheet.
 *
 * @param {Spreadsheet} spreadsheet The spreadsheet to detect edit permissions
 *                                  on.
 *
 * @return {boolean} Returns true if the current user can edit the spreadsheet
 *                   provided.
 */
function canEditSpreadsheet(spreadsheet) {
  // Validate the spreadsheet argument exists.
  if (isEmpty(spreadsheet)) {
    throw 'Argument provided to canEditSpreadsheet is not a valid spreadsheet';
  }
  // Return RANGE level protections.
  var protections = spreadsheet.getProtections(
        SpreadsheetApp.ProtectionType.RANGE);

  if (protections.length === 0) {
    // No protections at a spreadsheet level.
    return true;
  }
  for (var i = 0; i < protections.length; i++) {
    if (protections[i].canEdit()) {
      return true;
    }
  }
  // If no protections allow editing, not editable.
  return false;
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
 * @param {Function} func The function to wrap.
 *
 * @return {Function} The composed function. (for lack of better name.)
 */
function compose(func) {
  var prevArgs = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    var args = prevArgs.concat(newArgs);
    return func.apply(this, args);
  };
}


/**
 * Validate the structure of the spreadsheet.
 *
 * @param {{templateId: string,
 *          targetName: string,
 *          columns: Array<string>,
 *          firstContentRow: number,
 *          columnMappingSpecialCases: Object
 *        }} config Spreadsheet configuration. `templateId` and `targetName`
 *                  are used to find the spreadsheet. `columns` are the
 *                  expected columns in the spreadsheet. `firstContentRow` is
 *                  the first row index after the header row.
 *                  `columnsMappingSpecialCases` is a dictionary (string:
 *                  string) for headers that require special handling.
 *
 * @return {boolean} Whether the spreadsheet is valid.
 */
function validateSpreadsheet(config) {
  /**
   * Remove whitespaces, any non-numeric value, and lower case given header.
   *
   * @param {Object} specialCases A dictionary (string: string) for
   *                              headers that require special handling.
   * @param {string} header The header to parse.
   *
   * @return {string} A normalized header.
   */
  function _parseHeader(specialCases, header) {
    // Remove whitespaces, non-alphanumeric characters and lowercase
    // all letters.
    var parsed = header.replace(/ |\?|\W/g, '').toLowerCase();

    // Handle special cases.
    if (!isEmpty(specialCases)) {
      var specialCase = specialCases[parsed];
      if (!isEmptyString(specialCase)) {
        parsed = specialCase;
      }
    }

    return parsed;
  }

  /**
   * Verify that the existing headers are equal to expected headers.
   *
   * @param {Array<string>} headers Existing headers.
   * @param {Array<string>} expectedHeaders The expected headers.
   *
   * @return {{pass: boolean, mapping: Object}} The verification result.
   *         `pass` indicates whether the validation passed. `mapping`
   *         (string: string) contains meta-data on failed mapping.
   */
  function _checkHeaders(headers, expectedHeaders) {
    var pass = true;
    var failureMapping = {};

    // Create a copy of expectedHeaders so we could manipulate it.
    expectedHeaders = expectedHeaders.slice();

    // Go over every header.
    headers.forEach(function(header) {
      var expectedHeader = expectedHeaders.shift();
      if (header !== expectedHeader) {
        pass = false;
        failureMapping[expectedHeader] = header;
      }
    });

    return {
      pass: pass,
      mapping: failureMapping
    };
  }

  /**
   * Validate a spreadsheet's column headers.
   *
   * @param {{templateId: string,
   *          targetName: string,
   *          columns: Array<string>,
   *          firstContentRow: number,
   *          columnMappingSpecialCases: {'string': string}
   *        }} config Spreadsheet configuration.
   *
   * @return {{pass: boolean, mapping: Object}} The verification result.
   *         `pass` indicates whether the validation passed. `mapping`
   *         (string: string) contains meta-data on failed mapping.
   */
  function _verifyColumns(config) {
    var sheet = getCachedSheet(config);
    var header = sheet.getRange(config.firstContentRow - 1, 1, 1,
                                config.columns.length);
    var headerValues = header.getValues()[0];

    var passObj = _checkHeaders(config.columns.map(compose(_parseHeader,
                                config.columnMappingSpecialCases)),
                                headerValues.map(compose(_parseHeader,
                                config.columnMappingSpecialCases)));
    return passObj;
  }

  // Verify columns.
  var passMain = _verifyColumns(config);
  if (!passMain.pass) {
    Logger.log('\nColumns mapping (sheet:script):\n' +
               JSON.stringify(passMain.mapping, null, 2));
  }

  return passMain.pass;
}


/**
 * Retrieves an Ad object from a SpreadsheetRow object.
 *
 * @param {SpreadsheetRow} row
 * @param {string} type The type of ad. Options are either 'STA' or 'ETA'.
 *
 * @return {?Ad} Returns an Ad if found, or null if no ad is found.
 */
function getAdFromRow(row, type) {
  var ad = null;
  if (type === 'ETA') {
    try {
      ad = getAd([row.get('adGroupId'), row.get('etaId')]);
    } catch (err) {
      Logger.log('Failed to get ETA due to: ' + err);
    }
  }
  else if (type === 'STA') {
    try {
      ad = getAd([row.get('adGroupId'), row.get('staId')]);
    } catch (err) {
      Logger.log('Failed to get STA due to: ' + err);
    }
  }
  else {
    throw 'Incorrect Ad type.';
  }

  return ad;
}


/**
 * Retrieves an Ad object.
 *
 * @param {Array<number>} adIdAndAdgroupId An array consisting of an
 *                                AdGroup Id and Ad Id. AdGroup Id and Ad Id
 *                                is the unique key for identifying an Ad.
 *
 * @return {?Ad} Returns an Ad if found, or null if no ad is found.
 */
function getAd(adIdAndAdgroupId) {
  if (!adIdAndAdgroupId || adIdAndAdgroupId.length < 2 ||
      isEmptyString(adIdAndAdgroupId[0]) ||
      isEmptyString(adIdAndAdgroupId[1])) {
    throw '`adIdAndAdgroupId` must include two values: adGroup ID, and Ad ID';
  }

  var adSelector = AdWordsApp.ads()
                   .withIds([adIdAndAdgroupId]);

  var adIterator = adSelector.get();

  // There is at most 1 Ad.
  if (adIterator.hasNext()) {
    var currentAccount = AdWordsApp.currentAccount();
    return new Ad(null, null, adIterator.next(), currentAccount);
  } else {
    return null;
  }
}



/**
 * An object representation of a row in a spreadsheet.
 *
 * @constructor
 *
 * @param {Array<Object>} values The values in this row.
 * @param {Range} allRange A range where this row is part of.
 * @param {number} rowOffset The row offset for this row within `allRange`.
 * @param {Object} columnNamesToIndices A mapping between a columnName
 *                 and an index.
 */
function SpreadsheetRow(values, allRange, rowOffset, columnNamesToIndices) {
  if (isEmpty(values) || isEmpty(allRange) || isNaN(rowOffset) ||
      isEmpty(columnNamesToIndices)) {
    throw 'Unable to retrieve row in spreadsheet because of incorrect ' +
        'parameters passed to the "SpreadsheetRow" function.';
  }

  // Because of the hard dependency in 'errorMessage', validate whether it
  // exists.
  if (!columnNamesToIndices.hasOwnProperty('errorMessage') ||
      isEmpty(columnNamesToIndices.errorMessage)) {
    throw '`errorMessage` is a required attribute for `columnNamesToIndices` ' +
        'in order to be able to properly identify where to write error ' +
        'messages in a spreadsheet row';
  }

  // The Range of the row in sheet.
  this.range_ = allRange.offset(rowOffset, 0, 1, allRange.getLastColumn());

  // The index of the row in sheet.
  this.rowIndex_ = this.range_.getRowIndex();

  // Storing a reference to this object and it will be used as read-only.
  this.columnNamesToIndices_ = columnNamesToIndices;

  this.hasErrors_ = false;
  // The values of the row in sheet.
  this.values_ = values;

  // Start fresh by removing any existing errors in this particular row.
  this.markAsResolved();
  // Check for proper values.
  this.validateValues_();
}


/**
 * Validates values in this row, if any improper values are detected
 * then display appropriate error message in error column.
 *
 * @private
 */
SpreadsheetRow.prototype.validateValues_ = function() {
  var staStatusValue = this.get('staStatus');

  if (!isSupportedStatus(staStatusValue)) {
    this.markAsError('Unsuported STA status with value of \'' +
                     staStatusValue + '\'.');
  }

  var etaStatusValue = this.get('etaStatus');

  if (!isSupportedStatus(etaStatusValue)) {
    this.markAsError('Unsuported ETA status with value of \'' +
                     etaStatusValue + '\'.');
  }
};


/**
 * Retrieve the column index of a column name.
 *
 * @param {string} columnName The name of the column in the spreadsheet we want
 *                            to retrieve index for.
 *
 * @return {number} The index of columnName.
 * @private
 */
SpreadsheetRow.prototype.getColumnIndex_ = function(columnName) {
  if (!(columnName in this.columnNamesToIndices_)) {
    throw 'Column "' + columnName + '" does not exist.';
  } else {
    return this.columnNamesToIndices_[columnName];
  }
};


/**
 * Sets the value of a given column for this row.
 *
 * @param {string} columnName
 * @param {string} value
 *
 */
SpreadsheetRow.prototype.set = function(columnName, value) {
  var columnIndex = this.getColumnIndex_(columnName);

  // Add 1, because SpreadSheetApp's Range is relative to 1.
  this.range_.getCell(1, columnIndex + 1).setValue(value);
  this.values_[columnIndex] = value;
};


/**
 * Gets the value at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {number|boolean|Date|string} The value stored at given column.
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
 * Gets the number value at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {number} The number value stored at given column.
 * @throws {string}
 */
SpreadsheetRow.prototype.getNumber = function(columnName) {
  var value = this.get(columnName);

  if (isNaN(value)) {
    throw 'Value stored in "' + columnName + '" is not a valid number.';
  }

  return Number(value);
};


/**
 * Gets the string value at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {string} The string value stored at given column.
 */
SpreadsheetRow.prototype.getString = function(columnName) {
  var value = this.get(columnName);

  return value.toString();
};


/**
 * Retrieve the cell at a given column for this row.
 *
 * @param {string} columnName
 *
 * @return {Range}
 */
SpreadsheetRow.prototype.getCell = function(columnName) {
  var columnIndex = this.getColumnIndex_(columnName);
  return this.range_.getCell(1, columnIndex + 1);
};


/**
 * Returns true if row has been marked with an error.
 *
 * @return {boolean}
 */
SpreadsheetRow.prototype.hasErrors = function() {
  return this.hasErrors_;
};


/**
 * Highlights row signalling that an error has occured.
 *
 * @param {string|Array<string>} messages Messages to print and add to error
 *                                      column. Can be a single string or an
 *                                      array of strings.
 */
SpreadsheetRow.prototype.markAsError = function(messages) {
  if (isEmpty(messages) || isEmptyString(messages)) {
    throw 'Empty `messages` parameter provided. A non-empty message must be ' +
        'provided.';
  }

  this.range_.setBackground('red');

  if (Array.isArray(messages)) {
    messages = messages.join('\n- ');
  }

  messages = '- ' + messages + '\n';

  // Append to any content already present in `errorMessage` column.
  this.set('errorMessage', this.get('errorMessage') + messages);
  print(messages);
  this.hasErrors_ = true;
};


/**
 * Removes any previous highlights set on this row.
 */
SpreadsheetRow.prototype.markAsResolved = function() {
  this.range_.setBackground(null);
  this.set('errorMessage', '');
};


/**
 * Retrieve the index of this row in spreadsheet.
 *
 * @return {number}
 */
SpreadsheetRow.prototype.getRowIndex = function() {
  return this.rowIndex_;
};


/**
 * Determines whether the `status` parameter is equivalant to one of the
 * supported Ad statuses.
 *
 * @param {string} status
 *
 * @return {boolean}
 */
function isSupportedStatus(status) {
  return (status === Ad.statuses.ENABLED ||
      status === Ad.statuses.PAUSED);
}


/**
 * Makes an array of objects indexable by a certain attribute in it's objects.
 *
 * @param {Array<Object>} objects An array of objects from which index
 *                                keys will be retrieved from.
 * @param {Array<string>} keys The keys to set index as. If more than one
 *                             element, then keys will get concatenated.
 *
 * @return {Object}
 */
function createIndexableObjectFromKeys(objects, keys) {
  if (isEmpty(objects)) {
    return {};
  }

  var indexableObject = {};

  objects.forEach(function(object) {
    var newIndexArray = [];
    keys.forEach(function(key) {
      var indexValue = object[key];
      if (!isEmptyString(indexValue)) {
        newIndexArray.push(indexValue);
      }
    });

    if (newIndexArray.length > 0) {
      var newIndexString = newIndexArray.join('|');
      if (!isEmptyString(newIndexString)) {
        indexableObject[newIndexString] = object;
      }
    }
  });

  return indexableObject;
}


/**
 * Retrieves the last row checked when syncing spreadsheet and increments
 * value by 1.
 *
 * @param {Sheet} sheet
 * @param {string} key
 *
 * @return {Object} An object with a reference to cell and integer representing
 *                   the index of last row checked.
 */
function getLastRowCheck(sheet, key) {

  var cell = sheet.getRange(key);
  var lastRowChecked = cell.getValue();

  if (isNaN(lastRowChecked)) {
    return {
      cell: null,
      value: 0
    };
  }

  cell.setValue(lastRowChecked + 1);

  return {
    cell: cell,
    value: lastRowChecked
  };
}


/**
 * Retrieves all non-empty rows, starting from config.startRowIndex.
 *
 * @param {Sheet} sheet A sheet in the spreadsheet.
 * @param {number} firstContentRow The index which content is expected to start.
 * @param {number} nonEmptyColumnCheck The column index to check and determine
 *                                  if row is considered empty.
 * @param {Object} columnNamesToIndices A mapping between column indices and
 *                 column names.
 * @param {boolean} isValidOnly If true, invalid rows will be filtered out.
 * @param {Array<SpreadsheetRow>} rowCache The row cache to use for the rows
 *                                         output. Only valid if it matches the
 *                                         target output size.
 *
 * @return {{rows: Array<SpreadsheetRow>,
 *           maxRows: number,
 *           newRowCache: Array<SpreadsheetRow> }} Object containing:
 *                     rows Containing the main content of the sheet.
 *                     maxRows The maximum number of row values possible in
 *                             the range.
 *                     newRowCache A sparse array of all rows added + cached
 *                                 rows during this execution of getContentRows.
 */
function getContentRows(sheet, firstContentRow, nonEmptyColumnCheck,
                        columnNamesToIndices, isValidOnly, rowCache) {
  // Make sure parameters are valid.
  if (isNaN(firstContentRow) ||
      firstContentRow <= 0 ||
      isEmptyString(nonEmptyColumnCheck) ||
      isEmptyString(columnNamesToIndices) ||
      (!isEmpty(rowCache) && !Array.isArray(rowCache))) {
    throw 'Unable to retrieve spreadsheet\'s content because of incorrect ' +
        'parameters passed to the "getContentRows" function.';
  }

  // Retrieve all the range at once to avoid checking each row separately.
  var endRowIndex = sheet.getLastRow();
  var lastColumnIndex = sheet.getLastColumn();

  if (firstContentRow > endRowIndex) {
    // Spreadsheet is empty.
    return {
      rows: []
    };
  }

  var range = sheet.getRange(firstContentRow, 1,
                             endRowIndex - firstContentRow + 1,
                             lastColumnIndex);
  var values = range.getValues();
  var maxRows = range.getNumRows();

  if (rowCache &&
      rowCache.length !== maxRows) {
    throw 'Parameter rowCache passed to "getContentRows" function ' +
        'is incorrect size: ' +
        'rowCache.length: ' + rowCache.length + '!== ' +
        'maxRows: ' + maxRows;
  }

  var spreadsheetRows = [];
  var nonEmptyIndexCheck = columnNamesToIndices[nonEmptyColumnCheck];

  if (isEmpty(nonEmptyIndexCheck)) {
    throw 'Please make sure to supply a value for `nonEmptyColumnCheck` that ' +
          'defines whether a row is considered to be empty or not.';
  }

  var newRowCache = [];
  newRowCache.length = maxRows;
  for (var rowOffset = 0; rowOffset < maxRows; rowOffset++) {
    // Check against the nonEmptyColumnIndex, to make sure
    // this row contains values.
    if (!isEmptyString(values[rowOffset][nonEmptyIndexCheck])) {
      var row = null;
      if (rowCache) {
        row = rowCache[rowOffset];
      }

      if (!row) {
        row = new SpreadsheetRow(values[rowOffset], range, rowOffset,
                                     columnNamesToIndices);
      }

      if (!row) {
        throw 'Spreadsheet row was not correctly created for rowOffset: ' +
            rowOffset;
      }

      // Cache row, even if it contains errors.
      newRowCache[rowOffset] = row;
      if (isValidOnly && row.hasErrors()) {
        continue;
      }

      spreadsheetRows.push(row);
    }
  }

  return {
    rows: spreadsheetRows,
    newRowCache: newRowCache,
    maxRows: maxRows
  };
}


/**
 * Send an email notification.
 *
 * @param {string} to The email address to send the notification to.
 * @param {number} event The event type.
 * @param {Object} payload The payload used in the email template.
 *
 * @return {boolean} Success/failure.
 */
function notify(to, event, payload) {
  var template = getEmailTemplate(event, payload);
  if (template) {
    // Strip down HTML elements for devices that don't render HTML.
    var body = template.body.replace(/<b>|<\/b>|<i>|<\/i>/g, '')
          .replace(/<br\/>/g, '\n');
    try {
      MailApp.sendEmail(to, template.subject, body, {
        htmlBody: template.body
      });

      // Successfully sent email notification.
      return true;
    } catch (err) {
      print('\n******* ERROR: Failed to send email to: ' + to + '. ' +
            err + '*******\n');
    }
  }

  // Failed to send email notification.
  return false;
}


/**
 * Get email template by event type.
 *
 * @param {number} event The event type.
 * @param {Object} payload The payload used in the template.
 *
 * @return {Object} An object with `subject` and `body` attributes,
 *                  or `null` if not found.
 */
function getEmailTemplate(event, payload) {
  var template = null;
  switch (event) {
    case SPREADSHEET_CREATED:
      template = {
        subject: '[ETA Transition Helper] installed successfully',
        body: 'Hello,<br/><br/>' +
              'The ETA Transition Helper was installed successfully on your ' +
              'account \'' + AdWordsApp.currentAccount().getName() +
              '\'.<br/><br/>' +
              'To view the exported standard text ads and begin creating ' +
              'expanded text ads open <a href=\'' + payload + '\'>this ' +
              'spreadsheet</a>.<br/><br/>' +
              'Yours,<br/>' +
              'ETA Transition Helper'
      };

      break;
  }

  return template;
}


/**
 * Copies an existing file.
 *
 * @param {string} sourceId The ID of the existing file.
 * @param {string} outputName The output file name.
 *
 * @return {?File} A handler on the new file, or null if failed.
 */
function copyFile(sourceId, outputName) {
  var output = null;
  try {
    var source = DriveApp.getFileById(sourceId);
    var destination = DriveApp.getRootFolder();
    // Create the copy in the root folder.
    output = source.makeCopy(outputName, destination);
    output.setDescription('[' + getUniqueFileTag(sourceId) + '] ' + outputName);
    print('- Created a new file: ' + output.getUrl());
  } catch (e) {
    print('\n******* ERROR: Failed to copy file: ' + e + '*******');
  }

  return output;
}


/**
 * Get the email address of the user who owns this file.
 *
 * @param {File|Spreadsheet} file Selected file.
 *
 * @return {?string} The email address or `null` if no owner found.
 */
function getFileOwnerEmail(file) {
  var owner = file && file.getOwner();
  return owner && owner.getEmail();
}

/**
 * Validate the CID for an account in the format 123-456-7890.
 *
 * @param {string} cid The CID string to validate.
 *
 * @return {number} Return the CID in numerical value i.e. 1234567890
 * @throws {string}
 */
function validateCid(cid) {
  if (!cid) {
    throw 'Invalid CID: Empty or null : ' + cid;
  }
  if (!isString(cid)) {
    throw 'Invalid CID: Is not a string : ' + cid;
  }
  var cidArray = cid.split('-');
  if (cidArray.length !== 3) {
    throw 'Invalid CID: Incorrect separators : ' + cid;
  }
  if (cidArray[0].length !== 3) {
    throw 'Invalid CID: Incorrect part 1 : ' + cid;
  }
  if (cidArray[1].length !== 3) {
    throw 'Invalid CID: Incorrect part 2 : ' + cid;
  }
  if (cidArray[2].length !== 4) {
    throw 'Invalid CID: Incorrect part 3 : ' + cid;
  }
  var cidInt = parseInt(cidArray.join(''), 10);
  if (isNaN(cidInt)) {
    throw 'Invalid CID: isNaN : ' + cid;
  }
  return cidInt;
}
