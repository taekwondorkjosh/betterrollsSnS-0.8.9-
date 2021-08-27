import { BRSettings } from "./settings.js";
import { BetterRollsChatCard } from "./chat-message.js";
import { addItemSheetButtons, BetterRolls } from "./betterrollsSnS.js";
import { ItemUtils, Utils } from "./utils/index.js";
import { addBetterRollsContent } from "./item-tab.js";
import { patchCoreFunctions } from "./patching/index.js"
import { migrate } from "./migration.js";

// Attaches BetterRolls to actor sheet
Hooks.on("renderActorSheet5e", (app, html, data) => {
	const triggeringElement = ".item .item-name h4";
	const buttonContainer = ".item-properties";

	// this timeout allows other modules to modify the sheet before we do
	setTimeout(() => {
		if (game.settings.get("betterrollsSnS", "rollButtonsEnabled")) {
			addItemSheetButtons(app.object, html, data, triggeringElement, buttonContainer)
		}
	}, 0);
});

// Attaches BetterRolls to item sheet
Hooks.on("renderItemSheet5e", (app, html, data) => {
	addBetterRollsContent(app, html, data);
});

Hooks.once("init", () => {
	BRSettings.init();
	patchCoreFunctions();

	// Setup template partials
	const prefix = "modules/betterrollsSnS/templates"
	loadTemplates([
		`${prefix}/red-damage-crit.html`
	]);
});

Hooks.on("ready", async () => {
	await migrate();

	// Make a combined damage type array that includes healing
	const sns = CONFIG.SNS;
	CONFIG.betterRollsSnS.combinedDamageTypes = mergeObject(duplicate(sns.damageTypes), sns.healingTypes);

	// Updates crit text from the dropdown.
	let critText = BRSettings.critString;
	if (critText.includes("brSnS.critString")) {
		critText = i18n(critText);
		game.settings.set("betterrollsSnS", "critString", critText);
	}

	// Set up socket
	game.socket.on("module.betterrollsSnS", (data) => {
		if (data?.action === "roll-sound") {
			Utils.playDiceSound();
		}
	});

	// Initialize Better Rolls
	window.BetterRolls = BetterRolls();
	Hooks.call("readyBetterRolls");
});

// Create flags for item when it's first created
Hooks.on("preCreateItem", (item) => ItemUtils.ensureFlags(item));

// Modify context menu for damage rolls (they break)
Hooks.on("getChatLogEntryContext", (html, options) => {
	let contextDamageLabels = [
		game.i18n.localize("SNS.ChatContextDamage"),
		game.i18n.localize("SNS.ChatContextHealing"),
		game.i18n.localize("SNS.ChatContextDoubleDamage"),
		game.i18n.localize("SNS.ChatContextHalfDamage")
	];

	for (let i=options.length-1; i>=0; i--) {
		let option = options[i];
		if (contextDamageLabels.includes(option.name)) {
			option.condition = li => canvas.tokens.controlled.length && li.find(".dice-roll").length && !li.find(".red-full").length;
		}
	}
});

// Bind to any newly rendered chat cards at runtime
// For whatever reason, this callback is sometimes called with unattached html elements
Hooks.on("renderChatMessage", BetterRollsChatCard.bind);
Hooks.on("getChatLogEntryContext", BetterRollsChatCard.addOptions);
