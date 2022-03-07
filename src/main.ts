import * as fs from "fs";
import * as core from "@actions/core"

enum TestStatus {
  Pass,
  Fail,
  Skip
}

interface TestResult {
  status: TestStatus
  description: string
  details: string
}

async function parseTap(filename: string) {
  console.log("hello")

  const data = fs.readFileSync(filename, "utf8")
  const lines = data.split(/\r?\n/)
  let version = 12

  if (lines.length > 0 && lines[0].match(/^TAP version 13$/)) {
    version = 13
    lines.shift()
  }

  let testMax = 0

  let num = 0
  let status: TestStatus = TestStatus.Skip
  let description: string = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let found

    if (line.match(/^\s*#/)) {
      /* comment; ignored */
    } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*#\s*[Ss][Kk][Ii][Pp]\S*(?:\s+(.*))?/)) {
      console.log("SKIPPPP: " + line)
      console.log(found)

      num = parseInt(found[1])
      status = TestStatus.Skip
      description = found[2]
    } else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*(.*)?/)) {
      console.log("OK! " + line)
      console.log(found)

      num = parseInt(found[1])
      status = TestStatus.Pass
      description = found[2]
    } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*#\s*[Tt][Oo][Dd][Oo](?:\s+(.*))?/)) {
      console.log("TODO " + line)
      console.log(found)

      num = parseInt(found[1])
      status = TestStatus.Skip
      description = found[2]
    } else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*-?\s*(.*)?/)) {
      console.log("NOT OK! " + line)
      console.log(found)

      num = parseInt(found[1])
      status = TestStatus.Fail
      description = found[2]
    } else {
      console.log("??????? " + line)
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
  }
}

async function run(): Promise<void> {
  try {
    const paths = core.getInput("paths")

    core.info(paths)
    parseTap("/Users/ethomson/Projects/testy/tests/resources/02-unknown-amount-and-failure.tap")
    console.log('--------------')
    parseTap("/Users/ethomson/Projects/testy/tests/resources/04-skipped.tap")
    console.log('--------------')
    parseTap("/Users/ethomson/Projects/testy/tests/resources/06-creative-liberties.tap")
    console.log('--------------')
    parseTap("/Users/ethomson/Projects/testy/tests/resources/07-everything.tap")
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

run()
