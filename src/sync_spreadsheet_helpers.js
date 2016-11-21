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
/////////////////////// SYNC SPREADSHEET HELPERS /////////////////////////
//////////////////////////////////////////////////////////////////////////


/**
 * Combines an array of Ads with their respective rows in the spreadsheet.
 *
 * @param {Array<string>} customerIds An array of customerIds to filter
 *                                    resulting Ads. Use empty array to not
 *                                    filter any Ads.
 *
 * @return {Array<Object>} Returns an array of objects, in which each object
 *                         has a reference to a given row in the spreadsheet,
 *                         and its respective report.
 */
function getReportWithSpreadsheetRows(customerIds) {
  if (!Array.isArray(customerIds)) {
    throw "customerIds is not a valid array";
  }

  // Open spreadsheet.
  var sheet = getCachedSheet(CONFIG.spreadsheet, CONFIG.email);

  var rowObject = getContentRows(sheet,
                                  CONFIG.spreadsheet.firstContentRow,
                                  CONFIG.spreadsheet.nonEmptyColumnCheck,
                                  CONFIG.spreadsheet.columnNamesToIndices,
                                  true,
                                  CONFIG.spreadsheet.rowCache);
  var nonEmptyValidRows = rowObject.rows;
  CONFIG.spreadsheet.rowCache = rowObject.newRowCache;

  // Get rows containing content.
  var report = AdWordsApp.report(
      'SELECT ' + CONFIG.reportFields.join(',') + ' ' +
      'FROM     AD_PERFORMANCE_REPORT ' +
      'WHERE    AdType = "TEXT_AD" ' +
      '         AND Status = "ENABLED" ' +
      '         AND CreativeApprovalStatus != "DISAPPROVED" ' +
      'DURING   ' + CONFIG.duration, {
        apiVersion: CONFIG.apiVersion
      });

  var mostPerformingAds = getMostPerformingAds(report, CONFIG);
  var performingETA = getETAReports(CONFIG);

  // Swith Ads to a [id]=>Ad object structure.
  mostPerformingAds = createIndexableObjectFromKeys(mostPerformingAds, ['id']);
  performingETA = createIndexableObjectFromKeys(performingETA, ['id']);

  var rowsAndAds = [];

  nonEmptyValidRows.forEach(function(row) {
   // Skip if this row does not belong to any of the customerIds passed.
    if (customerIds.length > 0 &&
        customerIds.indexOf(row.get('customerId')) === -1) {
      return;
    }

    var sta = mostPerformingAds[row.get('staId')];
    var eta = performingETA[row.get('etaId')];

    if (!sta) {
      sta = null;
    }

    if (!eta) {
      eta = null;
    }

    rowsAndAds.push({
      row: row,
      sta: sta,
      eta: eta
    });
  });

  return rowsAndAds;
}


/**
 * Splices `spreadsheetRowsAndReport` according to `lastRowCheckedIndex`
 *
 * @param {Array<Object>} spreadsheetRowsAndReport
 * @param {number} lastRowCheckedIndex The index of last row processed in
 *                                     previous run.
 * @param {number} headerIndex The index of the row containing header.
 */
function spliceFromLastRowChecked(spreadsheetRowsAndReport, lastRowCheckedIndex,
                                  headerIndex) {
  if (isNaN(lastRowCheckedIndex)) {
    lastRowCheckedIndex = 0;
  }
  // Get Index stored in lastRowCheckedCell relative to header.
  lastRowCheckedIndex = lastRowCheckedIndex - headerIndex;

  // If lastRowCheckedIndex is between 0 and number of rows in spreadsheet
  // (not inclusive) then we can ignore all rows up to lastRowCheckedIndex.
  if (lastRowCheckedIndex > 0 &&
      lastRowCheckedIndex < spreadsheetRowsAndReport.length) {
    spreadsheetRowsAndReport.splice(0, lastRowCheckedIndex);
  }
}


/**
 * Determines whether 'etaObj' has the necessary fields and values
 * set for ETA creation.
 *
 * @param {Object} etaObj An ETA object with relevant ETA attributes for ETA
 *                        creation.
 *
 * @return {Object} An Ad object with 'ad' and 'errors' attributes. If no errors
 *                  were encountered then 'ad' will contain an Ad object of
 *                  newly created Ad, and 'errors' will be an empty array.
 *                  Otherwise, if an error was encountered then 'error' will be
 *                  an array of strings and 'ad' will be null.
 */
function isValidForETACreation(etaObj) {
  var returnObject = {
    ad: null,
    errors: []
  };

  /**
   * REQUIRED:
   * - finalURL
   * - headline1
   * - headline2
   * - description
   */

  if (!etaObj.finalURLs || etaObj.finalURLs.length < 1) {
    returnObject.errors.push('Failed to create ETA: finalUrl is missing.' +
                             ' [Required]');
  }

  if (etaObj.finalURLs && etaObj.finalURLs.length > 1) {
    returnObject.errors.push('Failed to create ETA: finalUrl supports only a' +
                             ' single URL');
  }

  if (!etaObj.headline1) {
    returnObject.errors.push('Failed to create ETA: headline1 is missing.' +
                             ' [Required]');
  }

  if (!etaObj.headline2) {
    returnObject.errors.push('Failed to create ETA: headline2 is missing.' +
                             ' [Required]');
  }

  if (!etaObj.description) {
    returnObject.errors.push('Failed to create ETA: description is missing.' +
                             ' [Required]');
  }

  /**
  * OPTIONAL:
  * - path1
  *   - path2 (Only if path1)
  * - mobileFinalURL
  * - trackingTemplate
  * - customParameters
  */

  if (etaObj.path2 && !etaObj.path1) {
    returnObject.errors.push('Failed to create ETA: path1 is missing. Setting' +
                             ' path2 requires path1 to be set');
  }

  if (etaObj.mobileFinalURLs && etaObj.mobileFinalURLs.length > 1) {
    returnObject.errors.push('Failed to create ETA: mobileFinalURL supports' +
                             ' only a single URL');
  }

  if (!isValidParamsObject(etaObj.customParameters,
                           ['string'],
                           false).success) {
    returnObject.errors.push('Failed to create ETA: customParameters is not' +
                             ' a valid parameters object');
  }

  return returnObject;
}


/**
 * Parses a `spreadsheetRow` for appropriate ETA attributes.
 *
 * @param {SpreadSheetRow} spreadsheetRow A row in the spreadsheet.
 *
 * @return {Object} Returns an object containing the necessary fields
 *                  for creating an ETA.
 * @throws {string}
 */
function parseETA(spreadsheetRow) {

  var customParametersStr = spreadsheetRow.getString('customParameters');
  var customParameters = null;
  if (customParametersStr) {
    try {
      customParameters = JSON.parse(customParametersStr);
    }
    catch (err) {
      throw 'Invalid customParemeters value in spreadsheet.';
    }
  }


  return {
    campaignId: spreadsheetRow.getNumber('campaignId'),
    adGroupId: spreadsheetRow.getNumber('adGroupId'),
    finalURLs: spreadsheetRow.getArray('finalUrl'),
    headline1: spreadsheetRow.getString('headline1'),
    headline2: spreadsheetRow.getString('headline2'),
    description: spreadsheetRow.getString('description'),
    path1: spreadsheetRow.getString('path1'),
    path2: spreadsheetRow.getString('path2'),
    mobileFinalURLs: spreadsheetRow.getArray('mobileFinalUrl'),
    trackingTemplate: spreadsheetRow.getString('trackingTemplate'),
    customParameters: customParameters
  };
}


/**
 * Creates a new ETA.
 *
 * @param {SpreadSheetRow} spreadsheetRow A row in the spreadsheet.
 *
 * @return {Object} An Ad object with 'ad' and 'errors' attributes. If no errors
 *                  were encountered then 'ad' will contain an Ad object of
 *                  newly created Ad, and 'errors' will be an empty array.
 *                  Otherwise, if an error was encountered then 'error' will be
 *                  an array of strings and 'ad' will be null.
 */
function createETA(spreadsheetRow) {
  var etaObj;
  // Retrieve ETA fields from spreadsheet row.
  try {
    etaObj = parseETA(spreadsheetRow);
  }
  catch (err) {
    return {
      ad: null,
      errors: ['Failed to create ETA: ' + err.message]
    };
  }

  var returnObject = isValidForETACreation(etaObj);

  // Retrieve parent Campaign to check if campaign exists.
  var campaignIterator = AdWordsApp.campaigns()
      .withIds([etaObj.campaignId])
      .get();

  if (!campaignIterator.hasNext()) {
    returnObject.errors.push('Unable to create ETA because Campaign parent' +
                             ' with id ' + etaObj.campaignId + ' no longer' +
                             ' exists.');
  }

  // Retrieve parent AdGroup to add new Ad and check if AdGroup exists.
  var adGroupIterator = AdWordsApp.adGroups()
      .withIds([etaObj.adGroupId])
      .get();

  if (!adGroupIterator.hasNext()) {
    returnObject.errors.push('Unable to create ETA because AdGroup parent' +
                             ' with id ' + etaObj.adGroupId + ' no longer' +
                             ' exists.');
  }

  var adGroup = adGroupIterator.next();

  if (returnObject.errors.length === 0) {
    try {
      var adBuilder = adGroup.newAd().expandedTextAdBuilder()
          .withHeadlinePart1(etaObj.headline1)
          .withHeadlinePart2(etaObj.headline2)
          .withDescription(etaObj.description)
          .withFinalUrl(etaObj.finalURLs[0]);

      if (etaObj.path1) {
        adBuilder.withPath1(etaObj.path1);
        if (etaObj.path2) {
          adBuilder.withPath2(etaObj.path2);
        }
      }

      if (etaObj.mobileFinalURLs && etaObj.mobileFinalURLs[0]) {
        adBuilder.withMobileFinalUrl(etaObj.mobileFinalURLs[0]);
      }

      if (etaObj.trackingTemplate) {
        adBuilder.withTrackingTemplate(etaObj.trackingTemplate);
      }

      if (etaObj.customParameters) {
        adBuilder.withCustomParameters(etaObj.customParameters);
      }

      var result = adBuilder.build();
      if (!result.isSuccessful()) {
        // No ad was created.
        var errors = result.getErrors();

        var message = 'Failed to create ETA with errors:';
        for (var i = 0; i < errors.length; i++) {
          message += '\n' + errors[i];
        }

        returnObject.errors.push(message);
      } else {
        var currentAccount = AdWordsApp.currentAccount();
        returnObject.ad = new Ad(null, null, result.getResult(),
                                 currentAccount);
      }
    }
    catch (err) {
      var message = 'Failed to create ETA: ' + err.message;
      returnObject.errors.push(message);
    }
  }

  return returnObject;
}


/**
 * Creates a label if it doesn't exist.
 *
 * @param {string} labelName The name of the label to create.
 *
 * @return {boolean} True if label was successfully created, or already exist.
 */
function createLabel(labelName) {
  if (isEmptyString(labelName)) {
    return false;
  }

  var trimmedLabelName = labelName.trim();

  // There can only be one label with `labelName`.
  var labelIterator = AdWordsApp.labels()
      .withCondition('Name = "' + trimmedLabelName + '"')
      .get();

  // If labelIterator has no value, then create label.
  if (!labelIterator.hasNext()) {
    try {
      AdWordsApp.createLabel(trimmedLabelName);
      return true;
    } catch (err) {
      print('Failed to create ' + trimmedLabelName);
      return false;
    }
  }

  // Label exist, no need to create it.
  return true;
}



/**
 * Used for tracking changes to an Ad.
 *
 * @param {?number} adId An id of an Ad.
 * @param {?number} adGroupId An id of an AdGroup.
 *
 * @constructor
 */
function AdChange(adId, adGroupId) {
  this.structure = {
    adId: null,
    adGroupId: null
  };

  this.structure.adId = null;
  this.structure.adGroupId = null;

  if (!isEmpty(adId) && !isEmpty(adGroupId)) {
    this.structure.adId = adId;
    this.structure.adGroupId = adGroupId;
  }

  this.structure.changes = [];
}


/**
 * Append an object representing change, if changeFunction returns a truthful
 * value. This serves as a wrapper to all Ad change events such as changing
 * status, labels, etc.
 *
 * @param {string} fieldName The name field being changed.
 * @param {string} oldValue
 * @param {string} newValue
 */
AdChange.prototype.trackChange = function(fieldName, oldValue, newValue) {
  if (oldValue === newValue || isArrayShallowEquals(oldValue, newValue)) {
    return;
  }

  this.structure.changes.push({
    fieldName: fieldName,
    oldValue: oldValue,
    newValue: newValue
  });
};


/**
 * This serves as a wrapper for Ad create changes.
 *
 * @param {number} adId Id of newly created Ad.
 * @param {number} adGroupId Id of AdGroup parent of newly created Ad.
 */
AdChange.prototype.trackCreate = function(adId, adGroupId) {
  this.structure.created = true;
  this.structure.adId = adId;
  this.structure.adGroupId = adGroupId;
};


/**
 * Retrieves a reference to changes. Changes are represented by the internal
 * `structure` property.
 *
 * @return {Object}
 */
AdChange.prototype.getChangeStruct = function() {
  return this.structure;
};

/**
 * Reset all changes that were tracked.
 */
AdChange.prototype.resetChanges = function() {
  this.structure.changes = [];
  this.structure.created = false;
};
