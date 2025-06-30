import { NodesIntersectionObserver } from './NodesIntersectionObserver';
import { NodeTranslationState } from './NodesTranslator';
import { DOMProcessor, ProcessedNodeCallback, StateStorage } from './types';
import { isElementNode } from './utils/nodes';
import { visitWholeTree } from './utils/visitWholeTree';

export interface IDomTranslator extends DOMProcessor, StateStorage<NodeTranslationState> {
	restore(node: Node, callback?: (node: Node) => void): void;
}

/**
 * Translates DOM tree with filtering and optionally in lazy mode
 */
export class DOMTranslator implements IDomTranslator {
	private readonly nodesProcessor;
	private readonly nodesIntersectionObserver;
	private readonly filter;

	constructor({
		nodesProcessor,
		nodesIntersectionObserver,
		filter,
	}: {
		nodesProcessor: DOMProcessor & StateStorage<NodeTranslationState>;

		/**
		 * If is provided, nodes can be translated delayed - after intersect the viewport
		 */
		nodesIntersectionObserver?: NodesIntersectionObserver;

		/**
		 * Determines which nodes should be translated
		 */
		filter?: (node: Node) => boolean;
	}) {
		this.nodesProcessor = nodesProcessor;
		this.nodesIntersectionObserver = nodesIntersectionObserver;
		this.filter = filter;
	}

	/**
	 * Translates DOM tree.
	 *
	 * If passed Element, all nested nodes (like Text, Attr, etc.) will be processed recursively.
	 *
	 * @param callback - Fires for each node, once it has been translated. Target node is passed as first argument
	 */
	public process(node: Node, callback?: ProcessedNodeCallback) {
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
						this.nodesProcessor.process(node, callback);
					});
					return;
				}
			}

			// translate immediately
			this.nodesProcessor.process(node, callback);
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
	 * Restores the original nodes values in passed tree
	 *
	 * @param callback - Fires for each node, once it has been restored. Target node is passed as first argument
	 */
	public restore(node: Node, callback?: (node: Node) => void) {
		const restore = (node: Node) => {
			if (this.nodesIntersectionObserver) {
				this.nodesIntersectionObserver.unobserve(node);
			}

			this.nodesProcessor.restore(node);

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
	public update(node: Node, callback?: ProcessedNodeCallback) {
		this.nodesProcessor.update(node, callback);
	}

	public has(node: Node) {
		return this.nodesProcessor.has(node);
	}

	public getState(node: Node) {
		return this.nodesProcessor.getState(node);
	}
}
