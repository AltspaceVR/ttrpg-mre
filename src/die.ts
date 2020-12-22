import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import App from './app';
import { getAsset } from './assets';

export enum DieType {
	D1 = 'd1',
	D4 = 'd4',
	D6 = 'd6',
	D8 = 'd8',
	D10 = 'd10',
	D12 = 'd12',
	D20 = 'd20',
	D100 = 'd100'
}

export type DieOptions = {
	app: App,
	type: DieType,
	label: string,
	actor?: Partial<MRE.ActorLike>
}

export class Die {
	private app: App;
	private type: DieType;
	private _root: MRE.Actor;

	public get root() { return this._root; }

	constructor(options: DieOptions) {
		this.app = options.app;
		this.type = options.type;

		this._root = MRE.Actor.Create(this.app.context, { actor: {
			...options.actor,
			collider: { geometry: { shape: MRE.ColliderType.Sphere, radius: 0.1 }}
		}});
		const labelSwivel = MRE.Actor.Create(this.app.context, { actor: {
			name: "LabelSwivel",
			parentId: this.root.id,
			lookAt: { mode: MRE.LookAtMode.TargetXY }
		}});
		const label = MRE.Actor.Create(this.app.context, { actor: {
			name: "Label",
			parentId: labelSwivel.id,
			transform: { local: { position: { z: -0.05 }}},
			text: {
				height: 0.05,
				justify: MRE.TextJustify.Center,
				anchor: MRE.TextAnchorLocation.MiddleCenter,
				color: MRE.Color3.Red(),
				contents: options.label
			}
		}});

		// load model
		let modelType = this.type;
		if (modelType === DieType.D100) {
			modelType = DieType.D10;
		}

		if (modelType !== DieType.D1) {
			getAsset(this.app.context, modelType)
			.then(asset => {
				MRE.Actor.CreateFromPrefab(this.app.context, {
					prefab: asset.prefab,
					actor: {
						name: "Model",
						parentId: this.root.id,
						transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
					}
				})
			})
			.catch(err => MRE.log.error('app', err));
		}
	}
}
