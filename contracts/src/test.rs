#![cfg(test)]

// Re-export all contract tests — they're embedded in each module
mod counter_test {
    use soroban_sdk::testutils::Address as _;
    use crate::counter::{StellarDripzCounter, StellarDripzCounterClient};
    use soroban_sdk::{Env, Address, String};

    #[test]
    fn test_counter_increment() {
        let env = Env::default();
        let user = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(client.get_global(), 0);
        assert_eq!(client.increment(&user), 1);
        assert_eq!(client.get_global(), 1);
        assert_eq!(client.increment(&user), 2);
        assert_eq!(client.get_global(), 2);
    }

    #[test]
    fn test_greeting() {
        let env = Env::default();
        let user = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(
            client.get_greeting(),
            String::from_str(&env, "Hello from StellarDripz!")
        );

        let msg = String::from_str(&env, "Drip it!");
        client.set_greeting(&user, &msg);
        assert_eq!(client.get_greeting(), msg);
    }

    #[test]
    fn test_user_counter_independent() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(client.get_global(), 0);

        // Alice increments
        assert_eq!(client.increment(&alice), 1);
        assert_eq!(client.get_global(), 1);

        // Bob increments
        assert_eq!(client.increment(&bob), 2);
        assert_eq!(client.get_global(), 2);
    }
}

#[cfg(test)]
mod token_test {
    use soroban_sdk::testutils::Address as _;
    use crate::token::{DripToken, DripTokenClient};
    use soroban_sdk::{Env, Address, String};

    #[test]
    fn test_initialize_and_mint() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let recipient = Address::generate(&env);
        let contract_id = env.register(DripToken, ());
        let client = DripTokenClient::new(&env, &contract_id);

        client.initialize_token(
            &admin, &String::from_str(&env, "DripToken"), &String::from_str(&env, "DRIP"), &7u32,
        );

        assert_eq!(client.name(), String::from_str(&env, "DripToken"));
        assert_eq!(client.symbol(), String::from_str(&env, "DRIP"));
        assert_eq!(client.decimals(), 7);
        assert_eq!(client.total_supply(), 0);

        client.mint(&admin, &recipient, &1000i128);
        assert_eq!(client.balance(&recipient), 1000);
        assert_eq!(client.total_supply(), 1000);
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
        client.transfer(&alice, &bob, &300i128);

        assert_eq!(client.balance(&alice), 700);
        assert_eq!(client.balance(&bob), 300);
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
        client.approve(&owner, &spender, &500i128, &999999u32);

        client.transfer_from(&spender, &owner, &recipient, &200i128);
        assert_eq!(client.balance(&owner), 800);
        assert_eq!(client.balance(&recipient), 200);
        assert_eq!(client.allowance(&owner, &spender), 300);
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
        client.mint(&admin, &alice, &500i128);
        client.burn(&alice, &200i128);

        assert_eq!(client.balance(&alice), 300);
        assert_eq!(client.total_supply(), 300);
    }
}

