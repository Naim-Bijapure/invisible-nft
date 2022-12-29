pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// import "samplenft.sol";

interface NFT {
    function balanceOf(address owner) external view returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ShadowNFT is Ownable {
    using Strings for uint256;

    // The token that is used to create the shadow token
    NFT public caster;

    // Token name
    string public name;

    // Token symbol
    string public symbol;

    // Base URI
    string public baseURI;

    // Suffix
    string public suffix;

    // Description
    string public description;

    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event AttributesChanged(string tokenPrefix, string tokenSuffix);

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenPrefix,
        string memory tokenSuffix,
        string memory tokenDescription
    ) {
        // ENS Registrar on main and goerli: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85
        caster = NFT(address(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85));
        name = tokenName;
        symbol = tokenSymbol;
        description = tokenDescription;
        editAttributes(tokenPrefix, tokenSuffix);
    }

    /*
    @dev Allows Function Owner to edit the prefix, suffix, name, etc
    @notice Allows owner to edit the attributes
    */
    function editAttributes(
        string memory tokenPrefix,
        string memory tokenSuffix
    ) public onlyOwner {
        baseURI = string(tokenPrefix);
        suffix = string(tokenSuffix);

        emit AttributesChanged(tokenPrefix, tokenSuffix);
    }

    // TokenURI: the important bit. Change this to your own data.
    /*
    @dev See {IERC721-balanceOf}.
    @notice If the token exists on the shadowcaster side, 
    it will show here as its own metadata. If not then it will revert
    */
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return
            string(
                abi.encodePacked(
                    'data:application/json;charset=utf-8,{"name":"',
                    name,
                    '","description":"',
                    description,
                    '","image":"',
                    baseURI,
                    tokenId.toString(),
                    suffix,
                    '"}'
                )
            );
    }

    /*
    @dev See {IERC721-balanceOf}.
    @notice Rflect the Balance of the shadowcaster token
    */
    function balanceOf(address owner) public view returns (uint256) {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        uint256 casterBalance = caster.balanceOf(owner);
        return casterBalance;
    }

    /*
    @dev See {IERC721-ownerOf}.
    @notice Reflect the Owner of the shadowcaster token
    */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner;

        owner = caster.ownerOf(tokenId);
        require(owner != address(0), "ERC721: invalid token ID");

        return owner;
    }

    /*
    @notice emit a Transfer event where from == to so that indexers can scan the token.
	This can be called by anyone at any time and does not change state.
	@param tokenID token to emit the event for.
    */
    function emitSelfTransferEvent(uint256 tokenId) public virtual {
        // Requires that the token actually exists
        require(ownerOf(tokenId) != address(0), "Token does not exist");

        address tokenOwner = ownerOf(tokenId);
        emit Transfer(tokenOwner, tokenOwner, tokenId);
    }
}
