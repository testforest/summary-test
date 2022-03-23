Test Summary
============
![Test dashboard: 42 tests passed, 8 tests failed](http://svg.testforest.io/dashboard.svg?p=42&f=8)

Produce an easy-to-read summary of your project's test data as part of your GitHub Actions CI/CD workflow. This helps you understand at-a-glance the impact to the changes in your pull requests, and see which changes are introducing new problems.

* Integrates easily with your existing GitHub Actions workflow
* Produces summaries from JUnit (XML) and TAP test output
* Compatible with most testing tools for most development platforms
* Customizable to show just a summary, just failed tests, or all test results.

Getting Started
---------------
To set up the test summary action, just add a few lines of YAML to your GitHub Actions workflow. For example, if your test harness produces JUnit-style outputs in the `test/results/` directory:

```yaml
- name: Test Summary
  uses: testforest/summary@v1
  with:
    paths: 'test/results/**/TEST-*.xml'
  if: always()
```

Update `paths` to match the test output file(s) that your test harness produces.  You can specify glob patterns, including `**` to match the pattern recursively. In addition, you can specify multiple test paths on multiple lines. For example:

```yaml
- name: Test Summary
  uses: testforest/summary@v1
  with:
    paths: |
      test-one/**/TEST-*.xml
      test-two/results/results.tap
  if: always()
```

Note the `if: always()` conditional in this workflow step: you should always use this so that the test summary creation step runs _even if_ the previous steps have failed. This allows your test step to fail -- due to failing tests -- but still produce a test summary.

Questions / Help / Contact
--------------------------
Have questions? Need help? Visit [the discussion forum](https://github.com/testforest/summary/discussions).

Copyright (c) 2022 Edward Thomson. Available under the MIT license.
