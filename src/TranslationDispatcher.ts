import { DOMNodesTranslator, NodeTranslatedCallback } from './DOMNodesTranslator';
import { NodesIntersectionObserver } from './lib/NodesIntersectionObserver';
import { visitWholeTree } from './utils/visitWholeTree';

export type TranslatableNodePredicate = (node: Node) => boolean;

/**
 * Coordinates the DOM nodes translation process.
 * Chooses between lazy and immediate translation; defaults to immediate if not provided.
 */
export class TranslationDispatcher {
	private readonly filter;
	private readonly nodesTranslator;
	private readonly nodeIntersectionObserver;

	constructor({
		nodesTranslator: nodesTranslator,
		filter,
		nodeIntersectionObserver,
	}: {
		nodesTranslator: DOMNodesTranslator;
		filter?: TranslatableNodePredicate;
		/**
		 * If nodeIntersectionObserver is provided, nodes can be translated delayed - after intersect the viewport
		 */
		nodeIntersectionObserver?: NodesIntersectionObserver;
	}) {
		this.filter = filter;
		this.nodesTranslator = nodesTranslator;
		this.nodeIntersectionObserver = nodeIntersectionObserver || null;
	}

	/**
	 * Translates the node and all its nested translatable nodes (Text, Attr, etc.)
	 *
	 * @param callback - Optional. Called asynchronously for each translated node, in the same order as nodes are translated.
	 */
	public translateNode(node: Node, callback?: NodeTranslatedCallback) {
		// Handle text nodes and attributes
		const translateSingleNode = (node: Node) => {
			if (this.filter && !this.filter(node)) return;

			// translate later if possible
			if (this.nodeIntersectionObserver) {
				// Check that the node is attached to the DOM. This means the node is accessible by traversing the current DOM
				// This check is necessary to avoid lazy translation for nodes that are detached from the DOM,
				// since they potentially may never intersect with the viewport

				const isAttachedToDOM = node.getRootNode() !== node;
				if (isAttachedToDOM) {
					this.nodeIntersectionObserver.observe(node, () => {
						this.nodesTranslator.translateNode(node, callback);
					});
					return;
				}
			}

			// translate immediately
			this.nodesTranslator.translateNode(node, callback);
		};

		// Translate all nodes which element contains (text nodes and attributes of current and inner elements)
		if (node instanceof Element) {
			visitWholeTree(node, (node) => {
				if (node instanceof Element) return;
				translateSingleNode(node);
			});
		} else {
			translateSingleNode(node);
		}
	}

	/**
	 * Restores the original node text.
	 * For elements, restores each child node (Text, Attr, etc.)
	 *
	 * @param callback - Optional. Called synchronously after each individual node is restored
	 */
	public restoreNode(node: Node, callback?: (node: Node) => void) {
		const restoreSingleNode = (node: Node) => {
			if (this.nodeIntersectionObserver) {
				this.nodeIntersectionObserver.unobserve(node);
			}
			this.nodesTranslator.restoreNode(node);

			if (callback) callback(node);
		};

		// restore all nested nodes
		if (node instanceof Element) {
			visitWholeTree(node, restoreSingleNode);
		} else {
			restoreSingleNode(node);
		}
	}

	/**
	 * Re-translates a node after it has been modified.
	 *
	 * @param callback - Optional. Called after the node has been re-translated.
	 */
	public updateNode(node: Node, callback?: NodeTranslatedCallback) {
		this.nodesTranslator.updateNode(node, callback);
	}

	public hasNode(node: Node) {
		return this.nodesTranslator.hasNode(node);
	}
}
