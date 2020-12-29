import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { EventEmitter } from 'events';

import App from './app';
import { getAsset } from './assets';
import { textHeightForWidth } from './utils';

export enum DieType {
	D100 = 'd100',
	D20 = 'd20',
	D12 = 'd12',
	D10 = 'd10',
	D8 = 'd8',
	D6 = 'd6',
	D4 = 'd4',
	D1 = 'd1',
}

export type DieConstructorOptions = {
	app: App,
	type: DieType,
	text?: string,
	actor?: Partial<MRE.ActorLike>
}

/** Representation of an individual die. 10cm in diameter by default. */
export class Die extends EventEmitter {
	private app: App;
	private model: MRE.Actor;
	private dropTarget: MRE.Actor;

	private ogScale: MRE.Vector3;
	private hoverScale: MRE.Vector3;

	private _root: MRE.Actor;
	public get root() { return this._root; }

	private _type: DieType;
	public get type() { return this._type; }

	private _label: MRE.Actor;
	public get text() { return this._label.text.contents; }
	public set text(value) {
		this._label.text.contents = value;
		this._label.text.height = textHeightForWidth(value, 0.08, 0.05);
	}

	public get textColor() { return this._label.text.color; }
	public set textColor(value) {
		this._label.text.color = value;
	}

	constructor(options: DieConstructorOptions) {
		super();

		this.app = options.app;
		this._type = options.type;

		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: this.type,
			...options.actor,
			collider: { geometry: { shape: MRE.ColliderType.Sphere, radius: 0.05 }}
		}});
		const labelSwivel = MRE.Actor.Create(this.app.context, { actor: {
			name: "LabelSwivel",
			parentId: this.root.id,
			lookAt: { mode: MRE.LookAtMode.TargetXY }
		}});
		this._label = MRE.Actor.Create(this.app.context, { actor: {
			name: "Label",
			parentId: labelSwivel.id,
			transform: { local: { position: { z: -0.05 }}},
			text: {
				justify: MRE.TextJustify.Center,
				anchor: MRE.TextAnchorLocation.MiddleCenter,
				contents: options.text,
				height: textHeightForWidth(options.text, 0.08, 0.05)
			}
		}});

		this._root.setBehavior(MRE.ButtonBehavior)
			.onHover('enter', user => this.onHover(user))
			.onHover('exit', user => this.offHover(user))
			.onButton('pressed', (user, data) => this.emit('click', user, data));

		// load model
		let modelType = this.type;
		if (modelType === DieType.D100) {
			modelType = DieType.D10;
		}

		getAsset(this.app.context, modelType)
		.then(modelAsset => {
			this.model = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: modelAsset.prefab,
				actor: {
					name: "Model",
					parentId: this.root.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
				}
			});

			/*this.dropTarget = MRE.Actor.Create(this.app.context, { actor: {
				name: "DropTarget",
				parentId: this.root.id,
				transform: { local: { position: { y: 0.1 }}},
				collider: { geometry: { shape: MRE.ColliderType.Box, size: { x: 0.1, y: 0.1, z: 0.01 }}}
			}});
			this.dropTarget.setBehavior(MRE.ButtonBehavior)
				.onHover('enter', u => this.emit('dropHover', u))
				.onButton('pressed', u => this.emit('dropDown', u))
				.onButton('released', u => this.emit('dropUp', u));*/

			return this.model.created();
		})
		.then(() => {
			this.ogScale = this.model.transform.local.scale.clone();
			const hoverFactor = 1.1;
			this.hoverScale = new MRE.Vector3(
				this.ogScale.x * hoverFactor,
				this.ogScale.y * hoverFactor,
				this.ogScale.z * hoverFactor);
		})
		.catch(err => MRE.log.error('app', err));
	}

	public on(event: 'click', handler: MRE.ActionHandler<MRE.ButtonEventData>): this;
	public on(event: 'dropDown', handler: MRE.ActionHandler): this;
	public on(event: 'dropHover', handler: MRE.ActionHandler): this;
	public on(event: 'dropUp', handler: MRE.ActionHandler): this;
	public on(event: 'click' | 'dropDown' | 'dropHover' | 'dropUp', handler: (...args: any[]) => void) {
		return super.on(event, handler);
	}

	public off(event: 'click', handler: MRE.ActionHandler<MRE.ButtonEventData>): this;
	public off(event: 'dropDown', handler: MRE.ActionHandler): this;
	public off(event: 'dropHover', handler: MRE.ActionHandler): this;
	public off(event: 'dropUp', handler: MRE.ActionHandler): this;
	public off(event: 'click' | 'dropDown' | 'dropHover' | 'dropUp', handler: (...args: any[]) => void) {
		return super.off(event, handler);
	}

	private onHover(user: MRE.User) {
		if (!this.model) return;

		if (this.listenerCount('click') > 0) {
			this.model.transform.local.scale = this.hoverScale;
		} else {
			this.model.transform.local.scale = this.ogScale;
		}
	}

	private offHover(user: MRE.User) {
		if (!this.model) return;

		this.model.transform.local.scale = this.ogScale;
	}
}
