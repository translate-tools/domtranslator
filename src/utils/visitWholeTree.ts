import { walkNode } from './walkNode';

/**
 * Handle all translatable nodes from elements
 */

export function visitWholeTree(node: Element, callback: (node: Node) => void) {
	walkNode(node, NodeFilter.SHOW_ALL, true, (node) => {
		callback(node);

		if (node instanceof Element) {
			// Handle nodes from opened shadow DOM
			if (node.shadowRoot !== null) {
				for (const child of Array.from(node.shadowRoot.children)) {
					visitWholeTree(child, callback);
				}
			}

			// Handle attributes of element
			for (const attribute of Object.values(node.attributes)) {
				callback(attribute);
			}
		}
	});
}
