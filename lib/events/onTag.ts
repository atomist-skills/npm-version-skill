/*
 * Copyright © 2020 Atomist, Inc.
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

import { EventHandler, log, repository, secret, status } from "@atomist/skill";
import * as fs from "fs-extra";
import { OnTagSubscription } from "../typings/types";

export const handler: EventHandler<OnTagSubscription> = async ctx => {
	const tag = ctx.data.Tag[0];
	const tagName = tag?.name;
	const releaseSemVerRegExp = /^v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
	if (!releaseSemVerRegExp.test(tagName)) {
		return status.success(`Not a semantic version tag: ${tag}`).hidden();
	}

	const repo = tag.commit.repo;
	await ctx.audit.log(`Starting npm Version on ${repo.owner}/${repo.name}`);

	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);

	const repoSlug = `${repo.owner}/${repo.name}`;
	const defaultBranch = repo.defaultBranch || "master";
	const project = await ctx.project.clone(
		repository.gitHub({
			owner: repo.owner,
			repo: repo.name,
			credential,
			branch: defaultBranch,
		}),
	);
	await ctx.audit.log(`Cloned repository ${repoSlug}#${defaultBranch}`);

	try {
		const pjVersion = (await fs.readJson(project.path("package.json")))
			?.version;
		if (pjVersion && pjVersion !== tagName) {
			const reason = `Package version ${pjVersion} already changed from tag ${tagName}`;
			await ctx.audit.log(reason);
			return status.success(reason);
		} else {
			log.debug(`Package version ${pjVersion} equals tag ${tagName}`);
		}
	} catch (e) {
		log.warn(`Failed to read package.json: ${e.message}`);
	}

	try {
		const result = await project.exec("npm", [
			"version",
			"--no-git-tag-version",
			"patch",
		]);
		await ctx.audit.log(
			`Incremented patch level of ${repoSlug}: ${result.stdout.trim()}`,
		);
	} catch (e) {
		const reason = `Failed to increment version patch level of ${repoSlug}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	try {
		await project.exec("git", [
			"commit",
			"--all",
			"--no-verify",
			"--no-post-rewrite",
			"--message=Incrementing version patch level after release",
			"--message=[atomist:generated] [atomist-skill:atomist/npm-version-skill]",
		]);
	} catch (e) {
		const reason = `Failed to commit version change for ${repoSlug}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	const remote = "origin";
	try {
		await project.exec("git", ["push", remote, defaultBranch]);
	} catch (e) {
		const reason = `Failed push version change for ${repoSlug}: ${e.message}`;
		await ctx.audit.log(reason);
		try {
			await ctx.audit.log("Trying again after fetch and rebase");
			await project.exec("git", ["pull", "--rebase", remote]);
			await project.exec("git", ["push", remote, defaultBranch]);
		} catch (e) {
			return status.failure(`${reason}, ${e.message}`);
		}
	}

	const msg = `Incremented version patch level for ${repoSlug}`;
	log.info(msg);
	return status.success(msg);
};
