/**
 * @license Copyright 2016, Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @name ETA Transition Helper.
 *
 * @overview An AdWords Script that exports standard text ads from an account
 *           to a Spreadsheet and then imports newly created expanded text ads
 *           back to the AdWords account.
 *
 *           see https://developers.google.com/adwords/scripts/docs/solutions/mccapp-eta-transition-helper
 *           for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.0
 *
 * @changelog
 * - version 1.0
 *   - Released initial version.
 */
//////////////////////////////////////////////////////////////////////////
//////////////////////////// CONFIGURATION ///////////////////////////////
//////////////////////////////////////////////////////////////////////////
var CONFIG = {
  // Select by CIDs (For MCC only).
  //selectByAccountIds: ['123-456-7890', '098-765-4321'],

  // Select by sub-mcc (For MCC only).
  //selectBySubMccId: '123-456-7890',

  // Recipient email address for script notifications.
  email: '',

  // Set DEBUG mode. In this mode, the script will print messages to the log
  // output screen.
  debug: true,

  spreadsheet: {
    // ID of template spreadsheet.
    templateId: '1C66jjF57dZ5Me8vbUDnXTRXTNekHIVEwEQF8PnVD9Ks',

    // Name of the spreadsheet where all ads are exported and later imported to
    // upload ETAs.
    targetName: 'ETA Transition Helper v1.0',

    // Stores a reference to Sheet.
    // Do not set any values for `sheet`, this is dynamically filled when
    // initialized.
    sheet: null,

    // The name of the sheet inside the spreadsheet.
    sheetName: 'main',

    // The first row where the content starts.
    firstContentRow: 4,

    // The row index, in spreadsheet, where header is located.
    headerRow: 3,

    // Column to check and determine if row is not empty.
    nonEmptyColumnCheck: 'customerName',

    // Holds mappings between column names and their spreadsheet index.
    // Do not set any values for `columnNamesToIndices`, this is dynamically
    // filled when initialized.
    columnNamesToIndices: {},

    // Default status for each new ETA.
    defaultStatus: 'paused',

    // Column mapping.
    columns: [
              // User and Ad parent (Adgroup and Campaign) information.
              'customerId',
              'customerName',
              'campaignId',
              'campaignName',
              'adGroupId',
              'adGroupName',

              // STA related attributes (Read Only).
              'staId',
              'headline',
              'description1',
              'description2',
              'staApprovalStatus',
              'displayUrl',

              // STA related attributes (Editable).
              'staStatus',

              // STA performance metrics (Read Only).
              'impressions',
              'clicks',
              'ctr',

              // Shared attributes between both ETA and STA (Editable).
              'finalUrl',
              'mobileFinalUrl',
              'trackingTemplate',
              'customParameters',
              'labels',

              // ETA related attributes (Editable).
              'headline1',
              'charactersRemainingH1',
              'headline2',
              'charactersRemainingH2',
              'description',
              'charactersRemainingDesc',
              'path1',
              'path2',
              'etaStatus',

              // ETA related attributes (Read Only).
              'etaApprovalStatus',
              'etaCreated',
              'etaId',

              'readyToUpload',

              'errorMessage'],

    // Map between report fields and spreadsheet columns.
    // This mapping is used when exporting report data
    // to the spreadsheet. Will skip fields with `null` values.
    reportFieldMap: {
      customerId: 'accountId',
      customerName: 'accountName',
      campaignId: 'campaignId',
      campaignName: 'campaignName',
      adGroupId: 'adGroupId',
      adGroupName: 'adGroupName',

      staId: 'id',
      headline: 'headline',
      description1: 'description1',
      description2: 'description2',
      staApprovalStatus: 'creativeApprovalStatus',
      displayUrl: 'displayUrl',
      staStatus: 'status',

      impressions: 'impressions',
      clicks: 'clicks',
      ctr: 'ctr',

      finalUrl: 'creativeFinalUrls',
      mobileFinalUrl: 'creativeFinalMobileUrls',
      trackingTemplate: 'creativeTrackingUrlTemplate',
      customParameters: 'creativeUrlCustomParameters',
      labels: 'labels',

      headline1: 'headlinePart1',
      charactersRemainingH1: null,
      headline2: 'headlinePart2',
      charactersRemainingH2: null,
      description: 'description',
      charactersRemainingDesc: null,
      path1: 'path1',
      path2: 'path2',
      etaStatus: null,

      etaApprovalStatus: null,
      etaCreated: null,
      etaId: null,

      readyToUpload: null,

      errorMessage: null
    },

    // Columns with formulas to avoid overriding.
    // Will copy these fields when appending new rows in the spreadsheet.
    columnsWithFormulas: ['charactersRemainingH1',
                          'charactersRemainingH2',
                          'charactersRemainingDesc',
                          'etaCreated']
  },

  // The total number of ads we would like to handle.
  numOfAds: 800,

  // The total number of accounts we would like to handle (MCC only).
  numOfAccounts: 50,

  // The duration used to download the Ad Performance Report.
  duration: 'LAST_30_DAYS',

  // The API version to use when downloading the Ad Performance Report.
  apiVersion: 'v201607',

  // When sorting ads by performance, use the values listed here as a criteria
  // when comparing different performance values. For example, if ad A has
  // 100 impressions and ad B has 90 impressions, ad A should be more important
  // for us - unless impressionsThreshold is equal or higher to 10, then we'll
  // consider both ads with the same magnitude of impressions and therefore
  // compare their CTR.
  performance: {
    impressionsThreshold: 10,
    ctrThreshold: 0.1
  },

  // Fields to select from Ad Performance Report and export to selected
  // spreadsheet.
  reportFields: ['CampaignId', 'CampaignName', 'AdGroupId', 'AdGroupName', 'Id',
                 'Headline', 'Description1', 'Description2',
                 'CreativeApprovalStatus', 'DisplayUrl',

                 'Status',

                 'Impressions', 'Clicks', 'Ctr',

                 'CreativeFinalUrls', 'CreativeFinalMobileUrls',
                 'CreativeTrackingUrlTemplate', 'CreativeUrlCustomParameters',
                 'Labels',

                 'HeadlinePart1', 'HeadlinePart2', 'Description',
                 'Path1', 'Path2'
  ],

  // The default label to apply to Ads if no value is present in the label
  // column.
  defaultLabelName: 'eta-upgrade',

  // Cache key for storing changes done to platform.
  changeCacheKey: 'platform_changes',

  // Time the value will remain in the cache, in seconds.
  cacheExpiration: 21600,

  // The start date to filter ETA reports by.
  etaReportStartDate: '20160801'
};

// Email template types.
var SPREADSHEET_CREATED = 1;

// Preview mode indicator.
var IS_PREVIEW = AdWordsApp.getExecutionInfo().isPreview();
