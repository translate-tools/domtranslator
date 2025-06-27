import { DOMNodesTranslator, NodeTranslatedCallback } from './DOMNodesTranslator';
import { NodesIntersectionObserver } from './lib/NodesIntersectionObserver';
import { isElementNode } from './utils/nodes';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the DOM nodes translation process.
 * Chooses between lazy and immediate translation; defaults to immediate if not provided.
 */
export class TranslationDispatcher {
	private readonly filter;
	private readonly nodesTranslator;
	private readonly nodesIntersectionObserver;

	constructor({
		nodesTranslator,
		filter,
		nodesIntersectionObserver,
	}: {
		nodesTranslator: DOMNodesTranslator;
		/**
		 * Determines which nodes should be translated
		 */
		filter?: TranslatableNodePredicate;
		/**
		 * If is provided, nodes can be translated delayed - after intersect the viewport
		 */
		nodesIntersectionObserver?: NodesIntersectionObserver;
	}) {
		this.filter = filter;
		this.nodesTranslator = nodesTranslator;
		this.nodesIntersectionObserver = nodesIntersectionObserver;
	}

	/**
	 * Translates the node and all its nested translatable nodes (Text, Attr, etc.)
	 *
	 * @param callback - Called asynchronously after each node is translated, in the order of translation.
	 * The callback receives the translated node as argument.
	 */
	public translateNode(node: Node, callback?: NodeTranslatedCallback) {
		// Handle text nodes and attributes
		const translate = (node: Node) => {
			if (this.filter && !this.filter(node)) return;

			// translate later if possible
			if (this.nodesIntersectionObserver) {
				// Check that the node is attached to the DOM. This means the node is accessible by traversing the current DOM
				// This check is necessary to avoid lazy translation for nodes that are detached from the DOM,
				// since they potentially may never intersect with the viewport

				const isAttachedToDOM = node.getRootNode() !== node;
				if (isAttachedToDOM) {
					this.nodesIntersectionObserver.observe(node, (node) => {
						this.nodesTranslator.translateNode(node, callback);
					});
					return;
				}
			}

			// translate immediately
			this.nodesTranslator.translateNode(node, callback);
		};

		// Translate all nodes which element contains (text nodes and attributes of current and inner elements)
		if (isElementNode(node)) {
			visitWholeTree(node, (node) => {
				if (isElementNode(node)) return;
				translate(node);
			});
		} else {
			translate(node);
		}
	}

	/**
	 * Restores the original node text. For elements, restores each child node (Text, Attr, etc.)
	 *
	 * @param callback - Called synchronously after each node is restored, receiving the restored node
	 */
	public restoreNode(node: Node, callback?: (node: Node) => void) {
		const restore = (node: Node) => {
			if (this.nodesIntersectionObserver) {
				this.nodesIntersectionObserver.unobserve(node);
			}
			this.nodesTranslator.restoreNode(node);

			if (callback) callback(node);
		};

		// restore all nested nodes
		if (isElementNode(node)) {
			visitWholeTree(node, (node) => {
				if (isElementNode(node)) return;
				restore(node);
			});
		} else {
			restore(node);
		}
	}

	/**
	 * Re-translates a node after it has been modified.
	 *
	 * @param callback - Called asynchronously with the translated node once the update is complete
	 */
	public updateNode(node: Node, callback?: NodeTranslatedCallback) {
		this.nodesTranslator.updateNode(node, callback);
	}

	public hasNode(node: Node) {
		return this.nodesTranslator.hasNode(node);
	}
}
