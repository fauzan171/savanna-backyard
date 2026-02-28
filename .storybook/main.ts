import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
	stories: ["../src/react-app/**/*.mdx", "../src/react-app/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		"@storybook/addon-themes",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal: async (config) => {
		// Add path alias support
		config.resolve = config.resolve || {};
		config.resolve.alias = {
			...config.resolve.alias,
			"@": path.resolve(__dirname, "../src"),
		};

		return config;
	},
};

export default config;
