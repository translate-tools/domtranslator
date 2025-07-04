import { isInViewport } from './isInViewport';

export const isElementNode = (node: Node): node is Element =>
	node.nodeType === Node.ELEMENT_NODE;
export const isAttributeNode = (node: Node): node is Attr =>
	node.nodeType === Node.ATTRIBUTE_NODE;
export const isTextNode = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

export const searchParent = (
	node: Node,
	callback: (value: Node) => boolean,
	includeSelf = false,
) => {
	// Check self
	if (includeSelf && callback(node)) {
		return node;
	}

	// Check parents
	let lookingNode: Node | null = node;
	while ((lookingNode = lookingNode.parentNode)) {
		if (callback(lookingNode)) {
			break;
		}
	}
	return lookingNode;
};

export type NodesFilterOptions = {
	ignoredSelectors?: string[];
	attributesList?: string[];
};

/**
 * Configure and return a filter function for `Node` objects.
 * Filter function returns `true` for nodes that match filter and `false` otherwise
 */
export const createNodesFilter = (config: NodesFilterOptions = {}) => {
	// Dedupe rules
	const ignoredSelectors = Array.from(new Set(config.ignoredSelectors));
	const attributesList = new Set(config.attributesList);

	return (node: Node) => {
		let nearestElement: Element | null = null;

		// Check node type and filters for its type
		if (isElementNode(node)) {
			nearestElement = node;
		} else if (isAttributeNode(node)) {
			if (!attributesList.has(node.name)) {
				return false;
			}

			nearestElement = node.ownerElement;
		} else if (isTextNode(node)) {
			nearestElement = node.parentElement;
		}

		if (!nearestElement) return false;

		const isMatchIgnoredSelector = ignoredSelectors.some((selector) => {
			try {
				return (
					nearestElement.matches(selector) || nearestElement.closest(selector)
				);
			} catch {
				return false;
			}
		});

		return !isMatchIgnoredSelector;
	};
};

/**
 * Calculate node priority for translate, the bigger number the important a node text
 */
export function getNodeImportanceScore(node: Node) {
	let score = 0;

	if (isAttributeNode(node)) {
		score += 1;
		const parent = node.ownerElement;
		if (parent && isInViewport(parent)) {
			// Attribute of visible element is important than text of non-visible element
			score += 2;
		}
	} else if (isTextNode(node)) {
		score += 2;
		const parent = node.parentElement;
		if (parent && isInViewport(parent)) {
			// Text of visible element is most important node for translation
			score += 2;
		}
	}

	return score;
}
