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
	translatableAttributes?: string[];
};

export const configureTranslatableNodePredicate = (config: NodesFilterOptions = {}) => {
	const { ignoredSelectors = [] } = config;
	const translatableAttributes = new Set(config.translatableAttributes);

	return (node: Node) => {
		let nearestElement: Element | null = null;

		// Check node type and filters for its type
		if (node instanceof Element) {
			nearestElement = node;
		} else if (node instanceof Attr) {
			if (!translatableAttributes.has(node.name)) {
				return false;
			}

			nearestElement = node.ownerElement;
		} else if (node instanceof Text) {
			nearestElement = node.parentElement;
		}

		if (!nearestElement) return false;

		const isNotTranslatable = ignoredSelectors.some(
			(selector) =>
				nearestElement.matches(selector) || nearestElement.closest(selector),
		);
		return !isNotTranslatable;
	};
};
