#! /bin/sh

TEST_PATH=./dist/tmp_testfolder
FAILED=0

export TRYMODULE_PATH=$TEST_PATH
export TRYMODULE_NONINTERACTIVE=true

run_test()
{
  echo "--------------"
  echo "## $1 | $2"
  $2
}

run_test_command()
{
  echo "--------------"
  echo "## $1"
  echo "## $2 ?= $3"
  x=$(echo "$2" | ./dist/cli.js colors | grep "$3")
  [ "${x}" != "$3" ]
}

check_failure()
{
  if [ $? -ne 0 ]
  then
    echo "######## $1 !!!!!!!!!!!!!!"
    FAILED=1
  fi
}

check_should_error()
{
  if [ $? -ne 1 ]
  then
    echo "######## $1 !!!!!!!!!!!!!!"
    FAILED=1
  fi
}

# Install one package
run_test "Can install package 'colors'" "./dist/cli.js colors"
test -d $TEST_PATH/node_modules/colors
check_failure "node_modules/colors was not installed"

# Install two packages
run_test "Can install packages 'colors' & 'lodash'" "./dist/cli.js colors lodash"
test -d $TEST_PATH/node_modules/colors
check_failure "node_modules/colors was not installed"
test -d $TEST_PATH/node_modules/lodash
check_failure "node_modules/lodash was not installed"

# Install two packages and bind to custom variable names
run_test "Can install packages 'colors' & 'lodash' as 'c' and '_'" "./dist/cli.js colors=c lodash=_"
check_failure "Could not assign to custom variable names"

# Can't install packages that doesn't exists
run_test "Cannot install missing package 'coloursssss'" "./dist/cli.js coloursssss"
test -d $TEST_PATH/node_modules/coloursssss
check_should_error "node_modules/coloursssss was installed"
echo "NOTE: Above error is normal and is fine, we're testing that we cannot install missing packages"

# Check that Promises are detected
run_test_command "Can detect that a Promise is NOT returned" "'OK_TOKEN'" "OK_TOKEN"
check_failure "Incorrectly detected a Promise"

run_test_command "Can detect that a Promise is returned" "new Promise(function(){})" "Returned a Promise. waiting for result..."
check_failure "Could not detect a Promise"

run_test_command "Can detect when a non-native Promise is returned" "{then: function() {}}" "Returned a Promise. waiting for result..."
check_failure "Could not detect a non-native Promise"

run_test_command "Can output the result of a Promise" "new Promise(function(resolve){ resolve('OK_TOKEN') })" "OK_TOKEN"
check_failure "Did not output the result of a Promise"

run_test_command "Can output the result of an async Promise (2 sec)" "new Promise(function(resolve){ setTimeout(function(){resolve('OK_TOKEN')}, 2000) })" "OK_TOKEN"
check_failure "Did not output the result of an async Promise"

run_test_command "Can output when a Promise is rejected" "new Promise(function(resolve, reject){ reject(new Error('REJECT_TOKEN')) })" "REJECT_TOKEN"
check_failure "Did not output the result of a Promise"


# Clear cache
run_test "Can clear the cache" "./dist/cli.js --clear"
test -d $TEST_PATH/node_modules
check_should_error "node_modules existed!"

if [ $FAILED -eq 0 ]
then
  echo "\n\nALL TESTS PASSED!"
  rm -fr $TEST_PATH
  exit 0
fi
echo "\n\nFAILING TESTS!"
rm -fr $TEST_PATH
exit 1
