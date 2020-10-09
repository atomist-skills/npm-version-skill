# `atomist/npm-version-skill`

<!---atomist-skill-description:start--->

Increment the version patch level of an NPM package after its release

<!---atomist-skill-description:end--->

---

<!---atomist-skill-readme:start--->

## What it's useful for

In a typical release flow for NPM packages, you will increment the patch level
of the package version after releasing. This skill facilitates the release flow
by automating the incrementing of the version patch level after release.

## How it works

When a tag is pushed to a selected repository that looks like a release
[semantic version][semver], this skill checks out the current tip of the default
branch, increments the NPM package version patch level, and then commits and
pushes the change.

[semver]: https://semver.org/ "Semantic Versioning"

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist]. Need Help? [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ "Atomist - How Teams Deliver Software"
[slack]: https://join.atomist.com/ "Atomist Community Slack"
