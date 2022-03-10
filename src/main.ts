import * as fs from "fs";
import * as util from "util";
import * as core from "@actions/core"

import { TestStatus, TestCounts, TestResult, TestSuite, TestCase, parseFile } from "./test_parser"

const dashboardUrl = 'http://svg.testforest.io/dashboard.svg'
const passIconUrl = 'http://svg.testforest.io/icon/pass.svg?s=12'
const failIconUrl = 'http://svg.testforest.io/icon/fail.svg?s=12'
const skipIconUrl = 'http://svg.testforest.io/icon/skip.svg?s=12'
const noneIconUrl = 'http://svg.testforest.io/icon/none.svg?s=12'

const footer = `This test report was produced by <a href="https://github.com/testforest/action">TestForest Dashboard</a>.&nbsp; Made with ❤️ in Cambridge by TestForest.`

async function run(): Promise<void> {
  try {
    const pathList = core.getInput("paths", { required: true })
    const outputFile = core.getInput("output", { required: true })
    const show = core.getInput("show")

    /*
     * Given paths may either be an individual path (eg "foo.xml"), a path
     * glob (eg "**TEST-*.xml"), or may be newline separated (from a multi-line
     * yaml scalar).
     */
    const paths = [ ]

    for (let path of pathList.split(/\r?\n/)) {
        path = path.trim()
        paths.push(path)
    }

    console.log(paths)

    throw new Error("foo")

    /*
    const paths = [ 
        "/Users/ethomson/Projects/test-summary/action/test/resources/tap/01-common.tap"
        "/Users/ethomson/Projects/test-summary/action/test/resources/tap/02-unknown-amount-and-failure.tap",
        "/Users/ethomson/Projects/test-summary/action/test/resources/tap/04-skipped.tap",
        "/Users/ethomson/Projects/test-summary/action/test/resources/xml/02-example.xml"
    ]
        */


    let total: TestResult = {
        counts: { passed: 0, failed: 0, skipped: 0 },
        suites: [ ],
        exception: undefined
    }

    for (const path of paths) {
        const result = await parseFile(path)

        total.counts.passed += result.counts.passed
        total.counts.failed += result.counts.failed
        total.counts.skipped += result.counts.skipped

        total.suites.push(...result.suites)
    }

    let output = dashboardSummary(total)
    output += dashboardResults(total, TestStatus.Pass)

    if (outputFile === "-") {
        console.log(output)
    } else {
        const writefile = util.promisify(fs.writeFile);
        await writefile(outputFile, output)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else if (error !== null && error !== undefined) {
      core.setFailed(error as string)
    } else {
      core.setFailed("unknown error")
    }
  }
}

function dashboardSummary(result: TestResult) {
    const count = result.counts
    let summary = ""

    if (count.passed > 0) {
        summary += `${count.passed} passed`
    }
    if (count.failed > 0) {
        summary += `${summary ? ', ' : '' }${count.failed} failed`
    }
    if (count.skipped > 0) {
        summary += `${summary ? ', ' : '' }${count.skipped} skipped`
    }

    return `<img src="${dashboardUrl}?p=${count.passed}&f=${count.failed}&s=${count.skipped}" alt="${summary}">`
}

function dashboardResults(result: TestResult, show: number) {
    let table = "<table>"
    let count = 0
    let title: string

    if (show == TestStatus.Fail) {
        title = "Test failures"
    } else if (show == TestStatus.Skip) {
        title = "Skipped tests"
    } else if (show == TestStatus.Pass) {
        title = "Passing tests"
    } else {
        title = "Test results"
    }

    table += `<tr><th align="left">${title}:</th></tr>`

    for (const suite of result.suites) {
        for (const testcase of suite.cases) {
            if (show != 0 && (show & testcase.status) == 0) {
                continue
            }

            table += "<tr><td>"

            if (testcase.status == TestStatus.Pass) {
                table += `<img src="${passIconUrl}" alt="">&nbsp; `
            } else if (testcase.status == TestStatus.Fail) {
                table += `<img src="${failIconUrl}" alt="">&nbsp; `
            } else if (testcase.status == TestStatus.Skip) {
                table += `<img src="${skipIconUrl}" alt="">&nbsp; `
            }

            table += testcase.name

            if (testcase.description) {
                table += ": "
                table += testcase.description
            }

            if (testcase.details) {
                table += "<br/><pre><code>"
                table += testcase.details
                table += "</code></pre>"
            }

            table += "</td></tr>\n"

            count++
        }
    }

    table += `<tr><td><sub>${footer}</sub></td></tr>`
    table += "</table>"

    if (count == 0)
        return ""

    return table
}

run()
