import { LazyTranslator } from './LazyTranslator';
import { InnerConfig, TranslatorInterface } from './types';
import { isInViewport } from './utils/isInViewport';
import { nodeExplore } from './utils/nodeExplore';

interface NodeData {
	/**
	 * Unique node identifier
	 */
	id: number;

	/**
	 * Each node update should increase the value
	 */
	updateId: number;

	/**
	 * Contains `updateId` value at time when start node translation
	 */
	translateContext: number;

	/**
	 * Original node text, before start translation
	 * Contains `null` for node that not been translated yet
	 */
	originalText: null | string;

	/**
	 * Priority to translate node. The bigger the faster will translate
	 */
	priority: number;
}

/**
 * Class for storage DOM element and managed translation elements (revert translate, translate only translateble node)
 */
export class Nodes {
	private readonly translateCallback: TranslatorInterface;
	private readonly config: InnerConfig;

	private readonly lazyTranslator: LazyTranslator;

	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();

	constructor(translateCallback: TranslatorInterface, config: InnerConfig) {
		this.translateCallback = translateCallback;

		this.config = config;

		this.lazyTranslator = new LazyTranslator(this.handleNode, this.config);
	}

	public getNodeData(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) return null;

		const { originalText } = nodeData;
		return { originalText };
	}

	public isNodeStorageHas(attribute: Attr) {
		return this.nodeStorage.has(attribute);
	}

	private isTranslatableNode(targetNode: Node) {
		return this.config.isTranslatableNode(targetNode);
	}

	public handleNode = (node: Node) => {
		if (this.nodeStorage.has(node)) return;

		// Skip empthy text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		const priority = this.getNodeScore(node);

		this.nodeStorage.set(node, {
			id: this.idCounter++,
			updateId: 1,
			translateContext: 0,
			originalText: null,
			priority,
		});

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

		this.lazyTranslator.lazyTranslationHandler(node);

		// Add to storage
		// this.handleNode(node);
		// console.log('call handle');
	}

	public deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element) {
			// Delete all attributes and inner nodes
			if (!onlyTarget) {
				this.handleTree(node, (node) => {
					this.deleteNode(node, true);
				});
			}

			this.lazyTranslator.stopLazyTranslation(node);
		}

		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			// Restore original text if text been replaced
			if (nodeData.originalText !== null) {
				node.nodeValue = nodeData.originalText;
			}
			this.nodeStorage.delete(node);
		}
	}

	// Updates never be lazy
	public updateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			nodeData.updateId++;
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
