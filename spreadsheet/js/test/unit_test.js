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
 * Simple unit test helper class.
 *
 * Note: Currently this class uses JSON.stringify to compare objects
 * (including arrays). This does not guarantee correct results when the objects
 * are not ordered the same.
 *
 * @param {string} title
 *
 * @return {Object}
 */
function describe(title) {
  Logger.log('');
  Logger.log('** comparing objects using JSON.stringify **');
  Logger.log('Test: ' + title);

  function fail(message) {
    Logger.log('- FAILED' + (!isEmptyString(message) ? ': ' + message : ''));
    uncomposed.failures++;
  }

  function pass(message) {
    Logger.log('+ PASS' + (!isEmptyString(message) ? ': ' + message : ''));
    uncomposed.passes++;
  }

  function _checkType(value, expectedValue) {
    return typeof value != typeof expectedValue;
  }

  function _checkString(value, expectedValue) {
    return typeof value === 'string' && value !== expectedValue;
  }

  function _checkObject(value, expectedValue) {
    // This compare is limited, but good enough for our case.
    // It will fail if the properties aren't ordered the same.
    return value instanceof Object &&
           JSON.stringify(value) !== JSON.stringify(expectedValue);
  }

  function expect(message, value, expectedValue) {
    if (expectedValue === undefined) {
      // Return a composed version with `value` as default parameter.
      // This is good when calling expect like the following:
      // expect('Foo should be null', foo).isNull()
      return composeRecursive(this, message, value);
    }

    if (_checkType(value, expectedValue) ||
        _checkString(value, expectedValue) ||
        _checkObject(value, expectedValue)) {
      fail(message);
    } else {
      pass(message);
    }

    // Return self for chaining.
    return this;
  }

  function wait(millis) {
    // Promise nor setTimout are supported here, we'll use busy-wait instead.
    var waiting = true;
    var now = new Date();
    var endDate = new Date(+now + millis);
    // Busy-wait.
    while (+(new Date()) < +endDate);
    return this;
  }

  function should(message) {
    return composeRecursive(this, message);
  }

  function notNull(message, value) {
    !isEmpty(value) ? pass(message) : fail(message);
    return uncomposed;
  }

  function isNull(message, value) {
    isEmpty(value) ? pass(message) : fail(message);
    return uncomposed;
  }

  function greaterThan(message, value, expectedValue) {
    (value > expectedValue) ? pass(message) : fail(message);
    return uncomposed;
  }

  function greaterThanOrEquals(message, value, expectedValue) {
    (value >= expectedValue) ? pass(message) : fail(message);
    return uncomposed;
  }

  function lessThan(message, value, expectedValue) {
    (value < expectedValue) ? pass(message) : fail(message);
    return uncomposed;
  }

  function lessThanOrEquals(message, value, expectedValue) {
    (value <= expectedValue) ? pass(message) : fail(message);
    return uncomposed;
  }

  function equals(message, value, expectedValue) {
    (value === expectedValue) ? pass(message) : fail(message);
    return uncomposed;
  }

  function toBeTrue(message, value) {
    (!!value) ? pass(message) : fail(message);
    return uncomposed;
  }

  function toBeFalse(message, value) {
    (!value) ? pass(message) : fail(message);
    return uncomposed;
  }

  function equivalent(message, value, expectedValue) {
    // Simple check for object arguments
    if (!value || toString.call(value) !== '[object Object]') {
      fail(message);
      return uncomposed;
    }
    if (!expectedValue || toString.call(expectedValue) !== '[object Object]') {
      fail(message);
      return uncomposed;
    }
    var valueProperties = Object.getOwnPropertyNames(value);
    var expectedProperties = Object.getOwnPropertyNames(expectedValue);

    if (valueProperties.length !== expectedProperties.length) {
      fail(message);
      return uncomposed;
    }

    var i, propertyName;
    for (var i = 0; i < valueProperties.length; i++) {
      propertyName = valueProperties[i];

      if (valueProperties[propertyName] !== expectedProperties[propertyName]) {
        fail(message);
        return uncomposed;
      }
    }

    pass(message);
    return uncomposed;
  }


  var uncomposed = {
    wait: wait,
    should: should,
    expect: expect,
    notNull: notNull,
    isNull: isNull,
    greaterThan: greaterThan,
    greaterThanOrEquals: greaterThanOrEquals,
    lessThan: lessThan,
    lessThanOrEquals: lessThanOrEquals,
    equals: equals,
    toBeTrue: toBeTrue,
    toBeFalse: toBeFalse,
    equivalent: equivalent,
    failures: 0,
    passes: 0
  };

  return uncomposed;
}


var TESTS = {
  run: function(testname) {
    var result = {
      failures: 0,
      passes: 0
    };

    var test = this.tests[testname];
    if (test === undefined) {
      Logger.log('[WARN] Test: ' + testname + ' - not found');
    } else {
      var testResult = test();
      if (!isEmpty(testResult)) {
        result.failures = testResult.failures;
        result.passes = testResult.passes;
      }
    }

    return result;
  },

  runAll: function() {
    Logger.log('***** Running all Tests *****');
    var result = {
      failures: 0,
      passes: 0
    };

    for (var test in TESTS.tests) {
      if (TESTS.tests.hasOwnProperty(test)) {
        var testResult = TESTS.run(test);
        result.failures += testResult.failures;
        result.passes += testResult.passes;
      }
    }

    return result;
  },

  tests: {
    isObject: function() {

      function AClass() {
        this.property = 'property';
      }

      AClass.prototype.aFunction = function() {
        return this.property === 'property';
      };

      var aClass = new AClass;

      return describe('isObject')
          .expect('null is false', isObject(null)).equals(false)
          .expect('undefined is false', isObject(undefined)).equals(false)
          .expect('"string" is false', isObject('string')).equals(false)
          .expect('[0, 1] is false', isObject([0, 1])).equals(false)
          .expect('function() {} is false', isObject(function() {}))
          .equals(false)
          .expect('{} is true', isObject({})).equals(true)
          .expect('{"a":"b"} is true', isObject({'a': 'b'})).equals(true)
          .expect('{"a":undefined} is true', isObject({'a': undefined}))
          .equals(true)
          .expect('Class AClass is false', isObject(aClass)).equals(false)
          .expect('Object.create({}) is true', isObject(Object.create({})))
          .equals(true);
    },

    isValidParamsObject: function() {

      function AClass() {
        this.property = 'property';
      }

      AClass.prototype.aFunction = function() {
        return this.property === 'property';
      };

      var aClass = new AClass;

      var validTypesEmpty = [];
      var validTypesString = ['string'];
      var validTypesStrNum = ['number', 'string'];

      return describe('isValidParamsObject')
          .expect('null is false', isValidParamsObject(null, validTypesString))
          .equivalent({success: false, error: 'params is null'})
          .expect('undefined is false',
                  isValidParamsObject(undefined, validTypesString))
          .equivalent({success: false, error: 'params is undefined'})
          .expect('"string" is false',
                  isValidParamsObject('string', validTypesString))
          .equivalent({success: false, error: 'params is not an object'})
          .expect('[0, 1] is false',
                  isValidParamsObject([0, 1], validTypesString))
          .equivalent({success: false, error: 'params is not an object'})
          .expect('function(){} is false',
                  isValidParamsObject(function() {}, validTypesString))
          .equivalent({success: false, error: 'params is not an object'})
          .expect('Class AClass is false',
                  isValidParamsObject(aClass, validTypesString))
          .equivalent({success: false, error: 'params is not an object'})
          .expect('{} is true',
                  isValidParamsObject({}, validTypesString))
          .equivalent({success: true, error: ''})
          .expect('{"a":"b"} is true',
                  isValidParamsObject({'a': 'b'}, validTypesString))
          .equivalent({success: true, error: ''})
          .expect('{"a":undefined} is false',
                  isValidParamsObject({'a': undefined}, validTypesString))
          .equivalent({success: false,
                       error: 'key `a` has an invalid type `undefined`'})
          .expect('{"a":1} is false',
                  isValidParamsObject({'a': 1}, validTypesString))
          .equivalent({success: false,
                        error: 'key `a` has an invalid type `number`'})
          .expect('{} is false (missing validTypes)', isValidParamsObject({}))
          .equivalent({success: false,
                       error: 'valueTypes is not a valid array'})
          .expect('{"a":1,"b":"2"}, validTypesStrNum is true',
                  isValidParamsObject({'a': 1, 'b': '2'}, validTypesStrNum))
          .equivalent({success: true, error: ''})
          .expect('{"a":1,"b":"2"}, validTypesString is false',
                  isValidParamsObject({'a': 1, 'b': '2'}, validTypesString))
          .equivalent({success: false,
                       error: 'key `a` has an invalid type `number`'})
          .expect('{"a":1,"b":"2"}, validTypesEmpty is false',
                  isValidParamsObject({'a': 1, 'b': '2'}, validTypesEmpty))
          .equivalent({success: false,
                       error: 'key `a` has an invalid type `number`'})
          .expect('{"a":1,"b":"2","c":function(){}}, validTypesStrNum is false',
                  isValidParamsObject({'a': 1, 'b': '2', 'c': function() {}},
                                      validTypesStrNum))
          .equivalent({success: false,
                       error: 'key `c` has an invalid type `function`'})
          .expect('{}, validTypesString, true is false',
                  isValidParamsObject({}, validTypesString, true))
          .equivalent({success: false, error: 'params is empty'})
          .expect('{}, validTypesString, false is true',
                  isValidParamsObject({}, validTypesString, false))
          .equivalent({success: true, error: ''})
          .expect('{"a":"b"}, validTypesString, true is true',
                  isValidParamsObject({'a': 'b'}, validTypesString, true))
          .equivalent({success: true, error: ''});
    },

    verifyColumns: function() {
      // Parse column header to normalized name.
      function _parseHeader(specialCases, header) {
        // Remove whitespaces, non-alphanumeric characters and lowercase
        // all letters.
        var parsed = header.replace(/ |\W/g, '').toLowerCase();

        // Handle special cases.
        if (!isEmpty(specialCases)) {
          var specialCase = specialCases[parsed];
          if (!isEmptyString(specialCase)) {
            parsed = specialCase;
          }
        }

        return parsed;
      }

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

      function _verifyColumns(config) {
        var sheet = getSheetByName(config);
        var header = sheet.getRange(config.firstContentRow - 1, 1, 1,
                                    config.columns._lastIndex + 1);
        var headerValues = header.getValues()[0];

        var passObj = _checkHeaders(
            config.columns._order.map(
            compose(_parseHeader, config.columnMappingSpecialCases)),
            headerValues.map(compose(_parseHeader,
                                     config.columnMappingSpecialCases)));
        return passObj;
      }

      // Verify columns in `main` sheet.
      var passMain = _verifyColumns(CONFIG.sheets.main);

      var result = describe('Verify columns structure')
                   .expect('Verify main columns', passMain.pass).toBeTrue();

      if (!passMain.pass) {
        Logger.log('\nColumns mapping (sheet:script):\n' +
                   JSON.stringify(passMain.mapping, null, 2));
      }

      return result;
    },

    compose: function() {
      function add(a, b) {
        return a + b;
      }

      var add1 = compose(add, 1);
      return describe('compose')
             .expect('To equal 3', add1(2)).equals(3);
    },

    getSheetName: function() {
      var sheetName = 'main';
      var sheetNameObj = {
        name: sheetName
      };

      var sheetNameNotFound = 'foo';
      var sheetNameObjBadProperty = {
        foo: sheetName
      };

      var sheetFromString = getSheetByName(sheetName);
      var sheetFromObj = getSheetByName(sheetNameObj);
      var sheetNotFound = getSheetByName(sheetNameNotFound);
      var sheetFromObjBadProperty = getSheetByName(sheetNameObjBadProperty);

      return describe('getSheetName')
             .expect('Get sheet by string',
                      sheetFromString.getName()).equals(sheetName)
             .expect('Get sheet by object', sheetFromObj.getName())
             .equals(sheetName)
             .expect('Not to find sheet with bad name', sheetNotFound).isNull()
             .expect('Not to find sheet with bad object property',
                      sheetFromObjBadProperty).isNull();
    },

    getSheetConfig: function() {
      var sheetName = 'main';
      var sheetNameNotFound = 'mian';
      var sheetNameBadFormat = 1;

      var sheetConfig = getSheetConfig(sheetName);
      var sheetConfigNotFound = getSheetConfig(sheetNameNotFound);
      var sheetConfigBadFormat = getSheetConfig(sheetNameBadFormat);

      return describe('getSheetConfig')
             .expect('Get sheet config that exist', sheetConfig).notNull()
             .expect('Get sheet config that doesn\'t exist',
                     sheetConfigNotFound).isNull()
                     .expect('Get sheet config using bad format',
                             sheetConfigBadFormat).isNull();
    },

    checkLinking: function() {
      function _createMockEnv(config) {

        // Set this to the first 5 columns.
        config.columnsToLink.names = [
          'customerId',
          'customerName',
          'campaignId',
          'campaignName',
          'adGroupId'
        ];


        config.mismatchColumns = {
          // Column names to compare and highlight if they differ.
          names: [
            'campaignName',
            'adGroupId'
          ],
          // Dynamically filled by initConfig.
          indices: [],
          // Color to set for columns that don't match.
          color: '#FF0000'
        };

        initConfig();

        var mainSheet = config.sheet;
        var spreadsheet = mainSheet.getParent();
        var mockSheet = mainSheet.copyTo(spreadsheet);


        config.sheet = mockSheet;
        config.linkedCellsCacheKey = 'cell_cache_test';
        config.storageKey = 'matching_columns';

        // For readibility, make MatchingColumnsBucket hash function
        // do nothing.
        MatchingColumnsBucket.prototype.hashCode_ = function(str) {
          return str;
        };

      }

      function _tearDown(config) {
        var sheet = config.sheet;

        sheet.getParent().deleteSheet(sheet);
      }

      function _clearContent(config) {
        var sheet = config.sheet;
        var rows = getContentRows(sheet,
                                  config.firstContentRow,
                                  config.nonEmptyColumnCheck,
                                  config.columns);
        rows.forEach(function(row) {
          row.clear();
        });
      }

      function _createMockEvent(sheet, change) {

        var cell = sheet.getRange(change.row, change.column);

        return {
          value: change.value,
          oldValue: change.oldValue,
          range: cell,
          getRow: function() {
            return change.row;
          },
          getColumn: function() {
            return change.column;
          }
        };
      }

      function _fillContent(config, content) {
        var sheet = config.sheet;

        content.forEach(function(row, i) {
          sheet.getRange(i + config.firstContentRow, 1, 1, row.length)
              .setValues([row]);
        });

      }

      function _performChanges(config, change) {
        var sheet = config.sheet;

        var rangeRowMin = null;
        var rangeRowMax = null;
        var rangeColumnMin = null;
        var rangeColumnMax = null;

        var cell = config.sheet.getRange(change.row, change.column);

        if (rangeRowMin === null || change.row <= rangeRowMin) {
          rangeRowMin = change.row;
        }

        if (rangeRowMax === null || change.row >= rangeRowMax) {
          rangeRowMax = change.row;
        }

        if (rangeColumnMin === null || change.column <= rangeColumnMin) {
          rangeColumnMin = change.column;
        }

        if (rangeColumnMax === null || change.column >= rangeColumnMax) {
          rangeColumnMax = change.column;
        }

        cell.setValue(change.value);

        return config.sheet.getRange(rangeRowMin, rangeColumnMin,
                                     rangeRowMax - rangeRowMin + 1,
                                     rangeColumnMax - rangeColumnMin + 1);
      }

      function _validateChange(config, change, test) {
        var expectedLinkedColumnsChange = change.linkedColumnsChange;
        var rows = getContentRows(config.sheet,
                                  config.firstContentRow,
                                  config.nonEmptyColumnCheck,
                                  config.columns);

        // If `every` traverses all elements, then it's a match.
        var allMatch = expectedLinkedColumnsChange.every(
            function(expectedLinkedColumnChange) {
              var columnIndex = expectedLinkedColumnChange.column;
              var expectedValues = expectedLinkedColumnChange.values;

              if (expectedValues.length !== rows.length) {
                return false;
              }

              // If `every` traverses all elements, then it's a match.
              return expectedValues.every(function(expectedValue, i) {
                var row = rows[i];
                return (expectedValues[i] === row.getValueAt(columnIndex));
              });
            });

        var actualMismatchCells = _retrieveMismatchColumns(config);
        var expectedMismatchChange = change.mismatchCells;

        return test.expect('Validating linking', allMatch).toBeTrue()
                   .expect('Validating mismatch', actualMismatchCells,
                           expectedMismatchChange);
      }



      function _retrieveMismatchColumns(config) {
        var sheet = config.sheet;
        var mismatchColor = config.mismatchColumns.color.toLowerCase();
        var rows = getContentRows(sheet,
                                  config.firstContentRow,
                                  config.nonEmptyColumnCheck,
                                  config.columns);

        var mismatchCells = [];
        var mismatchColumnsToCheck = config.mismatchColumns.names;

        rows.forEach(function(row) {
          mismatchColumnsToCheck.forEach(function(mismatchColumn) {
            var color = row.getCell(mismatchColumn).getBackground()
                            .toLowerCase();

            if (color === mismatchColor) {
              mismatchCells.push([row.getRowIndex(), mismatchColumn]);
            }
          });
        });

        return mismatchCells;
      }

      var mockConfig = CONFIG.sheets.main;
      _createMockEnv(mockConfig);

      // Clear any content that may be in mock sheet.
      _clearContent(mockConfig);

      var test = describe('Verify linkMatching function');

      // Traverse each test state, apply changes, and validate.
      TEST_STATES.forEach(function(state, i) {

        // If first state, we handle things differently.
        if (i == 0) {
          // Fill with pre-defined rows.
          _fillContent(mockConfig, state.content);
          // Apply linking and mismatch.
          linkMatchingColumns(mockConfig);
        }
        else {
          var rangeModified = _performChanges(mockConfig, state.change);
          var mockEvent = _createMockEvent(mockConfig.sheet, state.change);

          // Handle edits.
          var linkedRows = handleLinkedRangeEdit(mockConfig.sheet,
                                                 mockEvent,
                                                 mockConfig.storageKey,
                                                 mockConfig.columns);
          handleMismatchRangeEdit(mockConfig.sheet,
                                  mockEvent,
                                  linkedRows,
                                  mockConfig.mismatchColumns,
                                  mockConfig.columns);
        }

        // Validate changes made.
        _validateChange(mockConfig, state, test);

      });

      _tearDown(mockConfig);
      return test;
    }
  }
};

function runTest() {
  return TESTS.run('verifyColumns');
}

function runAlltests() {
  var tests = TESTS.runAll();
  if (tests.failures > 0) {
    Logger.log('***** Test Failed *****');
  }

  return tests;
}
