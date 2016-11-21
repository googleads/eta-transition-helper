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
///////////////////////////////// MAIN ///////////////////////////////////
//////////////////////////////////////////////////////////////////////////

// Declaration required for non-MCC accounts.
var MccApp = MccApp || undefined;

/**
 * Main application entry.
 *
 * This will run first.
 */
function main() {
  initConfig();

  if (!validateSpreadsheet(CONFIG.spreadsheet)) {
    Logger.log('Terminating execution due to malformed spreadsheet format.');
    return;
  }

  var errorCount;
  if (MccApp) {
    print('Exporting STAs from MCC');
    printExportResults(exportSTAMCC());

    print('Processing spreadsheet');
    errorCount = syncSpreadsheetMCC();
    print('Processing complete');
  } else {
    print('Exporting STAs from account');
    printExportResults(exportSTA(CONFIG.numOfAds));

    print('Processing spreadsheet');
    errorCount = syncSpreadsheet();
    print('Processing complete');
  }

  if (errorCount > 0) {
    throw 'Script runtime error. An error occured, please check the logs.';
  }
}


/**
 * Initializes dynamic properties of CONFIG.
 */
function initConfig() {
  var sheet = getCachedSheet(CONFIG.spreadsheet, CONFIG.email);
  var spreadsheet = sheet.getParent();
  if (!canEditSpreadsheet(spreadsheet)) {
    throw 'User account does not have permission to edit the spreadsheet. ' +
          'Please ensure the permission is set to `Can Edit` instead of ' +
          '`Can Comment` or `Can View`.';
  }

  if (!sheet) {
    throw 'Could not find a sheet named "' + CONFIG.spreadsheet.sheetName +
        '" in the spreadsheet. Please fix your spreadsheet.';
  }

  CONFIG.spreadsheet.sheet = sheet;

  CONFIG.spreadsheet.columns.forEach(function(columnName, index) {
    CONFIG.spreadsheet.columnNamesToIndices[columnName] = index;
  });

  // Set default email address to the spreadsheet's owner email address.
  if (isEmptyString(CONFIG.email)) {
    CONFIG.email = getFileOwnerEmail(spreadsheet);
  }

  // Notify which email address is used.
  print('* This script will send notifications to: ' + CONFIG.email);
}

/**
 * Checks the number of accounts to process and warns the user if the number
 * is above the recommended threshold.
 *
 * @param {ManagedAccountIterator} accountIterator The account iterator of the
 *   accounts that will be used.
 */
function processAccountLimit(accountIterator) {
  var accountsToProcess = accountIterator.totalNumEntities();
  print('Accounts to process: ' + accountsToProcess);
  if (accountsToProcess > CONFIG.numOfAccounts) {
    print('WARNING: Number of accounts is above the recommended threshold: ' +
        CONFIG.numOfAccounts);
    print('Please use "selectByAccountIds" or "selectBySubMccId" to select');
    print('which accounts to use from the CONFIG');
  }
}

/**
 * Get the accountIterator from the MCC using the selectors specified in the
 * config.
 *
 * @return {ManagedAccountIterator} The iterator for the selected accounts.
 * @throws {string}
 */
function getAccountIteratorFromMCC() {
  var selectBySubMccId = CONFIG.selectBySubMccId || null;
  var selectByAccountIds = CONFIG.selectByAccountIds || null;

  // Build account iterator.
  var accIterBuild = MccApp.accounts();

  // Restrict to sub-mcc.
  if (selectBySubMccId) {
    if (!isString(selectBySubMccId)) {
      throw 'selectBySubMccId: is not a string';
    }
    accIterBuild = accIterBuild.withCondition("ManagerCustomerId = '" +
        validateCid(selectBySubMccId) + "'");
  }

  // Restrict to list of account IDs.
  if (selectByAccountIds) {
    if (!Array.isArray(selectByAccountIds)) {
      throw 'selectByAccountIds: is not an Array';
    }
    for (var i = 0; i < selectByAccountIds.length; i++) {
      validateCid(selectByAccountIds[i]);
    }
    accIterBuild = accIterBuild.withIds(selectByAccountIds);
  }

  return accIterBuild.get();
}

/**
 * From the Ad Performance Report, copy all enabled and
 * not disapproved Text Ads to the configured spreadsheet.
 *
 * This function operates only for MCC accounts.
 *
 * The function will iterate over each client sub-account exporting in turn.
 * @return {{exportedCount: number,
 *           remainingRowCount: number,
 *           accountsProcessed: number}}
 *           An object containing statistics from the STA export.
 *             exportedCount     The number of exported Ads during exportSTA.
 *             remainingRowCount The number of remaining rows available in the
 *                               spreadsheet.
 *             accountsProcessed The number of accounts processed in the export.
 */
function exportSTAMCC() {
  // Store the current MCC account.
  var mccAccount = AdWordsApp.currentAccount();

  // Count the number of available STAs to export.
  var maxAdsToExport = CONFIG.numOfAds;

  var resultObject = {
    exportedCount: 0,
    remainingRowCount: maxAdsToExport,
    accountsProcessed: 0
  };

  // Get account iterator from MCC config.
  var accountIterator;
  try {
    accountIterator = getAccountIteratorFromMCC();
  }
  catch (err) {
    print(err);
    return resultObject;
  }
  if (accountIterator) {
    processAccountLimit(accountIterator);
    while (accountIterator.hasNext()) {
      var account = accountIterator.next();

      // Set the account as the client account as the active account.
      MccApp.select(account);
      print('Account: ' + account.getName() +
                 ' (' + account.getCustomerId() + ')');

      // Execute the export.
      var exportResult = exportSTA(maxAdsToExport);

      resultObject.exportedCount += exportResult.exportedCount;
      resultObject.remainingRowCount = exportResult.remainingRowCount;
      resultObject.accountsProcessed++;

      if (resultObject.remainingRowCount <= 0) {
        print('Maximum number of Ads reached, skipping export');
        break;
      }
    }
  }

  MccApp.select(mccAccount);

  return resultObject;
}


/**
 * From the Ad Performance Report, copy all enabled and
 * not disapproved Text Ads to the configured spreadsheet.
 *
 * @param {number} maxAdsToExport The maximum number of ads to export.
 *
 * @return {{exportedCount: number,
 *           remainingRowCount: number}}
 *           An object containing statistics from the STA export.
 *             exportedCount     The number of exported Ads during exportSTA.
 *             remainingRowCount The number of remaining rows available in the
 *                               spreadsheet.
 */
function exportSTA(maxAdsToExport) {
  if (isEmpty(maxAdsToExport) || isNaN(maxAdsToExport)) {
    throw 'Failed to export STAs to the spreadsheet. Please specify a ' +
          'valid integer number in CONFIG.numOfAds.';
  }

  // Download Ad Performance Report.
  // Get the top most performing ads.
  var report = AdWordsApp.report(
      'SELECT ' + CONFIG.reportFields.join(',') + ' ' +
      'FROM     AD_PERFORMANCE_REPORT ' +
      'WHERE    AdType = "TEXT_AD" ' +
      '         AND AdGroupStatus = "ENABLED" ' +
      '         AND CampaignStatus = "ENABLED" ' +
      '         AND Status = "ENABLED" ' +
      '         AND CreativeApprovalStatus != "DISAPPROVED" ' +
      'DURING   ' + CONFIG.duration, {
        apiVersion: CONFIG.apiVersion
      });

  var resultObject = {
    exportedCount: 0,
    remainingRowCount: maxAdsToExport,
    accountsProcessed: 1
  };

  var mostPerformingAds = getMostPerformingAds(report, CONFIG);
  if (mostPerformingAds !== null) {
    // Open spreadsheet.
    var sheet = getCachedSheet(CONFIG.spreadsheet, CONFIG.email);

    var rowObject = getContentRows(sheet,
                                    CONFIG.spreadsheet.firstContentRow,
                                    CONFIG.spreadsheet.nonEmptyColumnCheck,
                                    CONFIG.spreadsheet.columnNamesToIndices,
                                    false);
    var nonEmptyRows = rowObject.rows;

    // If sheet is not empty, only export ads not present in sheet.
    if (nonEmptyRows.length > 0) {
      // Switch `mostPerformingAds` to an id=>Ad object structure.
      var mostPerformingAdsObject =
          createIndexableObjectFromKeys(mostPerformingAds, ['id']);

      // For any ad present in the spreadsheet, set value to null.
      nonEmptyRows.forEach(function(row) {
        var staId = row.getNumber('staId');
        if (staId in mostPerformingAdsObject) {
          mostPerformingAdsObject[staId] = null;
        }

        // Subtract the number of empty ETAs from the total ads available
        // to export. This will preserve a bounded number of ETAs in the
        // spreadsheet.
        var etaId = row.getString('etaId');
        if (isEmptyString(etaId)) {
          maxAdsToExport--;
          resultObject.remainingRowCount--;
        }
      });

      // Keep ads that are not null (not present in spreadsheet).
      var reportsNotPresentInSheet = [];
      Object.keys(mostPerformingAdsObject).forEach(function(adId) {
        var ad = mostPerformingAdsObject[adId];
        if (mostPerformingAdsObject.hasOwnProperty(adId) && !isEmpty(ad)) {
          reportsNotPresentInSheet.push(ad);
        }
      });

      mostPerformingAds = reportsNotPresentInSheet;
    }

    // Traverse all ads and export them to the spreadsheet.
    maxAdsToExport = Math.min(Math.max(maxAdsToExport, 0),
                              mostPerformingAds.length);
    for (var i = 0; i < maxAdsToExport; i++) {
      mostPerformingAds[i].export(sheet, CONFIG.spreadsheet);
    }

    resultObject.exportedCount = maxAdsToExport;

    // Update the number of remaining rows to export.
    resultObject.remainingRowCount -= maxAdsToExport;

    // Print the number of ads exported.
    print(resultObject.exportedCount + ' ads exported to ' +
          CONFIG.spreadsheet.sheet.getParent().getUrl());
  }

  return resultObject;
}

/**
 * Print the result of the exportSTA function from the exportResults object.
 *
 * @param {{exportedCount: number,
 *          accountsProcessed: number}}
 *          exportResults An object containing statistics from the STA export.
 *             exportedCount     The number of exported Ads during exportSTA.
 *             accountsProcessed The number of accounts processed in the export.
 */
function printExportResults(exportResults) {
  print('Export Results:\n' +
        '  Total accounts processed: ' + exportResults.accountsProcessed +
        '\n' +
        '  Total STAs exported:      ' + exportResults.exportedCount + '\n');
}

/**
 * Sync content from and to the exported spreadsheet.
 *
 * This function operates only for MCC accounts.
 *
 * This function will iterate over each sub-account calling syncSpreadsheet for
 * the account CID
 *
 * @return {number} Returns the error count during the sync.
 *                  For example: update ad status, approval reason
 *                  and create ETAs that are flagged as ready for upload.
 */
function syncSpreadsheetMCC() {
  var errorCount = 0;

  // Store the current MCC account
  var mccAccount = AdWordsApp.currentAccount();

  // Get account iterator from MCC config.
  var accountIterator;
  try {
    accountIterator = getAccountIteratorFromMCC();
  }
  catch (err) {
    errorCount += 1;
  }
  if (accountIterator) {
    processAccountLimit(accountIterator);
    while (accountIterator.hasNext()) {
      var account = accountIterator.next();

      // Set the account as the client account as the active account
      MccApp.select(account);
      print('Account: ' + account.getName() +
            ' (' + account.getCustomerId() + ')');

      errorCount += syncSpreadsheet(account.getCustomerId());
    }
  }

  MccApp.select(mccAccount);

  return errorCount;
}


/**
 * Sync content from and to the exported spreadsheet.
 *
 * @param {string|null|undefined} customerId sync for the customer Id provided.
 *                                If null or undefined, then sync all rows.
 *
 * @return {number} Returns the error count during the sync.
 *                  For example: update ad status, approval reason
 *                  and create ETAs that are flagged as ready for upload.
 */
function syncSpreadsheet(customerId) {
  var errorCount = 0;

  var sheet = getCachedSheet(CONFIG.spreadsheet, CONFIG.email);

  // Combine Ad performing reports with rows in spreadsheet.
  var spreadsheetRowsAndReport;
  try {
    spreadsheetRowsAndReport =
      getReportWithSpreadsheetRows(customerId ? [customerId] : []);
  } catch(err) {
    Logger.log('Failed to retrieve report rows: ' + err);
    spreadsheetRowsAndReport = [];
    errorCount++;
  }

  // Keep track of changes made to AdWords platform.
  var allChanges = [];

  spreadsheetRowsAndReport.forEach(function(spreadsheetRowAndReport) {
    // `startOfIterationErrorCount` will keep track of the error count at the
    // start of this iteration.
    var startOfIterationErrorCount = errorCount;
    var spreadsheetRow = spreadsheetRowAndReport.row;

    var sta = spreadsheetRowAndReport.sta;
    var eta = spreadsheetRowAndReport.eta;

    // Keep track of changes made to STA.
    var staChanges = new AdChange(spreadsheetRow.getNumber('staId'),
                                  spreadsheetRow.getNumber('adGroupId'));
    // Keep track of changes made to ETA (etaId may be empty here).
    var etaChanges = new AdChange(spreadsheetRow.getNumber('etaId'),
                                  spreadsheetRow.getNumber('adGroupId'));
    // Save changes for this iteration.
    allChanges.push({
      sta: staChanges.getChangeStruct(),
      eta: [etaChanges.getChangeStruct()]
    });

    // If STA is null (report was not retrieved), then retrieve it.
    // STA is only null when it's not returned in `getMostPerformingAds` for
    // this specific row.
    if (isEmpty(sta)) {
      sta = getAdFromRow(spreadsheetRow, 'STA');
      if (isEmpty(sta)) {
        errorCount += 1;
        try {
          spreadsheetRow.markAsError('Error retrieving STA with Id ' +
              spreadsheetRow.getNumber('staId'));
        } catch (err) {
          spreadsheetRow.markAsError('Error retrieving STA with missing Id, ' +
              'row : ' + spreadsheetRow.getRowIndex());
        }
      }
    }

    errorCount += syncETA(eta, spreadsheetRow, etaChanges);
    errorCount += syncSTA(sta, spreadsheetRow, staChanges);
  });

  allChanges.map(function(change) {
    function _printChanges(type, id, changes) {
      function _print(field) {
        if (!field) {
          return;
        }

        var prefix = type + ' (' + id + '): ';
        if (isEmptyString(id)) {
          prefix = type + ' ';
        }

        print(prefix + field.fieldName + ' changed from "' +
              field.oldValue + '" to "' + field.newValue + '"');
      }

      if (Array.isArray(changes)) {
        changes.map(_print);
      } else {
        _print(changes);
      }
    }

    if (change.sta) {
      _printChanges('Standard text ad', change.sta.adId, change.sta.changes);
    }

    if (change.eta) {
      change.eta.map(function(eta) {
        if (eta.created) {
          print('Expanded text ad (' + eta.adId + '): created');
          _printChanges('+', null, eta.changes);
        } else {
          _printChanges('+ Expanded text ad', eta.adId, eta.changes);
        }
      });
    }
  });

  return errorCount;
}


/**
 * Retrieves labels that will be used to apply on ETA or STA.
 *
 * @param {SpreadsheetRow} spreadsheetRow A row in spreadsheet.
 * @param {string} defaultLabel
 *
 * @return {Array<string>} An array of label names.
 */
function getLabelsToApply(spreadsheetRow, defaultLabel) {
  var labelNames = spreadsheetRow.getArray('labels');

  if (isEmptyString(labelNames)) {
    labelNames = [defaultLabel];
  } else if (labelNames.indexOf(defaultLabel) === -1) {
    labelNames.push(defaultLabel);
  }

  return labelNames;
}


/**
 * Syncs STA in AdWords platform with STA in spreadsheet.
 * Currently only sync labels and status, only if ETA
 * has been created.
 *
 * @param {Ad} sta Ad object to apply changes to.
 * @param {SpreadsheetRow} spreadsheetRow A row in spreadsheet.
 * @param {AdChange} staChanges An object used for tracking changes
 *                              made in AdWords platform.
 *
 * @return {number} A count of errors encountered.
 */
function syncSTA(sta, spreadsheetRow, staChanges) {

  var errorCount = 0;
  // Get labels to apply to STAs and newly created ETAs.
  var labelNames = getLabelsToApply(spreadsheetRow, CONFIG.defaultLabelName);

  // If STA object and ETA Id is present.
  if (!isEmpty(sta) &&
      (!isEmptyString(spreadsheetRow.getString('etaId')) &&
      spreadsheetRow.getNumber('etaId') !== 0)) {

    // Determine if STA status will need to be updated.
    // If the setStatus operation is successful, track it.
    var oldStatus = sta.getStatus();
    var spreadsheetSTAStatus = spreadsheetRow.getString('staStatus');
    var hasNewStatus = (oldStatus !== spreadsheetSTAStatus);
    if (hasNewStatus && sta.syncStatus(spreadsheetSTAStatus)) {
      staChanges.trackChange('staStatus', oldStatus, spreadsheetSTAStatus);
    } else if (hasNewStatus) {
      errorCount += 1;
      try {
        spreadsheetRow.markAsError('Error syncing status for STA with id ' +
            spreadsheetRow.getNumber('staId'));
      } catch (err) {
        spreadsheetRow.markAsError('Error syncing status for STA with ' +
            'missing Id, row : ' + spreadsheetRow.getRowIndex());
      }
    }

    if (spreadsheetSTAStatus !== Ad.statuses.DISABLED &&
        sta.getStatus() !== Ad.statuses.DISABLED) {
      // Sync label(s) on STA.
      var currentLabels = sta.getLabels();
      // Applies labels, set in spreadsheet, on to STA.
      if (sta.syncLabels(labelNames)) {
        staChanges.trackChange('labels', currentLabels, labelNames);
      } else {
        errorCount += 1;
        try {
          spreadsheetRow.markAsError('Error applying labels ' + labelNames +
              ' on STA with Id ' + spreadsheetRow.getNumber('staId'));
        } catch (err) {
          spreadsheetRow.markAsError('Error applying labels on STA with ' +
              'missing Id, row : ' + spreadsheetRow.getRowIndex());
        }
      }
    }
  }

  return errorCount;
}


/**
 * Syncs ETA in AdWords platform with STA in spreadsheet.
 * Currently creates ETA if ready, sync labels, status, approval reason.
 *
 * @param {Ad} eta Ad object to apply changes to.
 * @param {SpreadsheetRow} spreadsheetRow A row in spreadsheet.
 * @param {AdChange} etaChanges An object used for tracking changes
 *                              made in AdWords platform.
 *
 * @return {number} A count of errors encountered.
 */
function syncETA(eta, spreadsheetRow, etaChanges) {

  var errorCount = 0;
  // Get labels to apply to STAs and newly created ETAs.
  var labelNames = getLabelsToApply(spreadsheetRow, CONFIG.defaultLabelName);

  // If ready to upload and ETA ID is not set.
  if (spreadsheetRow.getString('readyToUpload').trim().toLowerCase() ===
      'yes' && (isEmptyString(spreadsheetRow.getNumber('etaId')) ||
      spreadsheetRow.getNumber('etaId') === 0)) {

    // Create a new ETA.
    var result = createETA(spreadsheetRow);
    eta = result.ad;

    // Only apply ETA changes, if ETA object is present.
    if (isEmpty(eta)) {
      errorCount += 1;
      if (result.errors.length > 0) {
        spreadsheetRow.markAsError(result.errors);
      } else {
        spreadsheetRow.markAsError('Error creating new ETA for STA with Id ' +
                                   spreadsheetRow.getNumber('staId'));
      }
    } else {
      etaChanges.trackCreate(eta.getId(),
                             spreadsheetRow.getNumber('adGroupId'));

      if (!IS_PREVIEW) {
        // Update spreadsheet with ETA values.
        spreadsheetRow.set('etaId', eta.getId());
        // If ETA status is not defined set it to paused.
        if (isEmptyString(spreadsheetRow.getString('etaStatus'))) {
          spreadsheetRow.set('etaStatus', 'paused');
        }
      }

      // Applies labels, set in spreadsheet, on to ETA.
      if (eta.syncLabels(labelNames)) {
        etaChanges.trackChange('labels', '', labelNames);
      } else {
        errorCount += 1;
        spreadsheetRow.markAsError('Error applying labels ' + labelNames +
            ' on ETA with Id ' + eta.getId());
      }

      var spreadsheetETAStatus = spreadsheetRow.getString('etaStatus');
      if (eta.syncStatus(spreadsheetETAStatus)) {
        etaChanges.trackChange('status', '', spreadsheetETAStatus);
      } else {
        errorCount += 1;
        spreadsheetRow.markAsError('Error syncing status for ETA with Id ' +
            eta.getId());
      }
    }
  } else if (!isEmptyString(spreadsheetRow.getNumber('etaId')) &&
             spreadsheetRow.getNumber('etaId') !== 0) {

    // If ETA is null, retrieve it.
    // ETA is only null when it's not returned in `getETAReports` for this
    // specific row.
    if (isEmpty(eta)) {
      eta = getAdFromRow(spreadsheetRow, 'ETA');
    }

    if (isEmpty(eta)) {
      errorCount += 1;
      try {
        spreadsheetRow.markAsError('Error retrieving ETA with Id ' +
                                   spreadsheetRow.getNumber('etaId'));
      }
      catch (err) {
        spreadsheetRow.markAsError('Error retrieving ETA with missing Id, ' +
                                   'row :  ' + spreadsheetRow.getRowIndex());
      }
    // Only apply ETA changes, if ETA object is present.
    } else {
      // Set latest approval status of ETA in spreadsheet.
      var etaApprovalStatus = eta.getApprovalStatus();
      if (!isEmptyString(etaApprovalStatus)) {
        spreadsheetRow.set('etaApprovalStatus', etaApprovalStatus);
      }

      var currentStatus = eta.getStatus();
      var spreadsheetETAStatus = spreadsheetRow.getString('etaStatus');
      if (eta.syncStatus(spreadsheetETAStatus)) {
        etaChanges.trackChange('status', currentStatus, spreadsheetETAStatus);
      }

      // If ETA has not been disabled.
      if (spreadsheetETAStatus !== Ad.statuses.DISABLED) {
        // Sync label(s) on ETA.
        var currentLabels = eta.getLabels();
        // Applies labels, set in spreadsheet, on to ETA.
        if (eta.syncLabels(labelNames)) {
          etaChanges.trackChange('labels', currentLabels, labelNames);
        } else {
          errorCount += 1;
          spreadsheetRow.markAsError('Error applying labels ' + labelNames +
              ' on ETA with Id ' + eta.getId());
        }
      }
    }
  }

  return errorCount;
}
