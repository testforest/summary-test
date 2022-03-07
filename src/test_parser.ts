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

    /** If the test runner itself fails, it will set an exception. */
    exception?: string
}

interface TestSuite {
    name?: string
    timestamp?: string
    filename?: string
    cases: TestCase[]
}

interface TestCase {
    status: TestStatus
    name?: string
    description?: string
    details?: string
    duration?: string
}

export async function parseTap(filename: string): Promise<TestResult> {
    const data = fs.readFileSync(filename, "utf8")
    const lines = data.trim().split(/\r?\n/)
    let version = 12
    let header = 0

    if (lines.length > 0 && lines[header].match(/^TAP version 13$/)) {
        version = 13
        header++
    }

    if (lines.length > 0 && lines[header].match(/^1\.\./)) {
        // TODO: capture the plan for validation
        header++
    }

    let testMax = 0
    let num = 0

    const suites: TestSuite[] = [ ]
    let exception: string | undefined = undefined

    let cases = [ ]
    let suitename: string | undefined = undefined

    const counts = {
        passed: 0,
        failed: 0,
        skipped: 0
    }

    for (let i = header; i < lines.length; i++) {
        const line = lines[i]

        let found
        let status = TestStatus.Skip
        let name: string | undefined = undefined
        let description: string | undefined = undefined
        let details: string | undefined = undefined

        if (found = line.match(/^\s*#(.*)/)) {
            if (!found[1]) {
                continue
            }

            /* a comment starts a new suite */
            if (cases.length > 0) {
                suites.push({
                    name: suitename,
                    cases: cases
                })

                suitename = undefined
                cases = [ ]
            }

            console.log(`-----------------------`)
            console.log(found[1])

            if (suitename)
                suitename += " " + found[1].trim()
            else
                suitename = found[1].trim()
            continue
        } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*([^#]*?)\s*#\s*[Ss][Kk][Ii][Pp]\S*(?:\s+(.*?)\s*)?$/)) {
            console.log("SKIPPPP: " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Skip
            name = (found[2] && found[2].length > 0) ? found[2] : undefined
            description = found[3]

            counts.skipped++
        } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*(?:(.*?)\s*)?$/)) {
            console.log("OK! " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Pass
            name = found[2]

            counts.passed++
        } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*([^#]*?)\s*#\s*[Tt][Oo][Dd][Oo](?:\s+(.*?)\s*)?$/)) {
            console.log("TODO " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Skip
            name = (found[2] && found[2].length > 0) ? found[2] : undefined
            description = found[3]

            counts.skipped++
        } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*-?\s*(?:(.*?)\s*)?$/)) {
            console.log("NOT OK! " + line)
            console.log(found)

            num = parseInt(found[1])
            status = TestStatus.Fail
            name = found[2]

            counts.failed++
        } else if (line.match(/^Bail out\!/)) {
            let message = (line.match(/^Bail out\!(.*)/));
            
            if (message) {
                exception = message[1].trim()
            }

            break
        } else if (line.match(/^$/)) {
            continue
        } else if (line.match(/^1\.\.\d+/) && i == lines.length - 1) {
            // TODO: capture the plan for validation
            continue
        } else {
            throw new Error(`unknown TAP line ${i + 1}: '${line}'`)
            continue
        }

        if (isNaN(num)) {
            num = ++testMax
        } else if (num > testMax) {
            testMax = num
        }

        console.log(`line: ${line}`);
        console.log(`num: ${num}`)
        console.log(`status: ${status}`)
        console.log(`name: '${name}'`)
        console.log(`description: ${description}`)
        console.log(`details: ${details}`)
        console.log( " --")

        if ((i + 1) < lines.length && lines[i + 1].match(/^  ---$/)) {
            i++

            console.log(`==================================`)
            console.log(`${lines[i]}`)
            while (i < lines.length && !lines[i + 1].match(/^  ...$/)) {
                let detail = (lines[i + 1].match(/^  (.*)/));

                if (!detail) {
                    throw new Error("invalid yaml in test case details")
                }

                if (details)
                    details += "\n" + detail[1]
                else
                    details = detail[1]

                i++
            }

            if (i >= lines.length) {
                throw new Error("truncated yaml in test case details")
            }

            i++
        }

        cases.push({
            status: status,
            name: name,
            description: description,
            details: details
        })
    }

    suites.push({
        name: suitename,
        cases: cases
    })

    return {
        counts: counts,
        suites: suites,
        exception: exception
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
