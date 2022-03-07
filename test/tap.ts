import { parseTap } from "../src/test_parser"

const resourcePath = "/Users/ethomson/Projects/test-summary/action/test/resources"

describe("tap", async () => {
    it("parses common", async () => {
        await parseTap(`${resourcePath}/01-common.tap`)
    })
})
