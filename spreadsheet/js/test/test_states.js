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


var rowOffset = CONFIG.sheets.main.firstContentRow;
var TEST_STATES = [
  {
    content: [
      ['This is an Ad headline', 'This is an Ad\'s first description5',
       'This is an Ad\'s second description5', 'www.google.com/test',
       'www.google.com/test'],
      ['This is an Ad headline1', 'This is an Ad\'s first description5',
       'This is an Ad\'s second description5', 'www.google1.com/test1',
       'www.google.com/test'],
      ['This is an Ad headline2', 'This is an Ad\'s first description',
       'This is an Ad\'s second description5', 'www.google.com/test',
       'www.google.com/test'],
      ['This is an Ad headline', 'This is an Ad\'s first description3',
       'This is an Ad\'s second description5', 'www.google1.com/test1',
       'www.google.com/test'],
      ['This is an Ad headline2', 'This is an Ad\'s first description',
       'This is an Ad\'s second description5', 'www.google.com/test',
       'www.google.com/test']
    ],
    linkedColumnsChange: [
    ],
    // An array structured like the following: [[rowIndex, columnName], ...].
    mismatchCells: [
      [5, 'campaignName'],
      [5, 'adGroupId'],
      [7, 'campaignName'],
      [7, 'adGroupId']
    ]
  },
  // First change.
  {
    change: {
      row: rowOffset + 2,
      column: 2,
      oldValue: 'This is an Ad\'s first description',
      value: 'This is an Ad\'s first Modified'
    },
    linkedColumnsChange: [
      {
        column: 2,
        values: [
          'This is an Ad\'s first description5',
          'This is an Ad\'s first description5',
          'This is an Ad\'s first Modified',
          'This is an Ad\'s first description3',
          'This is an Ad\'s first Modified'
        ]
      }
    ],
    mismatchCells: [
      [5, 'campaignName'],
      [5, 'adGroupId'],
      [7, 'campaignName'],
      [7, 'adGroupId']
    ]
  },
  // Second change.
  {
    change: {
      row: rowOffset + 3,
      column: 4,
      oldValue: 'www.google1.com/test1',
      value: 'www.google.com/test1'
    },
    linkedColumnsChange: [
    ],
    mismatchCells: [
    ]
  }
];
