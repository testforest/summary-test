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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("glob-promise"));
const test_parser_1 = require("./test_parser");
const dashboardUrl = 'http://svg.testforest.io/dashboard.svg';
const passIconUrl = 'http://svg.testforest.io/icon/pass.svg?s=12';
const failIconUrl = 'http://svg.testforest.io/icon/fail.svg?s=12';
const skipIconUrl = 'http://svg.testforest.io/icon/skip.svg?s=12';
const noneIconUrl = 'http://svg.testforest.io/icon/none.svg?s=12';
const footer = `This test report was produced by <a href="https://github.com/testforest/action">TestForest Dashboard</a>.&nbsp; Made with ❤️ in Cambridge by TestForest.`;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pathGlobs = core.getInput("paths", { required: true });
            const outputFile = core.getInput("output", { required: true });
            const showList = core.getInput("show");
            /*
             * Given paths may either be an individual path (eg "foo.xml"), a path
             * glob (eg "**TEST-*.xml"), or may be newline separated (from a multi-line
             * yaml scalar).
             */
            const paths = [];
            for (const path of pathGlobs.split(/\r?\n/)) {
                if (glob.hasMagic(path)) {
                    paths.push(...yield glob.promise(path));
                }
                else {
                    paths.push(path.trim());
                }
            }
            let show = test_parser_1.TestStatus.Fail;
            if (showList) {
                show = 0;
                for (const showName of showList.split(/,\s*/)) {
                    if (showName === "none") {
                        continue;
                    }
                    else if (showName === "all") {
                        show = test_parser_1.TestStatus.Pass | test_parser_1.TestStatus.Fail | test_parser_1.TestStatus.Skip;
                        continue;
                    }
                    const showValue = test_parser_1.TestStatus[showName.replace(/^([a-z])(.*)/, (m, p1, p2) => p1.toUpperCase() + p2)];
                    if (!showValue) {
                        throw new Error(`unknown test type: ${showName}`);
                    }
                    show |= showValue;
                }
            }
            /*
             * Show the inputs for debugging
             */
            if (core.isDebug()) {
                core.debug("Paths to analyze:");
                for (const path of paths) {
                    core.debug(`: ${path}`);
                }
                core.debug(`Output file: ${outputFile === '-' ? "(stdout)" : outputFile}`);
                let showInfo = "Tests to show:";
                if (show === 0) {
                    showInfo += " none";
                }
                for (const showName in test_parser_1.TestStatus) {
                    const showType = Number(showName);
                    if (!isNaN(showType) && (show & showType) == showType) {
                        showInfo += ` ${test_parser_1.TestStatus[showType]}`;
                    }
                }
                core.debug(showInfo);
            }
            /* Analyze the tests */
            const total = {
                counts: { passed: 0, failed: 0, skipped: 0 },
                suites: [],
                exception: undefined
            };
            for (const path of paths) {
                const result = yield (0, test_parser_1.parseFile)(path);
                total.counts.passed += result.counts.passed;
                total.counts.failed += result.counts.failed;
                total.counts.skipped += result.counts.skipped;
                total.suites.push(...result.suites);
            }
            /* Create and write the output */
            let output = dashboardSummary(total);
            if (show) {
                output += dashboardResults(total, show);
            }
            if (outputFile === "-") {
                console.log(output);
            }
            else {
                const writefile = util.promisify(fs.writeFile);
                yield writefile(outputFile, output);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                core.setFailed(error.message);
            }
            else if (error !== null && error !== undefined) {
                core.setFailed(error);
            }
            else {
                core.setFailed("unknown error");
            }
        }
    });
}
function dashboardSummary(result) {
    const count = result.counts;
    let summary = "";
    if (count.passed > 0) {
        summary += `${count.passed} passed`;
    }
    if (count.failed > 0) {
        summary += `${summary ? ', ' : ''}${count.failed} failed`;
    }
    if (count.skipped > 0) {
        summary += `${summary ? ', ' : ''}${count.skipped} skipped`;
    }
    return `<img src="${dashboardUrl}?p=${count.passed}&f=${count.failed}&s=${count.skipped}" alt="${summary}">`;
}
function dashboardResults(result, show) {
    let table = "<table>";
    let count = 0;
    let title;
    if (show == test_parser_1.TestStatus.Fail) {
        title = "Test failures";
    }
    else if (show === test_parser_1.TestStatus.Skip) {
        title = "Skipped tests";
    }
    else if (show === test_parser_1.TestStatus.Pass) {
        title = "Passing tests";
    }
    else {
        title = "Test results";
    }
    table += `<tr><th align="left">${title}:</th></tr>`;
    for (const suite of result.suites) {
        for (const testcase of suite.cases) {
            if (show != 0 && (show & testcase.status) == 0) {
                continue;
            }
            table += "<tr><td>";
            if (testcase.status == test_parser_1.TestStatus.Pass) {
                table += `<img src="${passIconUrl}" alt="">&nbsp; `;
            }
            else if (testcase.status == test_parser_1.TestStatus.Fail) {
                table += `<img src="${failIconUrl}" alt="">&nbsp; `;
            }
            else if (testcase.status == test_parser_1.TestStatus.Skip) {
                table += `<img src="${skipIconUrl}" alt="">&nbsp; `;
            }
            table += testcase.name;
            if (testcase.description) {
                table += ": ";
                table += testcase.description;
            }
            if (testcase.details) {
                table += "<br/><pre><code>";
                table += testcase.details;
                table += "</code></pre>";
            }
            table += "</td></tr>\n";
            count++;
        }
    }
    table += `<tr><td><sub>${footer}</sub></td></tr>`;
    table += "</table>";
    if (count == 0)
        return "";
    return table;
}
run();
