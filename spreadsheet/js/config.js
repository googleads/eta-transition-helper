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

var CONFIG = {
  // All available sheets in our spreadsheet.
  sheets: {
    main: {
      name: 'main',

      // The first row where the content starts.
      firstContentRow: 4,

      // Column mapping.
      columns: generateColumnData([
                                   // User and Ad parent (Adgroup and Campaign)
                                   // information.
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
                                   'staStatus',

                                   // STA related attributes (Editable).
                                   'impressions',
                                   'clicks',
                                   'ctr',

                                   // Shared attributes between both ETA and
                                   // STA (Editable).
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

                                   // Error message
                                   'errorMessage'

      ]),

      // Fields to link. If the following fields are equivalent
      // in two or more ads, then we treat them as matching group.
      columnsToLink: {
        names: [],
        // Key for storing MatchingColumnsBucketStorage.
        storageKey: 'matching_columns'
      },

      // Columns to highlight if they do not match.
      mismatchColumns: {
        // Column names to compare and highlight if they differ.
        names: [
          'displayUrl',
          'finalUrl'
        ],
        // Color to set for columns that don't match.
        color: '#FF0000'
      },

      // Column to check and determine if row is not empty.
      nonEmptyColumnCheck: 'customerId',

      // The row index, in spreadsheet, where header is located.
      headerRow: 3,

      // Read-Only columns.
      readOnlyColumns: ['customerId',
                        'customerName',
                        'campaignId',
                        'campaignName',
                        'adGroupId',
                        'adGroupName',
                        'staId',
                        'headline',
                        'description1',
                        'description2',
                        'staApprovalStatus',

                        'impressions',
                        'clicks',
                        'ctr',

                        'labels',

                        'etaApprovalStatus',
                        'etaCreated',
                        'etaId',

                        'errorMessage']
    },
    // Settings sheet contains user controlled parameters.
    settings: {
      name: 'settings',

      // Flag used to toggle matching cells sync.
      enableMatchingColumnsLinkingCell: 'Enable Matching Columns Linking'
    }
  }
};


/**
 * Initializes dynamic properties of spreadsheet.
 */
function initConfig() {
  // Retrieve settings sheet.

  CONFIG.sheets.settings.sheet = getSheetByName(CONFIG.sheets.settings.name);

  // Reference to main config.
  var mainConfig = CONFIG.sheets.main;

  mainConfig.sheet = getSheetByName(mainConfig.name);
}
