Inventory = {
	toSave: ['items'],

	slotsPerItem: 5,

	items: {},

	init: function() {
		this.items = loadItems();
		this.setupButtons();

		$('.forge-container').click(function() {
			Forge.addFill(Forge.fillOnClick);
			Forge.createFillParticle('+' + formatNumber(Forge.fillOnClick));
		});
	},

	postLoad: function() {
		for (var key in this.items) {
			this.items[key].update();
		}
	},

	update: function() {
		this.updateButtons();
	},

	setupButtons: function() {
		var htmlStr = '';
		var storeHtmlStr = '';
		for (var key in this.items) {
			var item = this.items[key];
			htmlStr += item.getButtonHtml();
			storeHtmlStr += item.getStoreButtonHtml() + '<br>';
		}
		$('.inventory').html(htmlStr);
		$('.recipes').html(storeHtmlStr);
	},

	updateButtons: function() {
		for (var key in this.items) {
			var item = this.items[key];
			item.updateButtons();
		}
	},

	getItem: function(itemName) {
		return this.items[itemName];
	},

	useItem: function(itemName) {
		var item = this.getItem(itemName);
		if (item && item.count > 0 && item.onUse) {
			item.count -= 1;
			item.onUse();
			this.updateButtons();
		}
	},

	tryPurchase: function(itemName) {
		this.getItem(itemName).tryPurchase();
	}
};

function ItemDef(data) {
	this.toSave = ['count'];

	this.name = data.name || '';
	this.displayName = data.displayName || data.name || '';
	this.data = data.data || null;
	this.onUse = data.onUse || null;
	this.count = data.count || 0;
	this.isCountLimited = (data.isCountLimited !== undefined ? data.isCountLimited : true);
	this.maxPerInvSlot = data.maxPerInvSlot || 1;

	this.storeName = data.storeName || data.displayName || data.name || '';
	this.baseCost = data.baseCost || 100;
	this.currency = data.currency || 'forge';

	this.getButtonHtml = function() {
		return getButtonHtml("Inventory.useItem('" + this.name + "')",
			'<b>' + this.displayName + '</b>: <span id="count"></span>' +
			(this.isCountLimited ? ' / <span id="max-count"></span>' : ''),
			this.name + '-inv-button'
		);
	};

	this.getStoreButtonHtml = function() {
		return getButtonHtml("Inventory.tryPurchase('" + this.name + "')",
			'<b>' + this.storeName + '</b><br /><span id="cost"></span> ' + getIconHtml(this.currency),
			this.name + '-button'
		);
	};

	this.updateButtons = function() {
		var id = '#' + this.name + '-inv-button';
		$(id).toggle(this.isVisible());
		$(id + ' #count').text(formatNumber(this.count));
		$(id + ' #max-count').text(formatNumber(this.maxItemCount()));

		var storeId = '#' + this.name + '-button';
		$(storeId).toggleClass('inactive', !this.canMakeMore());
		$(storeId + ' span #cost').text(formatNumber(this.getCost()));
	};

	this.maxItemCount = function() {
		return this.maxPerInvSlot * Inventory.slotsPerItem;
	};

	this.isItemMaxed = function() {
		return this.isCountLimited && this.count >= this.maxItemCount();
	};

	this.isVisible = function() {
		return this.onUse !== null && (this.count > 0);
	};

	this.update = data.update || function() {};

	this.tryPurchase = function() {
		var cost = this.getCost();
		if (this.canAfford()) {
			if (this.isLimitReached()) {
				Forge.createFillParticle('MAXED');
			}
			else {
				Player[this.currency] -= cost;
				this.onPurchase();

				Inventory.updateButtons();
			}
		}
	};

	this.onPurchase = function() {
		this.count += 1;
		this.update();

		if (this.isLimitReached()) {
			this.count = this.maxItemCount();
			Forge.createFillParticle('MAXED');
		}
	};

	this.getCost = data.getCost || function() {
		return this.baseCost;
	};

	this.canAfford = function() {
		return this.getCost() <= Player[this.currency];
	};

	this.isLimitReached = data.isLimitReached || function() {
		return this.isItemMaxed();
	};

	this.canMakeMore = function() {
		return AdventureScreen.isOpen('store') && this.canAfford() && !this.isLimitReached();
	};
}

function PotionDef(data) {
	this.__proto__ = new ItemDef(data);
	this.onUse = function() {
		Player.addHealth(Math.floor(this.data.healAmount * Player.itemEfficiency.value()));
	};
}
