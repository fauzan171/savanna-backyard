import type { Preview } from "@storybook/react";
import "../src/react-app/index.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			disable: true, // We use themes addon instead
		},
	},
	decorators: [
		(Story) => (
			<div className="p-4 min-h-[200px]">
				<Story />
			</div>
		),
	],
};

export default preview;
