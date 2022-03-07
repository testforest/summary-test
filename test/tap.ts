import { parseTap } from "../src/test_parser"

const resourcePath = `${__dirname}/resources/tap`

describe("tap", async () => {
    it("parses common", async () => {
        await parseTap(`${resourcePath}/01-common.tap`)
    })
})
