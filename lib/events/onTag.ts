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

import {
	EventHandler,
	git,
	log,
	repository,
	secret,
	status,
	subscription,
} from "@atomist/skill";
import * as fs from "fs-extra";

import { compareVersions, releaseSemanticVersion } from "../semver";

export const handler: EventHandler<subscription.types.OnTagSubscription> = async ctx => {
	const tag = ctx.data.Tag[0];
	const tagName = tag?.name;
	const tagVersion = releaseSemanticVersion(tagName);
	if (!tagVersion) {
		return status
			.success(`Not a release semantic version tag: ${tagName}`)
			.hidden();
	}

	const repo = tag.commit.repo;
	const repoSlug = `${repo.owner}/${repo.name}`;
	log.info(`Starting npm Version on ${repoSlug}`);

	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);

	const defaultBranch = repo.defaultBranch || "master";
	const project = await ctx.project.clone(
		repository.gitHub({
			owner: repo.owner,
			repo: repo.name,
			credential,
			branch: defaultBranch,
		}),
	);
	log.info(`Cloned repository ${repoSlug}#${defaultBranch}`);

	try {
		await git.persistChanges({
			branch: defaultBranch,
			editors: [
				async () => {
					try {
						const pjPath = project.path("package.json");
						const pjContents = await fs.readJson(pjPath);
						const pjVersion = pjContents?.version;
						if (compareVersions(pjVersion, tagVersion) === 1) {
							log.info(
								`Package version ${pjVersion} is greater than tag ${tagVersion}`,
							);
							return undefined;
						}
					} catch (e) {
						log.warn(`Failed to read package.json: ${e.message}`);
					}

					await project.exec("npm", [
						"version",
						"--allow-same-version",
						"--no-git-tag-version",
						tagVersion,
					]);
					log.info(
						`Set package version of ${repoSlug} to tag version ${tagVersion}`,
					);

					const result = await project.exec("npm", [
						"version",
						"--no-git-tag-version",
						"patch",
					]);
					log.info(
						`Incremented patch level of ${repoSlug}: ${result.stdout.trim()}`,
					);

					return (
						`Incrementing version patch level after release\n\n` +
						`[atomist:generated] [atomist-skill:${ctx.skill.namespace}/${ctx.skill.name}]`
					);
				},
			],
			project,
		});
	} catch (e) {
		const reason = `Failed to increment version: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}

	const msg = `Incremented version patch level for ${repoSlug}`;
	log.info(msg);
	return status.success(msg);
};
