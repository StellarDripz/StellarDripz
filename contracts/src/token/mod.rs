use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, symbol_short};
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

// ---- Storage Keys ----

const KEY_ALLOWANCES: Symbol = symbol_short!("ALLOW_M");

#[contract]
pub struct DripToken;

// ---- Implementation ----

#[contractimpl]
impl DripToken {
    /// Initialize the token with name, symbol, and decimals.
    /// Can only be called once.
    /// Initialize the token with name, symbol, and decimals.
    /// Can only be called once.
    pub fn initialize_token(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        // Ensure not already initialized
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

    /// Mint tokens to a recipient. Only admin.
    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) {
        let stored_admin: Address = s::get_persistent(&env, &s::KEY_ADMIN, Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR)));
        if admin != stored_admin {
            panic!("Only admin can mint");
        }
        admin.require_auth();

        // Update recipient balance
        let balance_key = (s::KEY_BALANCE, &to);
        let mut balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&balance_key, &balance);

        // Update total supply
        let mut total: i128 = s::get_persistent(&env, &s::KEY_TOTAL_SUPPLY, 0i128);
        total += amount;
        s::set_persistent(&env, &s::KEY_TOTAL_SUPPLY, &total);

        let zero = Address::from_string(&String::from_str(&env, ZERO_ADDRESS_STR));
        e::emit_transfer(&env, &zero, &to, amount);
    }

    /// Transfer tokens from caller to recipient.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let from_key = (s::KEY_BALANCE, &from);
        let mut from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            panic!("Insufficient balance");
        }
        from_balance -= amount;
        env.storage().persistent().set(&from_key, &from_balance);

        let to_key = (s::KEY_BALANCE, &to);
        let mut to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        to_balance += amount;
        env.storage().persistent().set(&to_key, &to_balance);

        e::emit_transfer(&env, &from, &to, amount);
    }

    /// Transfer tokens using an allowance (spend on behalf of owner).
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Check and consume allowance (with expiration enforcement)
        let allowance_key = (KEY_ALLOWANCES, &from.clone(), &spender.clone());
        let allowance_val: AllowanceValue = env.storage().persistent().get(&allowance_key).unwrap_or(AllowanceValue { amount: 0, expiration_ledger: 0 });

        // Enforce expiration
        let current_ledger = env.ledger().sequence();
        if allowance_val.expiration_ledger > 0 && current_ledger > allowance_val.expiration_ledger {
            env.storage().persistent().remove(&allowance_key);
            panic!("Allowance has expired");
        }

        if allowance_val.amount < amount {
            panic!("Insufficient allowance");
        }

        let new_allowance = allowance_val.amount - amount;
        if new_allowance == 0 {
            env.storage().persistent().remove(&allowance_key);
        } else {
            let updated = AllowanceValue { amount: new_allowance, expiration_ledger: allowance_val.expiration_ledger };
            env.storage().persistent().set(&allowance_key, &updated);
        }

        // Transfer balances
        let from_key = (s::KEY_BALANCE, &from);
        let mut from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("Insufficient balance");
        }
        from_balance -= amount;
        env.storage().persistent().set(&from_key, &from_balance);

        let to_key = (s::KEY_BALANCE, &to);
        let mut to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        to_balance += amount;
        env.storage().persistent().set(&to_key, &to_balance);

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

    /// Burn tokens from the caller's balance.
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let key = (s::KEY_BALANCE, &from);
        let mut balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if balance < amount {
            panic!("Insufficient balance");
        }
        balance -= amount;
        env.storage().persistent().set(&key, &balance);

        let mut total: i128 = s::get_persistent(&env, &s::KEY_TOTAL_SUPPLY, 0i128);
        total -= amount;
        s::set_persistent(&env, &s::KEY_TOTAL_SUPPLY, &total);

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
}

