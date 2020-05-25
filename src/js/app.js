App = {
    web3Provider: null,
    contracts: {},
    account: 0X0,
    loading: false,

    init: async () => {
        return App.initWeb3();
    },

    initWeb3: async () => {
        if(window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            try {
                await window.ethereum.enable();
                App.displayAccountInfo();
                return App.initContract();
            } catch(error) {
                //user denied access
                console.error("Unable to retrieve your accounts! You have to approve this application on Metamask");
            }
        } else if(window.web3) {
            window.web3 = new Web3(web3.currentProvider || "ws://localhost:8545");
            App.displayAccountInfo();
            return App.initContract();
        } else {
            //no dapp browser
            console.log("Non-ethereum browser detected. You should consider trying Metamask");
        }
    },
    
    displayAccountInfo: async () => {
        const accounts = await window.web3.eth.getAccounts();
        App.account = accounts[0];
        $('#account').text(App.account);
        const balance = await window.web3.eth.getBalance(App.account);
        $('#accountBalance').text(window.web3.utils.fromWei(balance, "ether") + " ETH");
    },

    initContract: async () => {
        $.getJSON('MyShop.json', myShopArtifact => {
            App.contracts.MyShop = TruffleContract(myShopArtifact);
            App.contracts.MyShop.setProvider(window.web3.currentProvider);
            App.listenToEvents();
            return App.reloadItems();
        });
    },

    // Listen to events raised from the contract
    listenToEvents: async () => {
        const myShopInstance = await App.contracts.MyShop.deployed();
        if(App.logSellItemEventListener == null) {
            App.logSellItemEventListener = myShopInstance
                .NewItem({fromBlock: '0'})
                .on("data", event => {
                    $('#' + event.id).remove();
                    $('#events').append('<li class="list-group-item" id="' + event.id + '">' + event.returnValues._itemName + ' is for sale</li>');
                    App.reloadItems();
                })
                .on("error", error => {
                    console.error(error);
                });
        }
        if(App.logBuyItemEventListener == null) {
            App.logBuyItemEventListener = myShopInstance
                .NewOrder({fromBlock: '0'})
                .on("data", event => {
                	App.reloadItems();
                    App.reloadOrders();
                })
                .on("error", error => {
                    console.error(error);
                });
        }
        if(App.logAddItemEventListener == null) {
            App.logAddItemEventListener = myShopInstance
                .NewItem({fromBlock: '0'})
                .on("data", event => {
                    App.reloadItems();
                })
                .on("error", error => {
                    console.error(error);
                });
        }
        if(App.logNewBuyerEventListener == null) {
            App.logNewBuyerEventListener = myShopInstance
                .NewBuyer({fromBlock: '0'})
                .on("data", event => {
                    $('#' + event.id).remove();
                    $('#events').append('<li class="list-group-item" id="' + event.id + '">"' + event.returnValues._name + '" is a new buyer </li>');
                })
                .on("error", error => {
                    console.error(error);
                });
        }

        $('.btn-subscribe').hide();
        $('.btn-unsubscribe').show();
    },

    stopListeningToEvents: async () => {
        if(App.logNewBuyerEventListener != null) {
            console.log("unsubscribe from new buyer events");
            await App.logNewBuyerEventListener.removeAllListeners();
            App.logNewBuyerEventListener = null;
        }

        $('.btn-subscribe').show();
        $('.btn-unsubscribe').hide();
    },

    sellItems: async () => {
    	event.preventDefault();
        const itemPriceValue = parseFloat($('#item_price').val());
        const itemPrice = isNaN(itemPriceValue) ? "0" : itemPriceValue.toString();
        const _name = $('#item_name').val();
        const _description = $('#item_description').val();
        const _inventory = $('#item_inventory').val().toString();
        const _price = window.web3.utils.toWei(itemPrice, "ether");
        if(_name.trim() == "" || _price === "0" || _inventory === '0') {
            return false;
        }
        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const transactionReceipt = await myShopInstance.sellItem(
                _name,
                _description,
                _inventory,
                _price,
                {from: App.account, gas: 5000000}
            ).on("transactionHash", hash => {
                console.log("transaction hash", hash);
            });
            console.log("transaction receipt", transactionReceipt);
        } catch(error) {
            console.error(error);
        }
    },
    
    registerBuyer: async () => {
        const _name = $('#buyer_register_name').val();
        const _email = $('#buyer_register_email').val();
        const _pobox = $('#buyer_register_pobox').val();
        if(_name.trim() == "" || _email.trim() == "" || _email.trim() == "") {
            return false;
        }
        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const register = await myShopInstance.registerBuyer(
                _name,
                _email,
                _pobox,
                {from: App.account, gas: 5000000}
            ).on("transactionHash", hash => {
                console.log("transaction hash", hash);
            });
            console.log("Register: ", register);
        } catch(error) {
            console.error(error);
        }
    },
    
    updateItem: async () => {
    	event.preventDefault();
        const itemPriceValue = parseFloat($('#update_item_price').val());
        const itemPrice = isNaN(itemPriceValue) ? "0" : itemPriceValue.toString();
        const _id = $('#update_item_id').val();
        const _name = $('#update_item_name').val();
        const _description = $('#update_item_description').val();
        const _inventory = $('#update_item_inventory').val().toString();
        const _price = window.web3.utils.toWei(itemPrice, "ether");
        if(_id === 0 || _name.trim() == "" || _price === "0" || _inventory === '0') {
            return false;
        }
        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const updatedItem = await myShopInstance.updateItem(
            	_id,
                _name,
                _description,
                _inventory,
                _price,
                {from: App.account, gas: 5000000}
            ).on("transactionHash", hash => {
                console.log("transaction hash", hash);
            });
            console.log("transaction receipt", updatedItem);
            App.reloadItems();
            App.reloadOrders();
        } catch(error) {
            console.error(error);
        }
    },

    buyItem: async () => {
        event.preventDefault();
        console.log($(event.currentTarget));
        // retrieve the item price
        var _itemId = $(event.target).data('id');
        console.log($(event.target).data());
        var _quantity = parseInt($('#buy_item_quantity').val());
        const itemPriceValue = parseFloat($(event.target).data('value')) * _quantity;
        const itemPrice = isNaN(itemPriceValue) ? "0" : itemPriceValue.toString();
        const _price = window.web3.utils.toWei(itemPrice, "ether");
        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const transactionReceipt = await myShopInstance.buyItem(
                _itemId, _quantity, {
                    from: App.account,
                    value: _price,
                    gas: 500000
                }
            ).on("transactionHash", hash => {
                console.log("transaction hash", hash);
            });
            console.log("transaction receipt", transactionReceipt);
        } catch(error) {
            console.error(error);
        }
    },
    
    withDraw: async () => {
        event.preventDefault();
        var address = $('#withdraw_account').val();
        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const withdrawFunds = await myShopInstance.withdrawFunds(
                address,
                {from: App.account, gas: 5000000}
            ).on("transactionHash", hash => {
                console.log("transaction hash", hash);
            });
            App.displayAccountInfo();
            console.log("Withdraw: ", withdrawFunds);
        } catch(error) {
            console.error(error);
        }
    },

    reloadItems: async () => {
        // avoid reentry
        if (App.loading) {
            return;
        }
        App.loading = true;

        // refresh account information because the balance may have changed
        App.displayAccountInfo();

        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const itemIds = await myShopInstance.getItemsForSale();
            $('#itemsRow').empty();
            for(let i = 0; i < itemIds.length; i++) {
                const item = await myShopInstance.items(itemIds[i]);
                App.displayItems(item[0], item[1], item[3], item[4], item[5], item[6]);
            }
            App.loading = false;
        } catch(error) {
            console.error(error);
            App.loading = false;
        }
    },
    
    reloadOrders: async () => {
        if (App.loading) {
            return;
        }
        App.loading = true;

        App.displayAccountInfo();

        try {
            const myShopInstance = await App.contracts.MyShop.deployed();
            const orderIds = await myShopInstance.getOrders();
            $('#ordersRow').empty();
            for(let i = 0; i < orderIds.length; i++) {
                const order = await myShopInstance.orders(orderIds[i]);
                App.displayOrders(order[0], order[1], order[2], order[3]);
            }
            App.loading = false;
        } catch(error) {
            console.error(error);
            App.loading = false;
        }
    },

    displayItems: (id, seller, name, description, inventory, price) => {
        // Retrieve the item placeholder
        const itemsRow = $('#itemsRow');
        const etherPrice = web3.utils.fromWei(price, "ether");

        // Retrieve and fill the item template
        var itemTemplate = $('#itemTemplate');
        itemTemplate.find('.panel-title').text(name);
        itemTemplate.find('.item-description').text(description);
        itemTemplate.find('.item-inventory').text(inventory);
        itemTemplate.find('.item-price').text(etherPrice + " ETH");
        itemTemplate.find('.btn-buy').attr('data-id', id);
        itemTemplate.find('.btn-buy').attr('data-value', etherPrice);
        itemTemplate.find('.btn-buy').attr('setmax', inventory);

        // seller?
        if (seller == App.account) {
            itemTemplate.find('.item-seller').text("You");
            itemTemplate.find('.btn-buy').hide();
            itemTemplate.find('.btn-update').show();
            itemTemplate.find('.btn-update').attr('data', id+','+name+','+etherPrice+','+inventory+','+description);
        } else {
            itemTemplate.find('.item-seller').text(seller);
            itemTemplate.find('.btn-buy').show();
            itemTemplate.find('.btn-update').hide();
            $('#sellbtn').hide()
            $('#withbtn').hide()
        }

        // add this new item
        itemsRow.append(itemTemplate.html());
    },
    
    toggleOrders: () => {
    	if(!$('#ordersRow').is(':visible')) {
			$('#ordersRow').show();
			$('#itemsRow').hide();
			App.reloadOrders();
    	} else {
    		$('#ordersRow').hide();
			$('#itemsRow').show();
			App.reloadItems();
    	}
    },
    
    displayOrders: (id, itemid, quantity, orderFrom) => {
        // Retrieve the order placeholder
        const ordersRow = $('#ordersRow');

        // Retrieve and fill the order template
        var orderTemplate = $('#orderTemplate');
        orderTemplate.find('.order-id').text(id);
        orderTemplate.find('.order-itemid').text(itemid);
        orderTemplate.find('.order-quantity').text(quantity);
        orderTemplate.find('.order-panel-title').text('From: ' + orderFrom);

        // add this new order
        ordersRow.append(orderTemplate.html());
    },

};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
