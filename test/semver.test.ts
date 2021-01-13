/*
 * Copyright © 2021 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "power-assert";

import { compareVersions, releaseSemanticVersion } from "../lib/semver";

describe("semver", () => {
	describe("compareVersions", () => {
		it("identifies greater versions", () => {
			[
				["2.3.4", "v2.3.3"],
				["2.3.4", "2.3.3"],
				["2.3.4", "v1.2.3"],
				["2.3.4", "1.2.3"],
				["2.3.4", "v1.4.5"],
				["2.3.4", "1.4.5"],
			].forEach(vv => {
				assert(compareVersions(vv[0], vv[1]) === 1);
			});
		});

		it("identifies lesser versions", () => {
			[
				["2.3.4", "v2.3.5"],
				["2.3.4", "2.3.5"],
				["2.3.4", "v3.0.0"],
				["2.3.4", "4.3.2"],
			].forEach(vv => {
				assert(compareVersions(vv[0], vv[1]) === -1);
			});
		});

		it("identifies equal versions", () => {
			[
				["2.3.4", "v2.3.4"],
				["2.3.4", "2.3.4"],
			].forEach(vv => {
				assert(compareVersions(vv[0], vv[1]) === 0);
			});
		});

		it("does not compare non-versions", () => {
			[
				[undefined, "v2.3.4"],
				["2.3.4", undefined],
				[undefined, undefined],
				["junk1", "junk2"],
			].forEach(vv => {
				assert(compareVersions(vv[0], vv[1]) === undefined);
			});
		});
	});

	describe("releaseSemanticVersion", () => {
		it("returns release versions", () => {
			[
				{ t: "2.0.0", v: "2.0.0" },
				{ t: "v2.0.0", v: "2.0.0" },
			].forEach(tv => {
				const r = releaseSemanticVersion(tv.t);
				assert(r === tv.v);
			});
		});

		it("ignores non-release versions", () => {
			[
				undefined,
				"",
				"junk",
				"junk2",
				"junk2.0.0",
				"junk-2.0.0",
				"2junk",
				"2.0.0junk",
				"v2.0.0+build.0",
				"2.0.0+build.0",
				"v2.0.0-pre.1",
				"2.0.0-pre.1",
			].forEach(t => {
				const r = releaseSemanticVersion(t);
				assert(r === undefined);
			});
		});
	});
});
