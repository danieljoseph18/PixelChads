// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @custom:security-contact contact@altify.io
contract PixelChads is ERC721, ERC721Enumerable, IERC2981, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    event tokenMinted(address indexed to, uint256 indexed tokenId);
    event tokenUpdated(uint256 indexed tokenId);

    uint256 public immutable maxSupply = 500;
    uint256 public collectionRoyaltyAmount = 100; // 10%
    ///Make Variables Private in Production
    string public contractURI;
    string public baseURI;
    
    address public paymentReceiver;
    mapping(uint256 => bool) tokenHasUpdated;
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _contractURI, string memory _startingBaseURI) ERC721("PixelChads", "CHAD") {
        //Contract URI links to JSON file containing information about the contract (royalties etc.)
        contractURI = _contractURI;
        paymentReceiver = msg.sender;
        baseURI = _startingBaseURI;
    }

    receive() external payable {}

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function safeMint() public {
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        uint256 tokenId = _tokenIdCounter.current();
        string memory uri = string(abi.encodePacked(tokenId.toString(), ".json"));
        _tokenIdCounter.increment();
        emit tokenMinted(msg.sender, tokenId);
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function updateTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(tokenHasUpdated[tokenId] == false, "Token URI already updated");
        tokenHasUpdated[tokenId] = true;
        emit tokenUpdated(tokenId);

        delete _tokenURIs[tokenId];
        
        
        _setTokenURI(tokenId, uri);
    }

    function updatePaymentReceiver(address _paymentReceiver) public onlyOwner {
        paymentReceiver =  _paymentReceiver;
    }

    function updateContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(paymentReceiver).transfer(balance);
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }


    //--------------------------------------------- ERC721 URI Storage Function Overrides --------------------------------------------
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(_tokenURI);
        }

        return super.tokenURI(tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    //--------------------------------------------------------------------------------------------------------------------

    /// IERC2981 Royalty Enforcement
    function royaltyInfo(uint256 , uint256 salePrice)
    external
    view
    returns (address receiver, uint256 royaltyAmount)
    {
        // calculate the amount of royalties
        uint256 _royaltyAmount = (salePrice * collectionRoyaltyAmount) / 1000; // 10%
        // return the amount of royalties and the recipient collection address
        return (paymentReceiver, _royaltyAmount);
    }

}