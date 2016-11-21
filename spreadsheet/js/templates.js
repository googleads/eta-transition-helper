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

var TEMPLATE_ID_TESTS = 1;

var TEMPLATE_ITEM_FAILURES = '[failures]';
var TEMPLATE_ITEM_PASSES = '[passes]';
var TEMPLATE_ITEM_LOG = '[log]';

var TEMPLATE_TESTS = {
  'subject': '[ETA Transition Helper] Test result: ' + TEMPLATE_ITEM_FAILURES +
        ' failed, ' + TEMPLATE_ITEM_PASSES + ' passed',
  'body': 'Hello there,<br/><br/>' +
        '- Failed: ' + TEMPLATE_ITEM_FAILURES + '<br/>' +
        '- Passed: ' + TEMPLATE_ITEM_PASSES + '<br/><br/>' +
        'Log:<br/>' + TEMPLATE_ITEM_LOG +
        '<br/><br/>' + 'Yours,<br/>' + 'ETA Transition Helper'
};

/**
 * Populate template by ID
 *
 * @param {number} templateId The id of the template to return.
 * @param {Object} data The data to insert into the template.
 *
 * @return {?Object} Return the template with templateId or null
 */
function getTemplate(templateId, data) {
  switch (templateId) {
    case TEMPLATE_ID_TESTS:
      return {
        'subject': TEMPLATE_TESTS.subject
          .replace(TEMPLATE_ITEM_FAILURES, data.failures)
          .replace(TEMPLATE_ITEM_PASSES, data.passes),
        'body': TEMPLATE_TESTS.body
          .replace(TEMPLATE_ITEM_FAILURES, data.failures)
          .replace(TEMPLATE_ITEM_PASSES, data.passes)
          .replace(TEMPLATE_ITEM_LOG,
                   data.log.replace(/(INFO:|ERROR:|WARN:)/g, '<br/><br/>'))
      };
    default:
      return null;
  }
}

/**
 * Get the template item string from a key
 *
 * @param {string} key The key to retrieve the template item.
 *
 * @return {string} Return the template item for the key.
 */
function getTemplateItem(key) {
  return '[' + key + ']';
}

