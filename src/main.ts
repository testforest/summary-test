import * as core from "@actions/core"

async function run(): Promise<void> {
  try {
    const paths = core.getInput("paths")

    core.info(paths)
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
