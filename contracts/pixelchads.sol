pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PixelChads is ERC721 {
    constructor() ERC721("PixelChads", "CHAD") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}