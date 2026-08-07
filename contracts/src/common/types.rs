// Shared types used across multiple contracts.
// Per-contract types remain in their respective modules for clarity.

use soroban_sdk::{Address, String};

/// Represents the admin role — used across all contracts for authorization.
pub type AdminAddress = Address;

/// Contract deployment metadata for on-chain discovery.
#[derive(Clone)]
pub struct ContractMetadata {
    pub name: String,
    pub version: String,
    pub admin: Address,
}
