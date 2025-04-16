import { DomNodeTranslator } from './DomNodeTranslator';
import { LazyTranslator } from './LazyTranslator';
import { InnerConfig } from './NodesTranslator';
import { handleTree } from './utils/handleTree';
import { isIntersectingNode } from './utils/isIntersectingNode';

type TranslationManagerConfig = {
	config: InnerConfig;
	domTranslationProcessor: DomNodeTranslator;
	lazyTranslator: LazyTranslator;
};

/**
 * Class choose translation strategy: lazy or immediate.
 */
export class TranslationManager {
	private readonly config: InnerConfig;
	private readonly domTranslationProcessor: DomNodeTranslator;
	private readonly lazyTranslator: LazyTranslator;

	constructor({
		config,
		domTranslationProcessor,
		lazyTranslator,
	}: TranslationManagerConfig) {
		this.config = config;
		this.domTranslationProcessor = domTranslationProcessor;
		this.lazyTranslator = lazyTranslator;
	}

	public getNodeData(node: Node) {
		return this.domTranslationProcessor.getOriginalNodeText(node);
	}

	public updateNode(node: Node) {
		this.domTranslationProcessor.updateNode(node);
	}

	public isNodeStorageHas(node: Node) {
		return this.domTranslationProcessor.has(node);
	}

	public addNode(node: Node) {
		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)
		if (node instanceof Element) {
			handleTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.config.isTranslatableNode(node)) {
					this.addNode(node);
				}
			});
			return;
		}

		// Ignore lazy translation for non-intersecting nodes and translate it immediately
		if (this.config.lazyTranslate && this.tryLazyTranslate(node)) {
			return;
		}

		this.domTranslationProcessor.addNode(node);
	}

	public deleteNode(node: Node) {
		this.domTranslationProcessor.deleteNode(node);

		if (node instanceof Element) {
			this.lazyTranslator.stopObserving(node);
		}
	}

	private tryLazyTranslate(node: Node) {
		// Lazy translate when own element intersect viewport
		// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)
		const isAttachedToDOM = node.getRootNode() !== node;
		const observableNode =
			node instanceof Attr ? node.ownerElement : node.parentElement;

		if (
			isAttachedToDOM &&
			observableNode !== null &&
			isIntersectingNode(observableNode)
		) {
			this.lazyTranslator.startObserving(observableNode);
			return true;
		}
		return false;
	}
}
