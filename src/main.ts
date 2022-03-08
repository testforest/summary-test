import * as fs from "fs";
import * as core from "@actions/core"

import { TestStatus, TestCounts, TestResult, TestSuite, TestCase, parseFile } from "./test_parser"

const dashboardUrl = 'http://svg.test-summary.com/dashboard.svg'
const passIconUrl = 'https://icongr.am/octicons/check-circle-fill.svg?size=14&color=2da44e'
const failIconUrl = 'https://icongr.am/octicons/x-circle-fill.svg?size=14&color=cf222e'
const skipIconUrl = 'https://icongr.am/octicons/skip.svg?size=16&color=6e7781'

async function run(): Promise<void> {
  try {
    //const paths = core.getInput("paths")

    const paths = [ 
        "/Users/ethomson/Projects/test-summary/action/test/resources/tap/02-unknown-amount-and-failure.tap",
        "/Users/ethomson/Projects/test-summary/action/test/resources/tap/04-skipped.tap",
        "/Users/ethomson/Projects/test-summary/action/test/resources/xml/02-example.xml"
    ]

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

    console.log(dashboardSummary(total))

    if (total.counts.failed > 0) {
        console.log(dashboardResults(total, TestStatus.Fail))
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

    table += "</table>"

    if (count == 0)
        return ""

    return table
}

run()
