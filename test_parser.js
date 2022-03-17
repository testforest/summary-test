"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = exports.parseXmlFile = exports.parseTapFile = exports.parseXml = exports.parseTap = exports.TestStatus = void 0;
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const xml2js_1 = __importDefault(require("xml2js"));
var TestStatus;
(function (TestStatus) {
    TestStatus[TestStatus["Pass"] = 1] = "Pass";
    TestStatus[TestStatus["Fail"] = 2] = "Fail";
    TestStatus[TestStatus["Skip"] = 4] = "Skip";
})(TestStatus = exports.TestStatus || (exports.TestStatus = {}));
function parseTap(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const lines = data.trim().split(/\r?\n/);
        let version = 12;
        let header = 0;
        if (lines.length > 0 && lines[header].match(/^TAP version 13$/)) {
            version = 13;
            header++;
        }
        if (lines.length > 0 && lines[header].match(/^1\.\./)) {
            // TODO: capture the plan for validation
            header++;
        }
        let testMax = 0;
        let num = 0;
        const suites = [];
        let exception = undefined;
        let cases = [];
        let suitename = undefined;
        const counts = {
            passed: 0,
            failed: 0,
            skipped: 0
        };
        for (let i = header; i < lines.length; i++) {
            const line = lines[i];
            let found;
            let status = TestStatus.Skip;
            let name = undefined;
            let description = undefined;
            let details = undefined;
            if (found = line.match(/^\s*#(.*)/)) {
                if (!found[1]) {
                    continue;
                }
                /* a comment starts a new suite */
                if (cases.length > 0) {
                    suites.push({
                        name: suitename,
                        cases: cases
                    });
                    suitename = undefined;
                    cases = [];
                }
                if (suitename)
                    suitename += " " + found[1].trim();
                else
                    suitename = found[1].trim();
                continue;
            }
            else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*([^#]*?)\s*#\s*[Ss][Kk][Ii][Pp]\S*(?:\s+(.*?)\s*)?$/)) {
                num = parseInt(found[1]);
                status = TestStatus.Skip;
                name = (found[2] && found[2].length > 0) ? found[2] : undefined;
                description = found[3];
                counts.skipped++;
            }
            else if (found = line.match(/^ok(?:\s+(\d+))?\s*-?\s*(?:(.*?)\s*)?$/)) {
                num = parseInt(found[1]);
                status = TestStatus.Pass;
                name = found[2];
                counts.passed++;
            }
            else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*([^#]*?)\s*#\s*[Tt][Oo][Dd][Oo](?:\s+(.*?)\s*)?$/)) {
                num = parseInt(found[1]);
                status = TestStatus.Skip;
                name = (found[2] && found[2].length > 0) ? found[2] : undefined;
                description = found[3];
                counts.skipped++;
            }
            else if (found = line.match(/^not ok(?:\s+(\d+))?\s*-?\s*-?\s*(?:(.*?)\s*)?$/)) {
                num = parseInt(found[1]);
                status = TestStatus.Fail;
                name = found[2];
                counts.failed++;
            }
            else if (line.match(/^Bail out\!/)) {
                const message = (line.match(/^Bail out\!(.*)/));
                if (message) {
                    exception = message[1].trim();
                }
                break;
            }
            else if (line.match(/^$/)) {
                continue;
            }
            else if (line.match(/^1\.\.\d+/) && i == lines.length - 1) {
                // TODO: capture the plan for validation
                continue;
            }
            else {
                throw new Error(`unknown TAP line ${i + 1}: '${line}'`);
                continue;
            }
            if (isNaN(num)) {
                num = ++testMax;
            }
            else if (num > testMax) {
                testMax = num;
            }
            if ((i + 1) < lines.length && lines[i + 1].match(/^  ---$/)) {
                i++;
                while (i < lines.length && !lines[i + 1].match(/^  ...$/)) {
                    const detail = (lines[i + 1].match(/^  (.*)/));
                    if (!detail) {
                        throw new Error("invalid yaml in test case details");
                    }
                    if (details)
                        details += "\n" + detail[1];
                    else
                        details = detail[1];
                    i++;
                }
                if (i >= lines.length) {
                    throw new Error("truncated yaml in test case details");
                }
                i++;
            }
            cases.push({
                status: status,
                name: name,
                description: description,
                details: details
            });
        }
        suites.push({
            name: suitename,
            cases: cases
        });
        return {
            counts: counts,
            suites: suites,
            exception: exception
        };
    });
}
exports.parseTap = parseTap;
function parseXml(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const parser = util.promisify(xml2js_1.default.parseString);
        const xml = yield parser(data);
        if (!xml.testsuites) {
            throw new Error("expected top-level testsuites node");
        }
        if (!Array.isArray(xml.testsuites.testsuite)) {
            throw new Error("expected array of testsuites");
        }
        const suites = [];
        const counts = {
            passed: 0,
            failed: 0,
            skipped: 0
        };
        for (const testsuite of xml.testsuites.testsuite) {
            const cases = [];
            if (!Array.isArray(testsuite.testcase)) {
                continue;
            }
            for (const testcase of testsuite.testcase) {
                let status = TestStatus.Pass;
                const id = testcase.$.id;
                const classname = testcase.$.classname;
                const name = testcase.$.name;
                const duration = testcase.$.time;
                let details = undefined;
                if (testcase.skipped) {
                    status = TestStatus.Skip;
                    counts.skipped++;
                }
                else if (testcase.failure) {
                    status = TestStatus.Fail;
                    details = testcase.failure[0]._;
                    counts.failed++;
                }
                else {
                    counts.passed++;
                }
                cases.push({
                    status: status,
                    name: classname || name,
                    description: classname ? name : undefined,
                    details: details,
                    duration: duration
                });
            }
            suites.push({
                name: testsuite.$.name,
                timestamp: testsuite.$.timestamp,
                filename: testsuite.$.file,
                cases: cases
            });
        }
        return {
            counts: counts,
            suites: suites
        };
    });
}
exports.parseXml = parseXml;
function parseTapFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const readfile = util.promisify(fs.readFile);
        return parseTap(yield readfile(filename, "utf8"));
    });
}
exports.parseTapFile = parseTapFile;
function parseXmlFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const readfile = util.promisify(fs.readFile);
        return parseXml(yield readfile(filename, "utf8"));
    });
}
exports.parseXmlFile = parseXmlFile;
function parseFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const readfile = util.promisify(fs.readFile);
        const data = yield readfile(filename, "utf8");
        if (data.match(/^TAP version 13\r?\n/) ||
            data.match(/^ok /) ||
            data.match(/^not ok /)) {
            return parseTap(data);
        }
        if (data.match(/^\s*<\?xml[^>]+>\s*<testsuites[^>]*>/) ||
            data.match(/^\s*<testsuites[^>]*>/)) {
            return parseXml(data);
        }
        throw new Error(`unknown test file type for '${filename}'`);
    });
}
exports.parseFile = parseFile;
