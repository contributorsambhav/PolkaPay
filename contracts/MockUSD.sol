// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSD
 * @notice A mock ERC-20 stablecoin for testing PolkaPay on Polkadot Hub Testnet.
 *         Pegged 1:1 to USD semantics (6 decimals, like USDC/USDT).
 *
 * @dev Deployed on: Polkadot Hub Testnet (Paseo) – Chain ID 420420417
 *      RPC: https://eth-rpc-testnet.polkadot.io/
 *
 * Features:
 *  - 6 decimals  (same as real USDC / USDT)
 *  - 1,000,000 MUSD pre-minted to the deployer (admin) on construction
 *  - Owner can mint additional tokens to any address
 *  - Anyone can call faucet() to receive 1,000 MUSD (for demo / testing)
 */
contract MockUSD is ERC20, Ownable {
    // 6 decimals to match major stablecoins (USDC, USDT)
    uint8 private constant _DECIMALS = 6;

    // 1,000 MUSD per faucet call
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 6;

    // Faucet cooldown: 24 hours per address
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) public lastFaucetTime;

    event Minted(address indexed to, uint256 amount);
    event FaucetUsed(address indexed user, uint256 amount);

    /**
     * @param initialAdmin  The address that receives the initial 1,000,000 MUSD supply
     *                      and becomes the contract owner. Pass the deployer wallet address.
     */
    constructor(address initialAdmin)
        ERC20("Mock USD", "MUSD")
        Ownable(initialAdmin)
    {
        // Mint 1,000,000 MUSD (with 6 decimals) to the admin wallet
        uint256 initialSupply = 1_000_000 * 10 ** _DECIMALS;
        _mint(initialAdmin, initialSupply);
        emit Minted(initialAdmin, initialSupply);
    }

    // -------------------------------------------------------------------------
    // Override decimals to return 6 instead of the ERC20 default of 18
    // -------------------------------------------------------------------------
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    // -------------------------------------------------------------------------
    // Admin mint — owner can mint any amount to any address
    // -------------------------------------------------------------------------
    /**
     * @notice Mint `amount` MUSD (in smallest units, i.e. 1 MUSD = 1_000_000 units) to `to`.
     * @dev Only callable by the owner / admin.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MockUSD: mint to zero address");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    // -------------------------------------------------------------------------
    // Public faucet — anyone can request 1,000 MUSD once per 24 hours
    // -------------------------------------------------------------------------
    /**
     * @notice Request 1,000 MUSD from the faucet. Limited to once per 24 hours per address.
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "MockUSD: faucet cooldown not elapsed (24h)"
        );
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT);
    }

    // -------------------------------------------------------------------------
    // Convenience view helpers
    // -------------------------------------------------------------------------
    /**
     * @notice Returns the balance of `account` in human-readable MUSD (as a scaled uint).
     *         For display purposes: divide the result by 1e6 to get whole MUSD.
     */
    function balanceOfHuman(address account) external view returns (uint256 wholeUnits, uint256 rawUnits) {
        rawUnits = balanceOf(account);
        wholeUnits = rawUnits / 10 ** _DECIMALS;
    }

    /**
     * @notice Returns how many seconds until `account` can use the faucet again.
     *         Returns 0 if the faucet is available now.
     */
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 nextAllowed = lastFaucetTime[account] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }
}
