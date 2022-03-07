import xml2js from 'xml2js';

import * as fs from "fs";
import * as util from "util";

export enum TestStatus {
    Pass,
    Fail,
    Skip
}

interface TestCounts {
    passed: number
    failed: number
    skipped: number
}

interface TestResult {
    counts: TestCounts
    suites: TestSuite[]
}

interface TestSuite {
    name?: string
    timestamp?: string
    filename?: string
    cases: TestCase[]
}

interface TestCase {
    status: TestStatus
    name: string
    description?: string
    details?: string
    duration?: string
}

export async function parseTap(filename: string): Promise<TestResult> {
    const data = fs.readFileSync(filename, "utf8")
    const lines = data.split(/\r?\n/)
    let version = 12

    if (lines.length > 0 && lines[0].match(/^TAP version 13$/)) {
        version = 13
        lines.shift()
    }

    let testMax = 0
    let num = 0

    const suites: TestSuite[] = [ ]
    let currentSuite: TestSuite

    const cases = [ ]
    const counts = {
        passed: 0,
        failed: 0,
        skipped: 0
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        let found
        let status = TestStatus.Skip
        let description = ""

        if (line.match(/^\s*#/)) {
            /* comment; ignored */
        } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*#\s*[Ss][Kk][Ii][Pp]\S*(?:\s+(.*))?/)) {
            console.log("SKIPPPP: " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Skip
            description = found[2]

            counts.skipped++
        } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*(.*)?/)) {
            console.log("OK! " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Pass
            description = found[2]

            counts.passed++
        } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*#\s*[Tt][Oo][Dd][Oo](?:\s+(.*))?/)) {
            console.log("TODO " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Skip
            description = found[2]

            counts.passed++
        } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*-?\s*(.*)?/)) {
            console.log("NOT OK! " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Fail
            description = found[2]

            counts.failed++
        } else {
            console.log("??????? " + line)
            continue
        }

        if (isNaN(num)) {
            num = ++testMax
        } else if (num > testMax) {
            testMax = num
        }

        console.log(line);
        console.log(num)
        console.log(status)
        console.log(description)
        console.log( " --")

        cases.push({
            status: status,
            description: description
        })
    }

    return {
        counts: counts,
        suites: suites
    }
}

export async function parseXml(filename: string): Promise<TestResult> {
    const data = fs.readFileSync(filename, "utf8")

    const parser = util.promisify(xml2js.parseString)
    const xml: any = await parser(data)

    if (!xml.testsuites) {
        throw new Error("expected top-level testsuites node")
    }

    if (!Array.isArray(xml.testsuites.testsuite)) {
        throw new Error("expected array of testsuites")
    }

    const suites: TestSuite[] = [ ]
    const counts = {
        passed: 0,
        failed: 0,
        skipped: 0
    }

    for (const testsuite of xml.testsuites.testsuite) {
        const cases = [ ]

        if (!Array.isArray(testsuite.testcase)) {
            continue
        }

        for (const testcase of testsuite.testcase) {
            let status = TestStatus.Pass

            const id = testcase.$.id
            const classname = testcase.$.classname
            const name = testcase.$.name
            const duration = testcase.$.time

            let details: string | undefined = undefined

            if (testcase.skipped) {
                status = TestStatus.Skip

                counts.skipped++
            } else if (testcase.failure) {
                status = TestStatus.Fail
                details = testcase.failure[0]._

                counts.failed++
            } else {
                counts.passed++
            }
            
            cases.push({
                status: status,
                name: classname || name,
                description: classname ? name : undefined,
                details: details,
                duration: duration
            })
        }

        suites.push({
            name: testsuite.$.name,
            timestamp: testsuite.$.timestamp,
            filename: testsuite.$.file,
            cases: cases
        })
    }

    return {
        counts: counts,
        suites: suites
    }
}
