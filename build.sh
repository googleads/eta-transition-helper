# Copyright 2016 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/sh

OUTPUT=awscript.js

if ! hash uglifyjs 2>/dev/null; then
  echo "Missing uglifyjs"
  if hash npm 2>/dev/null; then
    echo "Installing uglifyjs..."
    sudo npm install uglify-js -g
    if ! hash uglifyjs 2>/dev/null; then
      echo "Failed to install uglify-js, please try again"
      exit -1
    fi
  else
    echo "Missing npm. Please install npm by installing Node following instructions here: https://nodejs.org/en/"
    exit -1
  fi
fi

echo "Building..."
cat src/config.js src/main.js src/ad.js src/utils.js src/sync_spreadsheet_helpers.js | uglifyjs -b --comments > $OUTPUT

echo "Build complete: $OUTPUT"
