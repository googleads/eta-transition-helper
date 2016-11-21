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
////////////////////////////////// AD ////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

// Depends on the following global functions:
// - createLabel
// - isEmpty
// - isEmptyString
// - print



/**
 * Represents an Ad.
 *
 * @param {Object} row A report row from which to parse an Ad. This object
 *                     is expected to have properties included in `rowFields`.
 * @param {Array<string>} rowFields An array of fields to select from `row`.
 * @param {AdWordsApp.Ad} adWordsAppAd An Ad object.
 * @param {AdWordsApp.Account} account Current AW account.
 *
 * @constructor
 */
function Ad(row, rowFields, adWordsAppAd, account) {
  this.row = {
    accountId: account.getCustomerId(),
    accountName: account.getName()
  };

  // Stores AdWordsApp.Ad.
  this.ad = null;
  if (!isEmpty(adWordsAppAd)) {
    this.ad = adWordsAppAd;
  }

  if (!isEmpty(row) && !isEmpty(rowFields) && Array.isArray(rowFields)) {
    // Copy all selected fields.
    var self = this;
    rowFields.forEach(function(field) {
      // Lowercase the first character.
      var normalizedFieldName = field.charAt(0).toLowerCase() +
          field.substring(1, field.length);

      if (normalizedFieldName === 'status' ||
          normalizedFieldName === 'creativeApprovalStatus') {
        self.row[normalizedFieldName] = row[field].trim().toLowerCase();
      } else {
        self.row[normalizedFieldName] = row[field];
      }

      // Assign `id` to self, for efficient access.
      if (normalizedFieldName === 'id') {
        self.id = row[field];
      }
    });
  }
}


/**
 * Supported statuses.
 * @enum {string}
 */
Ad.statuses = {
  ENABLED: 'enabled',
  PAUSED: 'paused',
  DISABLED: 'disabled'
};


/**
 * Returns true if this instance has an AdWordsApp.Ad object.
 *
 * @return {boolean}
 */
Ad.prototype.hasAdWordsAppAd = function() {
  return (!isEmpty(this.ad));
};


/**
 * Returns an Ad's id.
 *
 * @return {number}
 * @throws {string}
 */
Ad.prototype.getId = function() {
  // If AdWordsApp.Ad object is present.
  if (this.hasAdWordsAppAd()) {
    return this.ad.getId();
  // Otherwise, dealing with Ad Report object.
  } else if (!isEmptyString(this.row.id)) {
    return this.row.id;
  } else {
    throw 'Invalid ad object.';
  }
};


/**
 * Returns an Ad's labels.
 *
 * @return {Array<string>} An array of label names.
 * @throws {string}
 */
Ad.prototype.getLabels = function() {
  var labelNames = [];

  // If AdWordsApp.Ad object is present.
  if (this.hasAdWordsAppAd()) {
    if (this.ad.getId() > 0) {
      var labelIterator = this.ad.labels().get();

      while (labelIterator.hasNext()) {
        var label = labelIterator.next();
        labelNames.push(label.getName());
      }
    }
  // Dealing with an Ad report.
  } else if (this.row['labels'] !== undefined &&
             typeof this.row.labels === 'string') {
    // If no labels are present.
    if (isEmpty(this.row.labels) || this.row.labels === '--') {
      return [];
    } else {
      try {
        labelNames = JSON.parse(this.row.labels);
      } catch (err) {
        throw 'Invalid JSON string stored in Ad.labels';
      }
    }
    // Dealing with an unknown object.
  } else {
    throw 'Invalid ad object';
  }

  return labelNames;
};


/**
 * Determines which labels to remove and which labels to add.
 *
 * @param {Array<string>} newLabelNames An array of new label names to apply.
 *
 * @return {{add: Array<string>,
 *           remove: Array<string>,
 *           hasDiff: boolean}} An object with new labels to apply under an
 *                              `add` attribute, labels to remove under a
 *                              `remove` attribute, and a `hasDiff` attribute
 *                              used to indicate if any differences were found.
 *
 * @private
 */
Ad.prototype.diffLabels_ = function(newLabelNames) {
  // `newLabelNames` must be an array.
  if (!Array.isArray(newLabelNames)) {
    throw 'Incorrect `newLabelNames` parameter.';
  }

  var diff = {
    add: [],
    remove: [],
    hasDiff: false
  };

  var currentLabelNames = this.getLabels();

  newLabelNames.forEach(function(newLabelName) {
    newLabelName = newLabelName.trim();
    // If new label is not present in current labels, append to `add`.
    if (currentLabelNames.indexOf(newLabelName) === -1) {
      diff.add.push(newLabelName);
      diff.hasDiff = true;
    }
    return;
  });

  currentLabelNames.forEach(function(currentLabelName) {
    currentLabelName = currentLabelName.trim();
    // If current label is not present in new labels, append to `remove`.
    if (newLabelNames.indexOf(currentLabelName) === -1) {
      diff.remove.push(currentLabelName);
      diff.hasDiff = true;
    }
    return;
  });

  return diff;
};


/**
 * Adds labels on Ad based on `labelNamesDiff` values.
 *
 * @param {Array<string>} newLabels Contains an array of label names to add.
 *
 * @return {boolean} Representing whether all labels were successfully applied.
 */
Ad.prototype.syncLabels = function(newLabels) {
  // If newLabels is empty, nothing to add.
  if (isEmpty(newLabels) || newLabels.length <= 0) {
    return true;
  }

  var allApplied = true;
  var labelNamesDiff = this.diffLabels_(newLabels);

  // If differences are present, make sure we have AdWordsApp.Ad object.
  if (labelNamesDiff.hasDiff && !this.hasAdWordsAppAd()) {
    var success = this.getAd();
    if (!success) {
      return false;
    }
  }

  var self = this;
  labelNamesDiff.add.forEach(function(labelName) {
    // Create label, if it doesn't exist.
    var success = createLabel(labelName);

    if (success) {
      try {
        if (self.ad.getId() > 0) {
          self.ad.applyLabel(labelName);
        }
      } catch (err) {
        print('Failed to apply ' + labelName + ' to Ad Id: ' + self.getId(),
            [err]);
        allApplied = false;
      }
    } else {
      print('Failed to create ' + labelName + ' and apply to Ad Id: ' +
            self.getId());
      allApplied = false;
    }
  });

  return allApplied;
};


/**
 * Returns status of Ad.
 *
 * @return {string}
 */
Ad.prototype.getStatus = function() {
  var adStatus = '';

  // If we have AdWordsApp.Ad object.
  if (this.hasAdWordsAppAd()) {
    if (this.ad.getId() > 0) {
      if (this.ad.isEnabled()) {
        adStatus = Ad.statuses.ENABLED;
      } else if (this.ad.isPaused()) {
        adStatus = Ad.statuses.PAUSED;
      }
    }
  // Otherwise, dealing with Ad Report object.
  } else if (!isEmptyString(this.row.status)) {
    adStatus = this.row.status;
  } else {
    throw 'Invalid ad object.';
  }

  return adStatus;
};


/**
 * Returns approval status of Ad.
 *
 * @return {?string}
 */
Ad.prototype.getApprovalStatus = function() {
  var approvalStatus = null;

  // If dealing with an AdWordsApp.Ad object.
  if (this.hasAdWordsAppAd()) {
    if (this.ad.getId() > 0) {
      approvalStatus = this.ad.getApprovalStatus();
    }
  // Otherwise, dealing with Ad Report object.
  } else {
    approvalStatus = this.row.creativeApprovalStatus;
  }

  if (isEmptyString(approvalStatus)) {
    return null;
  }

  return approvalStatus.trim().toLowerCase();
};


/**
 * Syncs the status of an Ad in spreadsheet with AdWordsApp.Ad.
 *
 * @param {Ad.statuses} status Possible choices are `enabled`, `paused`, and
 *                             `disabled`.
 *
 * @return {boolean} A boolean indicating if operation was successfull.
 */
Ad.prototype.syncStatus = function(status) {
  if (isEmptyString(status)) {
    throw 'Incorrect status parameter.';
  }

  var normalizedStatus = status.trim().toLowerCase();

  // If status does not differ, no changes need to be made.
  if (this.getStatus() === normalizedStatus) {
    return true;
  // Otherwise, change will have to be made, therefore
  // make sure AdWordsApp.Ad is present.
  } else if (!this.hasAdWordsAppAd()) {
    var success = this.getAd();
    if (!success) {
      return false;
    }
  }

  try {
    if (this.ad.getId() < 0) {
      // Negative ad ID indicate running in preview mode.
      return true;
    }

    switch (normalizedStatus) {
      case Ad.statuses.ENABLED:
        this.ad.enable();
        return true;
      case Ad.statuses.PAUSED:
        this.ad.pause();
        return true;
      // For no value, set to pause.
      case '':
        this.ad.pause();
        return true;
      default:
        return false;
    }
  } catch (err) {
    return false;
  }
};


/**
 * Retrieves and sets an Ad object to this instance.
 *
 * @return {boolean} Whether the ad was found or not.
 */
Ad.prototype.getAd = function() {
  if (isEmptyString(this.row.adGroupId) || isEmptyString(this.row.id)) {
    throw 'Invalid Ad instance.';
  }

  var adIdAndAdgroupId = [[this.row.adGroupId, this.row.id]];

  var adSelector = AdWordsApp.ads()
                   .withIds(adIdAndAdgroupId);

  var adIterator = adSelector.get();

  // There is at most 1 Ad.
  if (adIterator.hasNext()) {
    this.ad = adIterator.next();
    return true;
  } else {
    return false;
  }
};


/**
 * Export ad to selected Google sheet.
 *
 * @param {Sheet} sheet Output sheet.
 * @param {{columns: Array<string>,
 *          reportFieldMap: Object,
 *          columnNamesToIndices: Object,
 *          nonEmptyColumnCheck: string
 *        }} sheetConfig Configuration for selected sheet.
 */
Ad.prototype.export = function(sheet, sheetConfig) {
  if (isEmpty(sheetConfig) ||
      isEmpty(sheetConfig.columns) ||
      isEmpty(sheetConfig.reportFieldMap) ||
      isEmpty(sheetConfig.columnNamesToIndices) ||
      isEmpty(sheetConfig.nonEmptyColumnCheck)) {
    throw 'Failed exporting ad ' + this.id + '. Must provide valid sheet ' +
          'configuration when exporting an Ad to a spreadsheet';
  }

  var fields = [];
  var self = this;

  // Check if exporting to the first content row in the spreadsheet.
  var lastRow = sheet.getLastRow();
  var colIndex =
      sheetConfig.columnNamesToIndices[sheetConfig.nonEmptyColumnCheck] + 1;

  var isFirstRow = (lastRow === sheetConfig.firstContentRow) &&
      isEmptyString(sheet.getRange(lastRow, colIndex).getValue());

  // Parse all columns.
  sheetConfig.columns.forEach(function(key) {
    var field;
    // Detect whether this field is a formula and copy the formula from
    // previous cell if necessary.
    if (!isFirstRow && !isEmpty(sheetConfig.columnsWithFormulas) &&
        sheetConfig.columnsWithFormulas.indexOf(key) !== -1) {
      // Copy formula.
      var formulaIndex = sheetConfig.columns.indexOf(key);
      if (formulaIndex !== -1) {
        // Add 1 to index because spreadsheet begins at index 1.
        var formulaPreviousCell = sheet.getRange(lastRow, formulaIndex + 1);

        // Return the formula from one cell above this row.
        field = formulaPreviousCell.getFormulaR1C1();
      }
    }

    if (isEmptyString(field)) {
    // Parse field by column name.
     field = self.parseField_(key, sheetConfig);
    }

    // Stage field.
    fields.push(field);
  });

  if (isFirstRow) {
    // Because we're "freezing" rows, we can't delete all other non-frozen
    // rows and so we're left with one empty row. Instead of adding a new
    // row, replace the values in the cells.
    var prevSectionIndex = 1;
    var values = [];

    // Copy fields in batches.
    fields.forEach(function(field) {
      if (!isEmptyString(field)) {
        // Batch fields together to avoid making many I/O operations.
        values.push(field);
      } else if (values.length > 0) {
        // Flush fields.
        var row = sheet.getRange(lastRow, prevSectionIndex, 1, values.length);
        row.setValues([values]);

        // Update section start index.
        prevSectionIndex += values.length + 1;

        // Reset batch.
        values = [];
      } else {
        // Skip empty field.
        prevSectionIndex++;
      }
    });
  } else {
    // Add a new row and copy all fields.
    sheet.insertRowAfter(lastRow);
    lastRow++;

    // Flush fields.
    var row = sheet.getRange(lastRow, 1, 1, fields.length);
    row.setValues([fields]);
  }
};

/**
 * Parse a field based on a column key.
 *
 * @param {string} key Column key.
 * @param {{reportFieldMap: Array<dict>,
 *          defaultStatus: string
 *          }} sheetConfig A configuration object that contains a mapping from
 *                         spreadsheet column names to report columns names,
 *                         and a default value for `etaStatus`.
 *
 * @return {string} A field based on the column key.
 *
 * @private
 */
Ad.prototype.parseField_ = function(key, sheetConfig) {
  var proxyKey = sheetConfig.reportFieldMap[key];
  if (proxyKey === undefined) {
    throw 'Failed exporting ad ' + this.id +
          '. Missing report field mapping for: ' + key + '.';
  }

  // Get the field value using the key from the spreadhseet-column name.
  var field = this.row[proxyKey];

  // Handle specific columns differently.
  switch (key) {
    case 'description':
      // Concatenate description 1 and description 2
      // in case description field is blank.
      if (isEmptyString(field)) {
        field = this.row.description1 +
                (isEmptyString(this.row.description2) ? '' :
                 '\n' + this.row.description2);
      }

      break;

    case 'headline1':
      // If headline part 1 is blank, use headline instead.
      if (isEmptyString(field)) {
        field = this.row.headline;
      }

      break;

    case 'etaStatus':
      if (isEmptyString(field)) {
        field = sheetConfig.defaultStatus;
      }

      break;

    case 'finalUrl':
    case 'mobileFinalUrl':
      // Support only single value for Final URL and
      // Mobile Final URL.
      try {
        field = JSON.parse(field);
      } catch (ignore) {
        // Value is most likely already a string, use it
        // directly. For example "--".
      }

      field = getFirstElementInArray(field);
      break;
  }

  if (isEmptyString(field) || field === '--') {
    // Replace all undefined fields because Range.setValues won't play well
    // with them.
    // Replace all '--' with empty strings to avoid exporting empty values
    // formatted like that.
    field = '';
  }

  return field;
};
