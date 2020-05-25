pragma solidity >0.4.99 <0.7.0;

import "./Ownable.sol";

contract MyShop is Ownable {
    //data types
    struct Item {
        uint itemID;
        address payable seller;
        address buyer;
        string itemName;
        string description;
        uint inventory;
        uint price;
    }
    struct Buyer {
        string name;
        string email;
        string shipAddress;
    }
    struct Order {
        uint orderID;
        uint itemID;
        uint quantity;
        address from;
    }

    //state variables
    uint buyerID;
    mapping (uint => Buyer) public buyers;
    uint public numBuyers;
    string name;
    string email;
    string shipAddress;

    mapping (uint => Item) public items;
    uint public numItems;
    address seller;
    address buyer;
    uint itemID;
    string itemName;
    string description;
    uint inventory;
    uint price;

    mapping (uint => Order) public orders;
    uint public numOrders;
    uint orderID;
    uint quantity;
    address from;

    //events
    event NewItem(
        uint _itemID,
        string _itemName,
        string _description,
        uint _inventory,
        uint _price
    );
    event NewBuyer(
        string _name,
        string _email,
        string _shipAddress
    );
    event NewOrder(
        uint _orderID,
        uint itemID,
        uint _quantity,
        address _from
    );

    //functions
    //by owner only
    function sellItem(string  memory _itemName, string memory _description, uint _inventory, uint _price) public onlyOwner pausable{
        //storing the new item and incrementing the itemss count
        items[++numItems] = Item(
            ++itemID,
            msg.sender,
            address(0),
            _itemName,
            _description,
            _inventory,
            _price
        );

        //triggering the looging event
        emit NewItem(itemID,_itemName,_description,_inventory,_price);
    }

    function registerBuyer(string memory _name, string memory _email, string memory _shipAddress) public pausable {
    	buyers[++numBuyers] = Buyer(
            _name,
            _email,
            _shipAddress
        );

        buyerID = numBuyers;

    	emit NewBuyer(_name,_email,_shipAddress);
    }

    // Buying an item
    function buyItem(uint _id, uint _quantity) public payable pausable {
        require(buyerID != 0, "An account must be registered first");

        require(numItems > 0, "There should be at least one item");

        require(_id > 0 && _id <= numItems, "Item does not exist");

        Item storage item = items[_id];

        require(item.inventory > 0, "The inventory must be bigger than zero");

        require((item.inventory - _quantity) >= 0, "Quantity unavailable");

        require(msg.sender != owner, "You are the seller");

        require((item.price * _quantity) == msg.value, "Invalid price provided");

        require(item.inventory > 0, "Out of stock");

        item.inventory = item.inventory - _quantity;

		orders[++numOrders] = Order(
            ++orderID,
            _id,
            _quantity,
            msg.sender
        );

        if (msg.value > item.price * _quantity){
            msg.sender.transfer(msg.value - (item.price * _quantity));
        }

    	emit NewOrder(orderID,_id,_quantity,msg.sender);
    }

    // NOT SURE ABOUT THIS FUNCTION
    function updateItem(
        uint _itemID,
        string memory _itemName,
        string memory _description,
        uint _inventory,
        uint _price
        )
    public payable onlyOwner pausable {

        //checking if there is any item makes debugging easier
        require (numItems > 0, "There must be at least one item");
        //checking if the item id does exist
        require(_itemID > 0 && _itemID <= numItems, "item with this id does not exist");

        //retrieving the item with the given item id
        Item storage item = items[_itemID];

        //updating the item
        item.itemName = _itemName;
        item.description = _description;
        item.inventory = _inventory;
        item.price = _price;
    }

    function getItemsForSale() public view returns (uint[]memory) {
        if(numItems == 0) {
            return new uint[](0);
        }

        uint[] memory itemIds = new uint[](numItems);

        uint numberOfItemsForSale = 0;
        for (uint i = 1; i <= numItems; i++) {
            if (items[i].buyer == address(0) && items[i].inventory > 0) {
                itemIds[numberOfItemsForSale] = items[i].itemID;
                numberOfItemsForSale++;
            }
        }

        uint[] memory forSale = new uint[](numberOfItemsForSale);
        for (uint j = 0; j < numberOfItemsForSale; j++) {
            forSale[j] = itemIds[j];
        }
        return forSale;
    }
    
    function getOrders() public view returns (uint[]memory) {
        if(numOrders == 0) {
            return new uint[](0);
        }

        uint[] memory OrderIds = new uint[](numOrders);

        uint numberOfOrders = 0;
        for (uint i = 1; i <= numOrders; i++) {
            OrderIds[numberOfOrders] = orders[i].orderID;
            numberOfOrders++;
        }

        uint[] memory newOrders = new uint[](numberOfOrders);
        for (uint j = 0; j < numberOfOrders; j++) {
            newOrders[j] = OrderIds[j];
        }
        return newOrders;
    }

    function withdrawFunds(address payable _to) public onlyOwner pausable {
    	require(address(this).balance > 0, "Funds must be greater than zero");
        _to.transfer(address(this).balance);
    }

    function setPaused(bool _paused) public {
       paused = _paused;
    }

    function destroyContract(address payable _to) public payable onlyOwner {
        selfdestruct(_to);
    }
}
