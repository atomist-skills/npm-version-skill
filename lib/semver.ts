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

import * as semver from "semver";

/**
 * Return a clean release semantic version if provided one,
 * `undefined` otherwise.
 */
export function releaseSemanticVersion(
	v: string | undefined,
): string | undefined {
	if (!v) {
		return undefined;
	}
	const sv = semver.parse(v);
	if (!sv || sv.prerelease?.length > 0 || sv.build?.length > 0) {
		return undefined;
	}
	return semver.clean(v);
}

/**
 * Return 0 if `v1 === v2`, -1 if `v1 < v2`, 1 if `v1 > v2`. If either
 * version fails to parse, it returns `undefined`.
 */
export function compareVersions(
	v1: string | undefined,
	v2: string | undefined,
): number | undefined {
	if (!v1 || !v2) {
		return undefined;
	}
	try {
		return semver.compare(v1, v2);
	} catch (e) {
		return undefined;
	}
}
