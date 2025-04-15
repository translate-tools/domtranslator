import { nodeExplore } from './nodeExplore';

/**
 * Handle all translatable nodes from element
 * Element, Attr, Text
 */

export function handleTree(node: Element, callback: (node: Node) => void) {
	nodeExplore(node, NodeFilter.SHOW_ALL, true, (node) => {
		callback(node);

		if (node instanceof Element) {
			// Handle nodes from opened shadow DOM
			if (node.shadowRoot !== null) {
				for (const child of Array.from(node.shadowRoot.children)) {
					handleTree(child, callback);
				}
			}

			// Handle attributes of element
			for (const attribute of Object.values(node.attributes)) {
				callback(attribute);
			}
		}
	});
}
