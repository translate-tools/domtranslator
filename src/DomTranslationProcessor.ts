import { LazyTranslator } from './LazyTranslator';
import { NodeStorage } from './NodeStorage';
import { InnerConfig, TranslatorInterface } from './NodesTranslator';
import { isInViewport } from './utils/isInViewport';
import { nodeExplore } from './utils/nodeExplore';

export class DomTranslationProcessor {
	private readonly config: InnerConfig;
	private lazyTranslator: LazyTranslator;

	private readonly translateCallback: TranslatorInterface;

	private nodeStorage: NodeStorage;

	constructor(
		config: InnerConfig,
		lazyTranslator: LazyTranslator,
		translateCallback: TranslatorInterface,
		nodeStorage: NodeStorage,
	) {
		this.config = config;
		this.lazyTranslator = lazyTranslator;
		this.translateCallback = translateCallback;
		this.nodeStorage = nodeStorage;
	}

	public isNodeStorageHas(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getNodeData(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) return null;

		const { originalText } = nodeData;
		return { originalText };
	}

	public handleNode = (node: Node) => {
		if (this.isNodeStorageHas(node)) return;

		// Skip empthy text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		const priority = this.getNodeScore(node);

		this.nodeStorage.add(node, priority);

		this.translateNode(node);
	};

	public addNode(node: Node) {
		// Add all nodes which element contains (text nodes and attributes of current and inner elements)
		if (node instanceof Element) {
			this.handleTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.isTranslatableNode(node)) {
					this.addNode(node);
				}
			});

			return;
		}

		// Handle text nodes and attributes

		if (this.lazyTranslator.process(node)) {
			return;
		}

		// Add to storage
		this.handleNode(node);
	}

	public deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element) {
			// Delete all attributes and inner nodes
			if (!onlyTarget) {
				this.handleTree(node, (node) => {
					this.deleteNode(node, true);
				});
			}

			// Unobserve
			this.lazyTranslator.disable(node);
		}

		this.nodeStorage.delete(node);
	}

	// Updates never be lazy
	public updateNode(node: Node) {
		if (this.isNodeStorageHas(node)) {
			this.nodeStorage.update(node);

			this.translateNode(node);
		}
	}

	/**
	 * Call only for new and updated nodes
	 */
	private translateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) {
			throw new Error('Node is not register');
		}

		if (node.nodeValue === null) return;

		// Recursion prevention
		if (nodeData.updateId <= nodeData.translateContext) {
			return;
		}

		const nodeId = nodeData.id;
		const nodeContext = nodeData.updateId;
		return this.translateCallback(node.nodeValue, nodeData.priority).then((text) => {
			const actualNodeData = this.nodeStorage.get(node);
			if (actualNodeData === undefined || nodeId !== actualNodeData.id) {
				return;
			}
			if (nodeContext !== actualNodeData.updateId) {
				return;
			}

			// actualNodeData.translateData = text;
			actualNodeData.originalText = node.nodeValue !== null ? node.nodeValue : '';
			actualNodeData.translateContext = actualNodeData.updateId + 1;
			node.nodeValue = text;
			return node;
		});
	}

	private isTranslatableNode(targetNode: Node) {
		return this.config.isTranslatableNode(targetNode);
	}

	/**
	 * Calculate node priority for translate, the bigger number the importance text
	 */
	private getNodeScore = (node: Node) => {
		let score = 0;

		if (node instanceof Attr) {
			score += 1;
			const parent = node.ownerElement;
			if (parent && isInViewport(parent)) {
				// Attribute of visible element is important than text of non-visible element
				score += 2;
			}
		} else if (node instanceof Text) {
			score += 2;
			const parent = node.parentElement;
			if (parent && isInViewport(parent)) {
				// Text of visible element is most important node for translation
				score += 2;
			}
		}

		return score;
	};

	/**
	 * Handle all translatable nodes from element
	 * Element, Attr, Text
	 */
	private handleTree(node: Element, callback: (node: Node) => void) {
		nodeExplore(node, NodeFilter.SHOW_ALL, true, (node) => {
			callback(node);

			if (node instanceof Element) {
				// Handle nodes from opened shadow DOM
				if (node.shadowRoot !== null) {
					for (const child of Array.from(node.shadowRoot.children)) {
						this.handleTree(child, callback);
					}
				}

				// Handle attributes of element
				for (const attribute of Object.values(node.attributes)) {
					callback(attribute);
				}
			}
		});
	}
}
