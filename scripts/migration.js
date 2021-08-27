import { i18n, Utils } from "./utils/index.js";

export async function migrate() {
	// todo: not implemented, will be implemented in a future release
}

let messageShown = false;
function showMigrationMessage() {
	if (!messageShown) {
		const version = Utils.getVersion();
		ui.notifications.info(i18n("brSnS.migrating", { version }));
		messageShown = true;
	}
}

export async function migrateChatMessage(message) {
	if (!game.user.isGM) return;
	const brFlags = message.data.flags.betterrollsSnS;
	if (!brFlags) return false;

	let updated = false;
	const brVersion = brFlags.version ?? "1.0";

	// Migrate to 1.4 (damage entries are now grouped)
	if (isNewerVersion("2.0.0", brVersion)) {
		updated = true;
		migrateTo_1_4(brFlags);
		brFlags.version = "2.0.0";
	}

	// Migrate to 1.5 (update uuids for Foundry 0.8)
	if (isNewerVersion("2.0.0", brVersion)) {
		brFlags.version = "2.0.0";
		migrateTo_1_5(brFlags);
		brFlags.version = "2.0.0";
	}

	if (updated) {
		showMigrationMessage();
		await message.update({
			"flags.betterrollsSnS": duplicate(brFlags)
		}, { diff: false });
	}

	return updated;
}

function migrateTo_1_4(brFlags) {
	let currentId = (Math.max(...brFlags.entries.map((e) => Number(e.id))) ?? 0) + 1;
	let lastAttack = null;
	let lastJunction = null;
	const newEntries = [];
	for (const entry of brFlags.entries) {
		if (entry.type === "multiroll") lastAttack = entry;
		if (["multiroll", "button-save"].includes(entry.type)) {
			lastJunction = entry;
		}

		entry.id = `${entry.id}`;
		if (entry.group) entry.group = `${entry.group}`;
		if (entry.attackId) entry.attackId = `${entry.attackId}`;
		let lastEntry = newEntries[newEntries.length - 1];
		if (["damage", "crit"].includes(entry.type)) {
			if (lastEntry?.type !== "damage-group") {
				lastEntry = {
					id: `${currentId++}`,
					type: "damage-group",
					attackId: lastAttack?.id,
					isCrit: lastAttack?.isCrit || entry?.isCrit,
					forceCrit: lastJunction?.forceCrit,
					prompt: brFlags.params.prompt[entry.group],
					entries: [],
				}

				newEntries.push(lastEntry);
			}

			entry.group = lastEntry.id;
			lastEntry.entries.push(entry);
		} else {
			newEntries.push(entry);
		}
	}
}

function migrateTo_1_5(brFlags) {
	const parts = brFlags.tokenId?.split(".");
	if (parts?.length !== 2) return;

	const [sceneId, tokenId] = parts;
	brFlags.tokenId = `Scene.${sceneId}.Token.${tokenId}`;
}
