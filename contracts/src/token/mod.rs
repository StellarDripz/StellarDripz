use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, Env, String, Symbol, symbol_short};
use crate::common::storage as s;
use crate::common::events as e;
use crate::common::constants::ZERO_ADDRESS_STR;

// ---- Data Types ----

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

// ---- Contract Errors ----

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    InsufficientBalance = 3,
    InsufficientAllowance = 4,
    AllowanceExpired = 5,
    AmountNotPositive = 6,
    ExpirationInPast = 7,
}

// ---- Storage Keys ----

const KEY_ALLOWANCES: Symbol = symbol_short!("ALLOW_M");
const KEY_MINTER: Symbol = symbol_short!("MINTER");

#[contract]
pub struct DripToken;

// ---- Implementation ----

#[contractimpl]
impl DripToken {
    /// Initialize the token with name, symbol, and decimals.
    /// Can only be called once.
    pub fn initialize_token(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        if env.storage().persistent().has(&s::KEY_ADMIN) {
            panic!("Already initialized");
        }

        admin.require_auth();

        s::set_persistent(&env, &s::KEY_ADMIN, &admin);
        s::set_persistent(&env, &s::KEY_NAME, &name);
        s::set_persistent(&env, &s::KEY_SYMBOL, &symbol);
        s::set_persistent(&env, &s::KEY_DECIMALS, &decimals);
        s::set_persistent(&env, &s::KEY_TOTAL_SUPPLY, &0i128);

        e::publish(&env, (symbol_short!("init"), &admin), name);
    }

    /// Authorize or revoke a minter. Only the token admin can call this.
    /// Authorized minters (e.g., governance contract) can mint tokens on behalf
    /// of the admin.
    pub fn set_minter(env: Env, admin: Address, minter: Address, authorized: bool) {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR)),
        );
        if admin != stored_admin {
            panic!("Only admin");
        }
        admin.require_auth();

        if authorized {
            s::set_persistent(&env, &KEY_MINTER, &minter);
        } else {
            env.storage().persistent().remove(&KEY_MINTER);
        }

        let topic = Symbol::new(&env, "set_minter");
e::publish(&env, (topic, &admin, &minter), authorized);
    }

    /// Check if an address is authorized to mint.
    fn is_minter(env: &Env, addr: &Address) -> bool {
        let stored_minter: Option<Address> = env.storage().persistent().get(&KEY_MINTER);
        match stored_minter {
            Some(m) => m == *addr,
            None => false,
        }
    }

    /// Mint tokens to a recipient. Only admin or authorized minter.
    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR)),
        );
        let caller_is_admin = admin == stored_admin;
        let caller_is_minter = Self::is_minter(&env, &admin);

        if !caller_is_admin && !caller_is_minter {
            panic!("Only admin or authorized minter can mint");
        }
        admin.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let balance_key = (s::KEY_BALANCE, &to);
        let current: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        let new_balance = current.checked_add(amount).expect("Balance overflow");
        env.storage().persistent().set(&balance_key, &new_balance);

        let current_total: i128 = s::get_persistent(&env, &s::KEY_TOTAL_SUPPLY, 0i128);
        let new_total = current_total.checked_add(amount).expect("Total supply overflow");
        s::set_persistent(&env, &s::KEY_TOTAL_SUPPLY, &new_total);

        let zero = Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR));
        e::emit_transfer(&env, &zero, &to, amount);
    }

    /// Transfer tokens from caller to recipient. Uses checked arithmetic.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let from_key = (s::KEY_BALANCE, &from);
        let from_current: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_current < amount {
            panic!("Insufficient balance");
        }
        let new_from = from_current.checked_sub(amount).expect("Balance underflow");
        env.storage().persistent().set(&from_key, &new_from);

        let to_key = (s::KEY_BALANCE, &to);
        let to_current: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        let new_to = to_current.checked_add(amount).expect("Recipient balance overflow");
        env.storage().persistent().set(&to_key, &new_to);

        e::emit_transfer(&env, &from, &to, amount);
    }

    /// Transfer tokens using an allowance (spend on behalf of owner).
    /// Uses checked arithmetic throughout.
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let allowance_key = (KEY_ALLOWANCES, &from.clone(), &spender.clone());
        let allowance_val: AllowanceValue = env
            .storage()
            .persistent()
            .get(&allowance_key)
            .unwrap_or(AllowanceValue { amount: 0, expiration_ledger: 0 });

        let current_ledger = env.ledger().sequence();
        if allowance_val.expiration_ledger > 0 && current_ledger > allowance_val.expiration_ledger {
            env.storage().persistent().remove(&allowance_key);
            panic!("Allowance has expired");
        }

        if allowance_val.amount < amount {
            panic!("Insufficient allowance");
        }

        let new_allowance = allowance_val
            .amount
            .checked_sub(amount)
            .expect("Allowance underflow");
        if new_allowance == 0 {
            env.storage().persistent().remove(&allowance_key);
        } else {
            let updated = AllowanceValue {
                amount: new_allowance,
                expiration_ledger: allowance_val.expiration_ledger,
            };
            env.storage().persistent().set(&allowance_key, &updated);
        }

        let from_key = (s::KEY_BALANCE, &from);
        let from_current: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_current < amount {
            panic!("Insufficient balance");
        }
        let new_from = from_current.checked_sub(amount).expect("Balance underflow");
        env.storage().persistent().set(&from_key, &new_from);

        let to_key = (s::KEY_BALANCE, &to);
        let to_current: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        let new_to = to_current.checked_add(amount).expect("Recipient balance overflow");
        env.storage().persistent().set(&to_key, &new_to);

        e::emit_transfer(&env, &from, &to, amount);
    }

    /// Approve a spender to use tokens on behalf of the owner.
    /// The allowance expires after `expiration_ledger` (current ledger + desired duration).
    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        owner.require_auth();

        let current_ledger = env.ledger().sequence();
        if expiration_ledger <= current_ledger {
            panic!("Expiration ledger must be in the future");
        }

        let key = (KEY_ALLOWANCES, &owner, &spender);
        let allowance = AllowanceValue { amount, expiration_ledger };
        env.storage().persistent().set(&key, &allowance);

        e::publish(&env, (e::EVENT_APPROVE, &owner, &spender), amount);
    }

    /// Burn tokens from the caller's balance. Uses checked arithmetic.
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let key = (s::KEY_BALANCE, &from);
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current < amount {
            panic!("Insufficient balance");
        }
        let new_balance = current.checked_sub(amount).expect("Balance underflow");
        env.storage().persistent().set(&key, &new_balance);

        let total: i128 = s::get_persistent(&env, &s::KEY_TOTAL_SUPPLY, 0i128);
        let new_total = total.checked_sub(amount).expect("Total supply underflow");
        s::set_persistent(&env, &s::KEY_TOTAL_SUPPLY, &new_total);

        let zero = Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR));
        e::emit_transfer(&env, &from, &zero, amount);
    }

    // ---- Getters ----

    pub fn name(env: Env) -> String {
        s::get_persistent(&env, &s::KEY_NAME, String::from_str(&env, "DripToken"))
    }

    pub fn symbol(env: Env) -> String {
        s::get_persistent(&env, &s::KEY_SYMBOL, String::from_str(&env, "DRIP"))
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().persistent().get(&s::KEY_DECIMALS).unwrap_or(7)
    }

    pub fn balance(env: Env, owner: Address) -> i128 {
        let key = (s::KEY_BALANCE, &owner);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        s::get_persistent(&env, &s::KEY_TOTAL_SUPPLY, 0i128)
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        let key = (KEY_ALLOWANCES, &owner, &spender);
        let val: AllowanceValue = env.storage().persistent().get(&key).unwrap_or(AllowanceValue { amount: 0, expiration_ledger: 0 });
        // Return 0 if expired
        let current_ledger = env.ledger().sequence();
        if val.expiration_ledger > 0 && current_ledger > val.expiration_ledger {
            env.storage().persistent().remove(&key);
            return 0;
        }
        val.amount
    }

    pub fn admin(env: Env) -> Address {
        s::get_persistent(&env, &s::KEY_ADMIN, Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR)))
    }

    pub fn metadata(env: Env) -> TokenMetadata {
        TokenMetadata {
            name: Self::name(env.clone()),
            symbol: Self::symbol(env.clone()),
            decimals: Self::decimals(env),
        }
    }

    pub fn get_minter(env: Env) -> Option<Address> {
        env.storage().persistent().get(&KEY_MINTER)
    }
}

#[cfg(test)]
#[allow(unused_imports)]
mod token_test {
    use soroban_sdk::testutils::Address as _;
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initialize_and_mint() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let recipient = Address::generate(&env);
        let contract_id = env.register(DripToken, ());

        let client = DripTokenClient::new(&env, &contract_id);

        // Initialize
        client.initialize_token(
            &admin,
            &String::from_str(&env, "DripToken"),
            &String::from_str(&env, "DRIP"),
            &7u32,
        );

        assert_eq!(client.name(), String::from_str(&env, "DripToken"));
        assert_eq!(client.symbol(), String::from_str(&env, "DRIP"));
        assert_eq!(client.decimals(), 7u32);
        assert_eq!(client.total_supply(), 0i128);

        // Mint
        client.mint(&admin, &recipient, &1000i128);
        assert_eq!(client.balance(&recipient), 1000i128);
        assert_eq!(client.total_supply(), 1000i128);
    }

    #[test]
    fn test_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let contract_id = env.register(DripToken, ());

        let client = DripTokenClient::new(&env, &contract_id);
        client.initialize_token(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        client.mint(&admin, &alice, &1000i128);

        // Transfer
        client.transfer(&alice, &bob, &300i128);
        assert_eq!(client.balance(&alice), 700i128);
        assert_eq!(client.balance(&bob), 300i128);
        assert_eq!(client.total_supply(), 1000i128);
    }

    #[test]
    fn test_approve_and_transfer_from() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let contract_id = env.register(DripToken, ());

        let client = DripTokenClient::new(&env, &contract_id);
        client.initialize_token(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        client.mint(&admin, &owner, &1000i128);
        let exp_ledger = env.ledger().sequence() + 9999u32;
        client.approve(&owner, &spender, &500i128, &exp_ledger);

        // Transfer from
        client.transfer_from(&spender, &owner, &recipient, &200i128);
        assert_eq!(client.balance(&owner), 800i128);
        assert_eq!(client.balance(&recipient), 200i128);
        assert_eq!(client.allowance(&owner, &spender), 300i128);
    }

    #[test]
    fn test_burn() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let contract_id = env.register(DripToken, ());

        let client = DripTokenClient::new(&env, &contract_id);
        client.initialize_token(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        client.mint(&admin, &alice, &1000i128);

        client.burn(&alice, &400i128);
        assert_eq!(client.balance(&alice), 600i128);
        assert_eq!(client.total_supply(), 600i128);
    }

    /// Test that an authorized minter (e.g., governance) can mint tokens.
    #[test]
    fn test_set_minter_and_mint() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let minter = Address::generate(&env);
        let recipient = Address::generate(&env);
        let contract_id = env.register(DripToken, ());

        let client = DripTokenClient::new(&env, &contract_id);
        client.initialize_token(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);

        // Authorize minter
        client.set_minter(&admin, &minter, &true);
        assert!(client.get_minter().is_some());

        // Minter can now mint
        client.mint(&minter, &recipient, &500i128);
        assert_eq!(client.balance(&recipient), 500i128);
        assert_eq!(client.total_supply(), 500i128);

        // Revoke minter
        client.set_minter(&admin, &minter, &false);
        assert!(client.get_minter().is_none());
    }
}

